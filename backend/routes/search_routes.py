from flask import Blueprint, jsonify, request, current_app
import numpy as np
import hashlib
import time
from datetime import datetime
from sqlalchemy.exc import IntegrityError
from sentence_transformers import util

from core.ranking import (
    calculate_multisignal_score, 
    normalize_pagerank, 
    normalize_pageviews, 
    is_meta_page
)
from core.cross_edges import calculate_global_cross_edges
from core.console import console
from models import db, PublicSearch, User

search_bp = Blueprint('search', __name__)

def get_client_info():
    """Extracts IP and User Agent"""
    ip = request.headers.get('X-Forwarded-For', request.remote_addr)
    if ip and ',' in ip:
        ip = ip.split(',')[0].strip()
    ua = request.headers.get('User-Agent', 'Unknown')
    return ip, ua

def get_or_create_user():
    """Identifies a user by a hash of their IP + UserAgent."""
    ip, ua = get_client_info()
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
    
    # 1. User Session Management
    try:
        current_user = get_or_create_user()
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        # Fallback to verify user creation
        current_user = get_or_create_user()

    # 2. Parse Request
    data = request.json
    query = data.get('query', '')
    context_node_ids = data.get('context', [])
    k_results = min(int(data.get('k', search_engine.config.RESULTS_TO_RETURN)), 100)
    ranking_mode = data.get('ranking', 'default')
    debug_mode = data.get('debug', False)
    is_private = data.get('private', False)
    
    if not query:
        return jsonify({"error": "Query is required"}), 400

    # LOGGING
    ip, _ = get_client_info()
    console.log_search(query, ip, len(context_node_ids))
    search_start = time.time()

    # 3. Resolve Query Vector
    try:
        search_text = query.replace('_', ' ')
        query_embedding = search_engine.model.encode(
            [search_text], 
            normalize_embeddings=True, 
            convert_to_numpy=True
        ).astype(np.float32)
    except Exception as e:
        console.log_error(str(e))
        return jsonify({"error": str(e)}), 500

    # 4. Exclude Exact Match from Results (Case Insensitive Fix)
    exclude_id = -1
    clean_query = query.replace('_', ' ').lower()
    
    # Try case-insensitive match for the root node
    cursor.execute("SELECT article_id FROM articles WHERE LOWER(title) = ?", (clean_query,))
    row = cursor.fetchone()
    if row:
        exclude_id = int(row['article_id'])

    # 5. FAISS Search
    # We fetch extra candidates (pool size) because the verification step 
    # will aggressively drop mismatch "ghosts".
    pool_size = search_engine.config.CANDIDATE_POOL_SIZE
    distances, indices = search_engine.index.search(query_embedding, pool_size)
    
    candidate_ids = []
    raw_scores = {}
    
    for i, idx in enumerate(indices[0]):
        idx_int = int(idx)
        if idx_int >= 0 and idx_int != exclude_id:
            candidate_ids.append(idx_int)
            raw_scores[idx_int] = float(distances[0][i])

    if not candidate_ids:
        console.log_error("No candidates found in FAISS")
        return jsonify({"results": [], "cross_edges": []})

    # 6. Fetch Metadata
    placeholders = ','.join('?' * len(candidate_ids))
    query_columns = ['article_id', 'title']
    if search_engine.available_signals['pagerank']: query_columns.append('pagerank')
    if search_engine.available_signals['pageviews']: query_columns.append('pageviews')
    
    sql = f"SELECT {', '.join(query_columns)} FROM articles WHERE article_id IN ({placeholders})"
    cursor.execute(sql, candidate_ids)
    rows = cursor.fetchall()
    
    # ---------------------------------------------------------
    # 7. VERIFICATION LAYER (The Fix)
    # ---------------------------------------------------------
    # We re-encode the titles fetches from DB to ensure they actually match the query.
    
    candidates_to_verify = []
    valid_rows = []
    
    for row in rows:
        if is_meta_page(row['title']): continue
        candidates_to_verify.append(row['title'])
        valid_rows.append(row)
        
    # Batch encode titles (Fast for <1000 items)
    if candidates_to_verify:
        title_embeddings = search_engine.model.encode(
            candidates_to_verify, 
            normalize_embeddings=True, 
            convert_to_numpy=True
        )
        # Calculate cosine similarity: Query vs DB Titles
        verification_scores = util.cos_sim(query_embedding, title_embeddings).cpu().numpy()[0]
    else:
        verification_scores = []

    results = []
    
    for i, row in enumerate(valid_rows):
        cid = row['article_id']
        verified_semantic_score = float(verification_scores[i])
        
        # HARD FILTER: If the DB title doesn't semantically match the query, 
        # it is a mismatch artifact. DROP IT.
        # "Nesebar" vs "Eigenvalue" will be ~0.05.
        if verified_semantic_score < 0.25:
            continue

        pagerank = row['pagerank'] if 'pagerank' in row.keys() else 0
        pageviews = row['pageviews'] if 'pageviews' in row.keys() else 0
        
        # Use the VERIFIED score for ranking, not the FAISS score
        final_score = calculate_multisignal_score(
            semantic_similarity=verified_semantic_score, 
            pagerank_score=pagerank, 
            pageview_count=pageviews, 
            title=row['title'], 
            query=query
        )
        
        result_obj = {
            "id": cid,
            "title": row['title'].replace(' ', '_'),
            "score": int(final_score * 100),
            "score_float": final_score
        }
        
        if debug_mode:
            result_obj['debug'] = {
                'sem_faiss': raw_scores.get(cid, 0),
                'sem_verify': verified_semantic_score,
                'final': final_score
            }
            
        results.append(result_obj)

    # LOGGING
    search_end = time.time()
    console.log_verification(len(candidate_ids), len(results), search_end - search_start)

    # 8. Sort and Slice
    results.sort(key=lambda x: x['score_float'], reverse=True)
    top_results = results[:k_results]
    
    # 9. Cross Edges
    new_result_ids = [r['id'] for r in top_results]
    cross_edges = []
    
    if search_engine.can_reconstruct and len(new_result_ids) > 0:
        try:
            context_ids_int = []
            pending_lookups = []
            for ctx in context_node_ids:
                if str(ctx).isdigit(): context_ids_int.append(int(ctx))
                else: pending_lookups.append(str(ctx).replace('_', ' ').lower())
            
            if pending_lookups:
                ph = ','.join('?' * len(pending_lookups))
                cursor.execute(f"SELECT article_id FROM articles WHERE LOWER(title) IN ({ph})", pending_lookups)
                for r in cursor.fetchall(): context_ids_int.append(r['article_id'])
            
            cross_edges = calculate_global_cross_edges(
                search_engine,
                new_node_ids=new_result_ids,
                existing_node_ids=list(set(context_ids_int)),
                threshold=0.62,
                user_context=current_user
            )
        except Exception as e:
            console.log_error(f"Cross edge error: {e}")

    # 10. Analytics
    if not is_private:
        try:
            current_user.total_searches += 1
            existing = PublicSearch.query.filter_by(search_query=query).first()
            if existing:
                existing.search_count += 1
                existing.last_searched_at = datetime.utcnow()
            else:
                db.session.add(PublicSearch(
                    search_query=query, 
                    search_count=1, 
                    last_ip=current_user.ip_address,
                    ip_addresses=[current_user.ip_address],
                    user_agents=[current_user.user_agent]
                ))
            db.session.commit()
        except:
            db.session.rollback()

    final_output = []
    for r in top_results:
        final_output.append({k: v for k, v in r.items() if k not in ['score_float', 'id']})

    console.log_success(f"Sending {len(final_output)} nodes + {len(cross_edges)} edges")
    return jsonify({
        "results": final_output,
        "cross_edges": cross_edges
    })