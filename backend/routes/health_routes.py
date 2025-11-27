from flask import Blueprint, jsonify, current_app
import faiss

health_bp = Blueprint('health', __name__)

@health_bp.route('/health', methods=['GET'])
def health_check():
    search_engine = current_app.search_engine
    
    try:
        nprobe = faiss.downcast_index(search_engine.index.index).nprobe
    except:
        nprobe = "N/A (Flat Index)"
    
    cursor = search_engine.metadata_db.cursor()
    cursor.execute("SELECT COUNT(*) FROM articles")
    total_articles = cursor.fetchone()[0]
    
    signal_coverage = {}
    if search_engine.available_signals['pagerank']:
        cursor.execute("SELECT COUNT(*) FROM articles WHERE pagerank > 0")
        result = cursor.fetchone()
        signal_coverage['pagerank'] = result[0] if result else 0
    
    if search_engine.available_signals['pageviews']:
        cursor.execute("SELECT COUNT(*) FROM articles WHERE pageviews > 0")
        result = cursor.fetchone()
        signal_coverage['pageviews'] = result[0] if result else 0
    
    if search_engine.available_signals['backlinks']:
        cursor.execute("SELECT COUNT(*) FROM articles WHERE backlinks > 0")
        result = cursor.fetchone()
        signal_coverage['backlinks'] = result[0] if result else 0
    
    return jsonify({
        "status": "ok",
        "index_path": search_engine.config.INDEX_PATH,
        "metadata_path": search_engine.config.METADATA_PATH,
        "total_articles": total_articles,
        "index_total_vectors": search_engine.index.ntotal,
        "nprobe": nprobe,
        "ranking_weights": {
            "semantic": search_engine.config.WEIGHT_SEMANTIC,
            "pagerank": search_engine.config.WEIGHT_PAGERANK,
            "pageviews": search_engine.config.WEIGHT_PAGEVIEWS,
            "title_match": search_engine.config.WEIGHT_TITLE_MATCH
        },
        "connectivity": {
            "threshold": search_engine.config.CROSS_EDGE_THRESHOLD,
            "enabled": search_engine.can_reconstruct
        },
        "available_signals": search_engine.available_signals,
        "signal_coverage": signal_coverage,
        "candidate_pool_size": search_engine.config.CANDIDATE_POOL_SIZE,
        "default_results": search_engine.config.RESULTS_TO_RETURN
    })