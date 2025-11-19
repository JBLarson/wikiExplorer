from flask import Flask, jsonify, request
from flask_cors import CORS
import faiss
import sqlite3
import math
from sentence_transformers import SentenceTransformer
import numpy as np
import os

os.environ["TOKENIZERS_PARALLELISM"] = "false"

app = Flask(__name__)
CORS(app)

# --- Config ---
WEIGHT_SEMANTIC = 0.95
WEIGHT_IMPORTANCE = 0.05 # This will now be based on char_count
EPSILON = 1e-6
# ----------------

CANDIDATE_POOL_SIZE = 100
RESULTS_TO_RETURN = 32  # Default for public-facing queries
INDEX_PATH = "index.faiss"
METADATA_PATH = "metadata.db"
# --------------


# --- Load resources ---
print("Loading index...")
index = faiss.read_index(INDEX_PATH)
try:
    ivf_index = faiss.downcast_index(index.index)
    ivf_index.nprobe = 32
    print(f"Index is IVF, nprobe={ivf_index.nprobe}")
except:
    print("Index is Flat.")

print("Loading database...")
db = sqlite3.connect(METADATA_PATH, check_same_thread=False)
db.row_factory = sqlite3.Row

print("Loading model...")
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
print("Ready!")
# ---------------------


def normalize_char_count(char_count):
    """
    Normalizes char_count on a log scale.
    Min is 100 (log10=2.0). Max is 20,000 (log10=4.3).
    This maps the 2.0-4.3 range to a 0.0-1.0 range.
    """
    if char_count is None or char_count <= 100:
        return 0.0
    
    # log10(100) = 2
    # log10(20000) = 4.3
    min_log = 2.0
    max_log = 4.301
    
    score = (math.log10(char_count) - min_log) / (max_log - min_log)
    return min(1.0, max(0.0, score)) # Clamp between 0 and 1

def is_meta_page(title):
    lower = title.lower()
    bad_prefixes = ['wikipedia:', 'template:', 'category:', 'portal:', 'help:', 'user:', 
                    'talk:', 'file:', 'list of', 'outline of', 'timeline of', 'history of']
    return any(lower.startswith(p) for p in bad_prefixes) or '(disambiguation)' in lower

@app.route('/api/related/<path:query>', methods=['GET'])
def get_related(query):
    cursor = db.cursor()
    
    ranking_mode = request.args.get('ranking', 'default')
    try:
        k_results = request.args.get('k', default=RESULTS_TO_RETURN, type=int)
    except:
        k_results = RESULTS_TO_RETURN
    
    exclude_id = None
    
    # Strategy 1: Exact match with underscores
    cursor.execute("SELECT article_id FROM articles WHERE title = ?", (query,))
    row = cursor.fetchone()
    if row:
        exclude_id = int(row['article_id'])
    
    # Strategy 2: Try with spaces instead of underscores
    if not exclude_id:
        cursor.execute("SELECT article_id FROM articles WHERE title = ?", (query.replace('_', ' '),))
        row = cursor.fetchone()
        if row:
            exclude_id = int(row['article_id'])
    
    # Strategy 3: Case-insensitive search (using pre-normalized column)
    if not exclude_id:
        cursor.execute("SELECT article_id FROM articles WHERE lookup_title = ?", (query.lower(),))
        row = cursor.fetchone()
        if row:
            exclude_id = int(row['article_id'])
            
    try:
        search_text = query.replace('_', ' ')
        embedding = model.encode([search_text], normalize_embeddings=True, convert_to_numpy=True).astype(np.float32)
    except Exception as e:
        print(f"Error encoding query '{query}': {e}")
        return jsonify([])
    
    search_size = CANDIDATE_POOL_SIZE + 1 if exclude_id else CANDIDATE_POOL_SIZE
    distances, indices = index.search(embedding, search_size)
    
    candidate_ids = []
    candidate_scores = {} # Use a map to store scores by ID
    
    for i, idx in enumerate(indices[0]):
        idx_int = int(idx)
        if idx_int >= 0 and idx_int != exclude_id:
            candidate_ids.append(idx_int)
            candidate_scores[idx_int] = distances[0][i] 
    
    if not candidate_ids:
        return jsonify([])
    
    # --- UPDATED: Fetch char_count, NOT pageviews or backlinks ---
    placeholders = ','.join('?' * len(candidate_ids))
    cursor.execute(
        f"SELECT article_id, title, char_count FROM articles WHERE article_id IN ({placeholders})",
        candidate_ids
    )
    # -----------------------------------------------------------
    
    results = []
    data_map = {r['article_id']: r for r in cursor.fetchall()}
    
    for cand_id in candidate_ids:
        data = data_map.get(cand_id)
        
        if not data or is_meta_page(data['title']):
            continue
        
        semantic_score = candidate_scores.get(cand_id, 0.0)
        
        if ranking_mode == 'semantic':
            final_score = semantic_score
        else:
            # --- UPDATED: Use char_count as the importance signal ---
            importance_score = normalize_char_count(data['char_count'])
            
            # Weighted Geometric Mean
            final_score = (
                (semantic_score + EPSILON) ** WEIGHT_SEMANTIC *
                (importance_score + EPSILON) ** WEIGHT_IMPORTANCE
            )
            # ------------------------------------------------------
        
        results.append({
            "title": data['title'],
            "score_float": final_score, # Use float for sorting
            "score": int(final_score * 100) # Final score is still 0-100
        })
    
    results.sort(key=lambda x: x['score_float'], reverse=True)
    
    final_results = [{"title": r["title"], "score": r["score"]} for r in results[:k_results]]
    
    return jsonify(final_results)

@app.route('/api/health', methods=['GET'])
def health_check():
    try:
        nprobe = faiss.downcast_index(index.index).nprobe
    except:
        nprobe = "N/A (Flat Index)"
        
    return jsonify({
        "status": "ok",
        "index_path": INDEX_PATH,
        "metadata_path": METADATA_PATH,
        "index_total_vectors": index.ntotal,
        "nprobe": nprobe,
        "weight_semantic": WEIGHT_SEMANTIC,
        "weight_importance": WEIGHT_IMPORTANCE, # Using char_count
        "candidate_pool_size": CANDIDATE_POOL_SIZE,
        "results_to_return": RESULTS_TO_RETURN
    })

if __name__ == '__main__':
    app.run(port=5001, debug=False, threaded=True)