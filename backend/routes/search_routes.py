from flask import Blueprint, jsonify, request, current_app
import numpy as np
import hashlib
from datetime import datetime
from sqlalchemy.exc import IntegrityError

from core.ranking import (
    calculate_multisignal_score, 
    normalize_pagerank, 
    normalize_pageviews, 
    calculate_title_match_score,
    is_meta_page
)
from core.cross_edges import calculate_global_cross_edges
from models import db, PublicSearch, User

search_bp = Blueprint('search', __name__)

def normalize_node_id(title):
    """Convert title to ID format"""
    return title.lower().replace(' ', '_')

def get_client_info():
    """Extracts IP and User Agent"""
    ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    if ip and ',' in ip:
        ip = ip.split(',')[0].strip()
    ua = request.headers.get('User-Agent', 'Unknown')
    return ip, ua

def get_or_create_user():
    """
    Identifies a user by a hash of their IP + UserAgent.
    Updates their last_seen status.
    """
    ip, ua = get_client_info()
    
    # Create a deterministic fingerprint
    fingerprint_raw = f"{ip}|{ua}"
    fingerprint = hashlib.sha256(fingerprint_raw.encode()).hexdigest()
    
    user = User.query.filter_by(fingerprint=fingerprint).first()
    
    if not user:
        user = User(
            ip_address=ip,
            user_agent=ua,
            fingerprint=fingerprint,
            created_at=datetime.utcnow(),
            last_seen=datetime.utcnow(),
            total_searches=0,
            edges_discovered=0
        )
        db.session.add(user)
    else:
        user.last_seen = datetime.utcnow()
    
    return user

@search_bp.route('/related', methods=['POST'])
def get_related():
    search_engine = current_app.search_engine
    cursor = search_engine.metadata_db.cursor()
    
    # 1. Identify User
    # We use a nested transaction or separate commit for user to ensure we have an ID
    # even if the analytics part fails/retries.
    try:
        current_user = get_or_create_user()
        db.session.commit()
    except IntegrityError:
        db.session.rollback()
        current_user = get_or_create_user() # Re-fetch, it exists now
    except Exception as e:
        db.session.rollback()
        print(f"User init error: {e}")
        return jsonify({"error": "Session error"}), 500
    
    # Parse JSON body
    data = request.json
    query = data.get('query', '')
    context_node_ids = data.get('context', [])
    
    k_results = int(data.get('k', search_engine.config.RESULTS_TO_RETURN))
    ranking_mode = data.get('ranking', 'default')
    debug_mode = data.get('debug', False)
    is_private = data.get('private', False)

    k_results = min(k_results, 100)
    
    if not query:
        return jsonify({"error": "Query is required"}), 400

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
    
    for cand_id in candidate_ids:
        row_data = data_map.get(cand_id)
        
        if not row_data or is_meta_page(row_data['title']):
            continue
            
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
    
    # Sort and slice top results
    results.sort(key=lambda x: x['score_float'], reverse=True)
    top_results = results[:k_results]
    
    # Calculate GLOBAL cross edges
    new_result_ids = [r['id'] for r in top_results]
    cross_edges = []
    
    if search_engine.can_reconstruct and len(new_result_ids) > 0:
        try:
            # OPTIMIZED CONTEXT RESOLUTION (Batch Query)
            context_ids_int = []
            pending_lookups = []
            
            for ctx_id in context_node_ids:
                if isinstance(ctx_id, int):
                    context_ids_int.append(ctx_id)
                elif isinstance(ctx_id, str):
                    if ctx_id.isdigit():
                        context_ids_int.append(int(ctx_id))
                    else:
                        clean_title = ctx_id.replace('_', ' ').lower()
                        pending_lookups.append(clean_title)
            
            if pending_lookups:
                placeholders = ','.join('?' * len(pending_lookups))
                sql = f"SELECT article_id FROM articles WHERE lookup_title IN ({placeholders})"
                cursor.execute(sql, pending_lookups)
                rows = cursor.fetchall()
                for row in rows:
                    context_ids_int.append(int(row['article_id']))

            existing_ids_final = list(set(context_ids_int))
            
            # --- Pass User Context to Calculator ---
            cross_edges = calculate_global_cross_edges(
                search_engine, 
                new_node_ids=new_result_ids, 
                existing_node_ids=existing_ids_final,
                threshold=0.62,
                user_context=current_user  # Passing the user object here
            )
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"Error calculating cross edges: {e}")
    
    # --- FIXED ANALYTICS LOGIC (Race Condition Proof) ---
    if not is_private:
        try:
            # 1. Update User Stats (Safe because user object is already attached to session)
            current_user.total_searches += 1
            
            # 2. Update Public Search (Robust Upsert Logic)
            existing = PublicSearch.query.filter_by(search_query=query).first()
            
            if existing:
                existing.search_count += 1
                existing.last_searched_at = datetime.utcnow()
                existing.last_ip = current_user.ip_address
                # Simple append for now, can optimize later if lists get huge
                if current_user.ip_address not in (existing.ip_addresses or []):
                    existing.ip_addresses = (existing.ip_addresses or []) + [current_user.ip_address]
            else:
                # Optimistic Insert
                new_search = PublicSearch(
                    search_query=query,
                    search_count=1,
                    last_ip=current_user.ip_address,
                    ip_addresses=[current_user.ip_address],
                    user_agents=[current_user.user_agent]
                )
                db.session.add(new_search)
            
            db.session.commit()

        except IntegrityError:
            db.session.rollback()
            # RACE CONDITION CAUGHT: 
            # Another request inserted the row while we were processing.
            # Switch to update mode for the record that now definitely exists.
            print(f"Race condition resolved for query: {query}")
            
            # Re-fetch user to attach to new session
            current_user = get_or_create_user()
            current_user.total_searches += 1
            
            existing = PublicSearch.query.filter_by(search_query=query).first()
            if existing:
                existing.search_count += 1
                existing.last_searched_at = datetime.utcnow()
                db.session.commit()
                
        except Exception as e:
            db.session.rollback()
            print(f"Failed to save analytics: {e}")
    
    final_results = []
    for r in top_results:
        clean_r = {k: v for k, v in r.items() if k != 'score_float' and k != 'id'}
        final_results.append(clean_r)
    
    return jsonify({
        "results": final_results,
        "cross_edges": cross_edges
    })