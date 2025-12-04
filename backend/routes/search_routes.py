from flask import Blueprint, jsonify, request, current_app
import numpy as np
from datetime import datetime

from core.ranking import (
    calculate_multisignal_score, 
    normalize_pagerank,
    normalize_pageviews,
    calculate_title_match_score,
    is_meta_page
)
from core.cross_edges import calculate_cross_edges
from models import db, PublicSearch
from sqlalchemy.exc import IntegrityError


search_bp = Blueprint('search', __name__)

@search_bp.route('/related', methods=['POST'])
def get_related():
    search_engine = current_app.search_engine
    cursor = search_engine.metadata_db.cursor()
    
    # Parse JSON body
    data = request.json
    query = data.get('query', '')
    context_ids_input = data.get('context', []) # Expecting list of integers
    k_results = int(data.get('k', search_engine.config.RESULTS_TO_RETURN))
    ranking_mode = data.get('ranking', 'default')
    debug_mode = data.get('debug', False)
    is_private = data.get('private', False)

    k_results = min(k_results, 100)
    
    if not query:
        return jsonify({"error": "Query is required"}), 400

    # Ensure context IDs are integers
    context_ids = []
    try:
        context_ids = [int(x) for x in context_ids_input]
    except ValueError:
        print("Warning: invalid context IDs received")

    # Find query exclusion ID
    exclude_id = None
    lookup_strategies = [
        ("SELECT article_id FROM articles WHERE title = ?", (query,)),
        ("SELECT article_id FROM articles WHERE title = ?", (query.replace('_', ' '),)),
        ("SELECT article_id FROM articles WHERE lookup_title = ?", (query.lower(),)),
    ]
    
    for sql, params in lookup_strategies:
        cursor.execute(sql, params)
        row = cursor.fetchone()
        if row:
            exclude_id = int(row['article_id'])
            break
    
    # Vector search
    try:
        search_text = query.replace('_', ' ')
        embedding = search_engine.model.encode(
            [search_text], 
            normalize_embeddings=True, 
            convert_to_numpy=True
        ).astype(np.float32)
    except Exception as e:
        print(f"Error encoding query '{query}': {e}")
        return jsonify({"error": "Failed to encode query"}), 500
    
    search_size = search_engine.config.CANDIDATE_POOL_SIZE + 1 if exclude_id else search_engine.config.CANDIDATE_POOL_SIZE
    distances, indices = search_engine.index.search(embedding, search_size)
    
    candidate_ids = []
    semantic_scores = {}
    
    for i, idx in enumerate(indices[0]):
        idx_int = int(idx)
        if idx_int >= 0 and idx_int != exclude_id:
            candidate_ids.append(idx_int)
            semantic_scores[idx_int] = float(distances[0][i])
    
    if not candidate_ids:
        return jsonify({"results": [], "cross_edges": []})
    
    # Fetch metadata & rank
    placeholders = ','.join('?' * len(candidate_ids))
    query_columns = ['article_id', 'title']
    if search_engine.available_signals['pagerank']:
        query_columns.append('pagerank')
    if search_engine.available_signals['pageviews']:
        query_columns.append('pageviews')
    if search_engine.available_signals['backlinks']:
        query_columns.append('backlinks')
    
    query_sql = f"SELECT {', '.join(query_columns)} FROM articles WHERE article_id IN ({placeholders})"
    cursor.execute(query_sql, candidate_ids)
    
    results = []
    data_map = {row['article_id']: row for row in cursor.fetchall()}
    
    valid_candidate_ids = []
    
    for cand_id in candidate_ids:
        row_data = data_map.get(cand_id)
        
        if not row_data or is_meta_page(row_data['title']):
            continue
            
        valid_candidate_ids.append(cand_id)
        semantic_score = semantic_scores.get(cand_id, 0.0)
        
        if ranking_mode == 'semantic_only':
            final_score = semantic_score
            debug_info = {'semantic': semantic_score}
        else:
            pagerank = row_data['pagerank'] if search_engine.available_signals['pagerank'] and 'pagerank' in row_data.keys() else 0
            pageviews = row_data['pageviews'] if search_engine.available_signals['pageviews'] and 'pageviews' in row_data.keys() else 0
            
            final_score = calculate_multisignal_score(
                semantic_similarity=semantic_score,
                pagerank_score=pagerank,
                pageview_count=pageviews,
                title=row_data['title'],
                query=query
            )
            
            debug_info = {
                'semantic': semantic_score,
                'semantic_norm': float(semantic_score),
                'pagerank': float(pagerank) if pagerank else 0.0,
                'pagerank_norm': normalize_pagerank(pagerank),
                'pageviews': int(pageviews) if pageviews else 0,
                'pageviews_norm': normalize_pageviews(pageviews),
                'title_match': calculate_title_match_score(row_data['title'], query),
                'final_score': final_score
            }
        
        result = {
            "id": cand_id,
            "title": row_data['title'].replace(' ', '_'),
            "score": int(final_score * 100),
            "score_float": float(final_score)
        }
        
        if debug_mode:
            result['debug'] = debug_info
        
        results.append(result)
    
    results.sort(key=lambda x: x['score_float'], reverse=True)
    top_results = results[:k_results]
    
    # Calculate cross edges (Updated to use matrix check in cross_edges.py)
    new_result_ids = [r['id'] for r in top_results]
    cross_edges = []
    
    if new_result_ids and search_engine.can_reconstruct:
        try:
            # We compare new results vs existing context
            cross_edges = calculate_cross_edges(search_engine, new_result_ids, context_ids)
        except Exception as e:
            print(f"Error calculating cross edges: {e}")
    
    # Save search to public database only if NOT private
    if not is_private:
        try:
            ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
            if ip_address and ',' in ip_address:
                ip_address = ip_address.split(',')[0].strip()
            
            user_agent = request.headers.get('User-Agent', 'Unknown')
            
            existing = PublicSearch.query.filter_by(search_query=query).first()
            if existing:
                existing.search_count += 1
                existing.last_searched_at = datetime.utcnow()
                existing.last_ip = ip_address
                
                if existing.ip_addresses is None:
                    existing.ip_addresses = []
                if existing.user_agents is None:
                    existing.user_agents = []
                    
                if ip_address not in existing.ip_addresses:
                    existing.ip_addresses = existing.ip_addresses + [ip_address]
                if user_agent not in existing.user_agents:
                    existing.user_agents = existing.user_agents + [user_agent]
            else:
                new_search = PublicSearch(
                    search_query=query,
                    search_count=1,
                    last_ip=ip_address,
                    ip_addresses=[ip_address],
                    user_agents=[user_agent]
                )
                db.session.add(new_search)
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            print(f"Failed to save search (non-critical): {e}")
    
    final_results = []
    for r in top_results:
        clean_r = {k: v for k, v in r.items() if k != 'score_float' and k != 'id'}
        final_results.append(clean_r)
    
    return jsonify({
        "results": final_results,
        "cross_edges": cross_edges
    })

@search_bp.route('/article/<path:title>', methods=['GET'])
def get_article_details(title):
    search_engine = current_app.search_engine
    cursor = search_engine.metadata_db.cursor()
    
    cursor.execute(
        "SELECT * FROM articles WHERE title = ? OR lookup_title = ?",
        (title, title.lower())
    )
    
    article = cursor.fetchone()
    
    if not article:
        return jsonify({"error": "Article not found"}), 404
    
    article_dict = dict(article)
    article_dict['normalized_scores'] = {
        'pagerank': normalize_pagerank(article_dict.get('pagerank')),
        'pageviews': normalize_pageviews(article_dict.get('pageviews'))
    }
    
    return jsonify(article_dict)