from flask import Blueprint, jsonify, request, current_app
import numpy as np
from core.ranking import is_meta_page, calculate_multisignal_score
from services.graph_calculations import normalize_node_id

comparison_bp = Blueprint('comparison', __name__)

@comparison_bp.route('/compare', methods=['POST'])
def compare_graphs():
    data = request.json
    graphs = data.get('graphs', [])
    
    if not graphs or len(graphs) > 12:
        return jsonify({"error": "Provide 1-12 graphs"}), 400
    
    results = []
    for graph_spec in graphs:
        article = graph_spec.get('article')
        max_expansions = graph_spec.get('expansions', 1)
        
        if not article:
            continue
            
        stats = simulate_graph_exploration(article, max_expansions)
        results.append({
            "root_article": article,
            "expansions_requested": max_expansions,
            **stats
        })
    
    return jsonify({
        "graphs": results,
        "comparison": generate_comparison_metrics(results)
    })


def simulate_graph_exploration(root_article: str, max_expansions: int):
    search_engine = current_app.search_engine
    cursor = search_engine.metadata_db.cursor()
    
    nodes = {}
    edges = set()
    to_expand = [(root_article, 0, 0)]
    expanded = set()
    
    def get_related_articles(title: str, existing_labels: list, k: int = 7):
        try:
            query = title.replace('_', ' ')
            embedding = search_engine.model.encode(
                [query],
                normalize_embeddings=True,
                convert_to_numpy=True
            ).astype(np.float32)
            
            search_size = min(200, search_engine.config.CANDIDATE_POOL_SIZE)
            distances, indices = search_engine.index.search(embedding, search_size)
            
            candidate_ids = []
            semantic_scores = {}
            
            for i, idx in enumerate(indices[0]):
                idx_int = int(idx)
                if idx_int >= 0:
                    candidate_ids.append(idx_int)
                    semantic_scores[idx_int] = float(distances[0][i])
            
            if not candidate_ids:
                return []
            
            placeholders = ','.join('?' * len(candidate_ids))
            query_columns = ['article_id', 'title', 'pagerank', 'pageviews']
            query_sql = f"SELECT {', '.join(query_columns)} FROM articles WHERE article_id IN ({placeholders})"
            cursor.execute(query_sql, candidate_ids)
            
            results = []
            existing_normalized = [l.lower().replace(' ', '_') for l in existing_labels]
            
            for row in cursor.fetchall():
                data = dict(row)
                
                if is_meta_page(data['title']):
                    continue
                
                normalized_title = data['title'].replace(' ', '_').lower()
                if normalized_title in existing_normalized:
                    continue
                
                cand_id = data['article_id']
                semantic_score = semantic_scores.get(cand_id, 0.0)
                
                final_score = calculate_multisignal_score(
                    semantic_similarity=semantic_score,
                    pagerank_score=data.get('pagerank', 0),
                    pageview_count=data.get('pageviews', 0),
                    title=data['title'],
                    query=title
                )
                
                results.append({
                    'title': data['title'],
                    'score': final_score
                })
            
            results.sort(key=lambda x: x['score'], reverse=True)
            return results[:k]
            
        except Exception as e:
            print(f"Error fetching related for '{title}': {e}")
            return []
    
    while to_expand:
        current_title, depth, exp_count = to_expand.pop(0)
        node_id = normalize_node_id(current_title)
        
        if node_id in expanded:
            continue
        
        if node_id not in nodes:
            nodes[node_id] = {
                "title": current_title,
                "depth": depth,
                "outgoing": 0,
                "incoming": 0,
                "expansion_count": 0,
            }
        
        nodes[node_id]["expansion_count"] += 1
        existing_labels = [n["title"] for n in nodes.values()]
        related = get_related_articles(current_title, existing_labels, k=7)
        
        for rel in related:
            child_title = rel['title']
            child_id = normalize_node_id(child_title)
            
            edge = (node_id, child_id)
            if edge not in edges:
                edges.add(edge)
                nodes[node_id]["outgoing"] += 1
                
                if child_id not in nodes:
                    nodes[child_id] = {
                        "title": child_title,
                        "depth": depth + 1,
                        "outgoing": 0,
                        "incoming": 0,
                        "expansion_count": 0,
                    }
                
                nodes[child_id]["incoming"] += 1
                
                if (exp_count < max_expansions and 
                    child_id not in expanded and
                    depth + 1 <= max_expansions):
                    to_expand.append((child_title, depth + 1, exp_count + 1))
        
        expanded.add(node_id)
    
    for node_id, node_data in nodes.items():
        neighbor_conn = 0
        for edge in edges:
            if edge[0] == node_id:
                neighbor_id = edge[1]
                if neighbor_id in nodes:
                    neighbor_conn += nodes[neighbor_id]["outgoing"] + nodes[neighbor_id]["incoming"]
            elif edge[1] == node_id:
                neighbor_id = edge[0]
                if neighbor_id in nodes:
                    neighbor_conn += nodes[neighbor_id]["outgoing"] + nodes[neighbor_id]["incoming"]
        node_data["neighbor_connectivity"] = neighbor_conn
    
    ranked_nodes = [
        {
            "rank": idx + 1,
            "article": data["title"],
            "depth": data["depth"],
            "total_edges": data["outgoing"] + data["incoming"],
            "outgoing": data["outgoing"],
            "incoming": data["incoming"],
            "neighbor_connectivity": data["neighbor_connectivity"],
            "expansions": data["expansion_count"],
        }
        for idx, (node_id, data) in enumerate(
            sorted(nodes.items(), key=lambda x: x[1]["outgoing"] + x[1]["incoming"], reverse=True)
        )
    ]
    
    total_nodes = len(nodes)
    total_edges = len(edges)
    avg_edges = (total_edges * 2) / total_nodes if total_nodes > 0 else 0
    max_depth = max([n["depth"] for n in nodes.values()]) if nodes else 0
    
    return {
        "total_nodes": total_nodes,
        "total_edges": total_edges,
        "avg_edges_per_node": round(avg_edges, 1),
        "max_depth": max_depth,
        "nodes": ranked_nodes,
    }


def generate_comparison_metrics(results):
    if len(results) < 2:
        return {}
    
    all_articles = [set(n["article"] for n in r["nodes"]) for r in results]
    common = set.intersection(*all_articles) if all_articles else set()
    
    densities = [
        r["total_edges"] / r["total_nodes"] if r["total_nodes"] > 0 else 0
        for r in results
    ]
    
    return {
        "common_articles": list(common),
        "common_count": len(common),
        "density_comparison": {
            "min": round(min(densities), 2),
            "max": round(max(densities), 2),
            "avg": round(sum(densities) / len(densities), 2),
        },
        "node_count_range": {
            "min": min(r["total_nodes"] for r in results),
            "max": max(r["total_nodes"] for r in results),
        },
    }