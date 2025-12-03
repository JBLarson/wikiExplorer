from flask import Blueprint, jsonify, request, current_app
import networkx as nx
import numpy as np
import requests
from core.ranking import (
    calculate_multisignal_score, 
    normalize_pagerank,
    normalize_pageviews,
    is_meta_page
)
from core.cross_edges import calculate_cross_edges

cluster_bp = Blueprint('cluster', __name__)

def normalize_key(title):
    """Standardizes titles for ID lookup (case/underscore insensitive)"""
    if not title: return ""
    return title.replace('_', ' ').lower().strip()

def resolve_wikipedia_title(query):
    """
    PORTED FROM frontend/src/lib/wikipedia.ts
    Resolves redirects (e.g., '5-HT2' -> '5-HT2 receptor') via Wikipedia API
    so the vector search runs on the canonical title.
    """
    try:
        # Wikipedia API requires underscores for spaces in the URL path
        encoded_query = query.strip().replace(' ', '_')
        url = f"https://en.wikipedia.org/api/rest_v1/page/summary/{encoded_query}"
        
        # User-Agent is often required by Wiki API to avoid blocking
        headers = {'User-Agent': 'wikiExplorer-Test/1.0'}
        
        response = requests.get(url, headers=headers, timeout=3)
        if response.status_code == 200:
            data = response.json()
            if 'title' in data:
                return data['title']
    except Exception as e:
        print(f"  [Warning] Wiki resolution failed: {e}")
    
    return query

@cluster_bp.route('/cluster/search_step', methods=['POST'])
def test_search_step():
    search_engine = current_app.search_engine
    data = request.json
    raw_query = data.get('query', '')
    
    if not raw_query:
        return jsonify({'error': 'No query provided'}), 400

    print(f"\n--- Running Weighted Search Test for: '{raw_query}' ---")

    # ---------------------------------------------------------
    # 1. CLIENT SIMULATION: Canonicalize Title
    # ---------------------------------------------------------
    # This step replicates the frontend's fetchArticleSummary() call
    query = resolve_wikipedia_title(raw_query)
    
    if query != raw_query:
        print(f"  -> Resolved '{raw_query}' to canonical: '{query}'")
    else:
        print(f"  -> Using raw query: '{query}'")

    # ---------------------------------------------------------
    # 2. Resolve Root Node (DB Lookup)
    # ---------------------------------------------------------
    cursor = search_engine.metadata_db.cursor()
    root_id = -1
    root_title = query
    exclude_id = None

    lookup_strategies = [
        ("SELECT article_id, title FROM articles WHERE title = ?", (query,)),
        ("SELECT article_id, title FROM articles WHERE title = ?", (query.replace('_', ' '),)),
        ("SELECT article_id, title FROM articles WHERE lookup_title = ?", (query.lower(),)),
    ]
    
    for sql, params in lookup_strategies:
        cursor.execute(sql, params)
        row = cursor.fetchone()
        if row:
            root_id = int(row['article_id'])
            root_title = row['title']
            exclude_id = root_id
            break
            
    if root_id == -1:
        # Fallback: if exact title isn't in our DB (but exists in Wiki),
        # use the vector of the CANONICAL title to find the closest match in our DB.
        try:
            emb = search_engine.model.encode([query], normalize_embeddings=True)
            D, I = search_engine.index.search(emb.astype(np.float32), 1)
            root_id = int(I[0][0])
            cursor.execute("SELECT title FROM articles WHERE article_id = ?", (root_id,))
            res = cursor.fetchone()
            if res:
                root_title = res[0]
                exclude_id = root_id # Exclude the closest match from results
        except Exception as e:
            print(f"Root resolution fallback failed: {e}")

    # ---------------------------------------------------------
    # 3. Vector Search
    # ---------------------------------------------------------
    try:
        # Use the CANONICAL title for embedding
        search_text = query.replace('_', ' ')
        embedding = search_engine.model.encode(
            [search_text], 
            normalize_embeddings=True, 
            convert_to_numpy=True
        ).astype(np.float32)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    search_size = search_engine.config.CANDIDATE_POOL_SIZE + 1
    distances, indices = search_engine.index.search(embedding, search_size)
    
    candidate_ids = []
    semantic_scores = {}
    
    for i, idx in enumerate(indices[0]):
        idx_int = int(idx)
        if idx_int >= 0 and idx_int != exclude_id:
            candidate_ids.append(idx_int)
            semantic_scores[idx_int] = float(distances[0][i])

    # ---------------------------------------------------------
    # 4. Fetch Metadata & Apply Weights
    # ---------------------------------------------------------
    if not candidate_ids:
        return jsonify({'stats': [], 'debug_scores': []})

    placeholders = ','.join('?' * len(candidate_ids))
    query_columns = ['article_id', 'title']
    if search_engine.available_signals['pagerank']:
        query_columns.append('pagerank')
    if search_engine.available_signals['pageviews']:
        query_columns.append('pageviews')
        
    sql = f"SELECT {', '.join(query_columns)} FROM articles WHERE article_id IN ({placeholders})"
    cursor.execute(sql, candidate_ids)
    
    results = []
    data_map = {row['article_id']: row for row in cursor.fetchall()}
    
    for cand_id in candidate_ids:
        row = data_map.get(cand_id)
        if not row or is_meta_page(row['title']):
            continue
            
        semantic_score = semantic_scores.get(cand_id, 0.0)
        
        pagerank = row['pagerank'] if search_engine.available_signals['pagerank'] and 'pagerank' in row.keys() else 0
        pageviews = row['pageviews'] if search_engine.available_signals['pageviews'] and 'pageviews' in row.keys() else 0
        
        # Calculate Weighted Score using Canonical Title
        final_score = calculate_multisignal_score(
            semantic_similarity=semantic_score,
            pagerank_score=pagerank,
            pageview_count=pageviews,
            title=row['title'],
            query=query 
        )
        
        results.append({
            "id": cand_id,
            "title": row['title'],
            "final_score": final_score,
            "debug": {
                'sem': semantic_score,
                'pr': pagerank, 
                'pv': pageviews
            }
        })

    # ---------------------------------------------------------
    # 5. Sort and Graph Construction
    # ---------------------------------------------------------
    results.sort(key=lambda x: x['final_score'], reverse=True)
    top_28 = results[:28]

    G = nx.DiGraph()
    G.add_node(root_id, label=root_title, depth=0)
    
    title_to_id = {}
    title_to_id[normalize_key(root_title)] = root_id
    
    child_ids = []
    for res in top_28:
        child_ids.append(res['id'])
        G.add_node(res['id'], label=res['title'], depth=1)
        G.add_edge(root_id, res['id'], weight=res['final_score'])
        title_to_id[normalize_key(res['title'])] = res['id']

    # ---------------------------------------------------------
    # 6. Cross Edge Calculation (Connectivity)
    # ---------------------------------------------------------
    if search_engine.can_reconstruct and top_28:
        context_ids = [root_id] if root_id != -1 else []
        all_ids_to_check = child_ids + context_ids
        
        cross_edges = calculate_cross_edges(search_engine, child_ids, all_ids_to_check)
        
        for edge in cross_edges:
            src_key = normalize_key(edge['source'])
            tgt_key = normalize_key(edge['target'])
            
            if src_key in title_to_id and tgt_key in title_to_id:
                u = title_to_id[src_key]
                v = title_to_id[tgt_key]
                
                if not G.has_edge(u, v):
                    G.add_edge(u, v, weight=edge['score'])

    # ---------------------------------------------------------
    # 7. Generate Stats
    # ---------------------------------------------------------
    stats = []
    for nid in G.nodes():
        node_title = G.nodes[nid]['label']
        node_depth = G.nodes[nid]['depth']
        in_deg = G.in_degree(nid)
        out_deg = G.out_degree(nid)
        conn = sum(G.degree(n) for n in G.neighbors(nid))
        
        stats.append({
            'ARTICLE': node_title,
            'DEPTH': node_depth,
            'TOTAL EDGES': in_deg + out_deg,
            'OUTGOING': out_deg,
            'INCOMING': in_deg,
            'NEIGHBOR CONN': conn,
            'EXPANSIONS': 1 if nid == root_id else 0
        })

    stats.sort(key=lambda x: x['TOTAL EDGES'], reverse=True)

    return jsonify({
        'stats': stats,
        'debug_scores': top_28
    })