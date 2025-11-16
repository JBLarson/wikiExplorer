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

# Config
WEIGHT_SEMANTIC = 0.99
WEIGHT_POPULARITY = 0.01
CANDIDATE_POOL_SIZE = 100
RESULTS_TO_RETURN = 16

# Load resources
print("Loading index...")
index = faiss.read_index("data/embeddings/index.faiss")
try:
    ivf_index = faiss.downcast_index(index.index)
    ivf_index.nprobe = 32
    print(f"IVF index, nprobe={ivf_index.nprobe}")
except:
    print("Flat index")

print("Loading database...")
db = sqlite3.connect("data/embeddings/metadata.db", check_same_thread=False)
db.row_factory = sqlite3.Row

print("Loading model...")
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
print("Ready!")

def normalize_popularity(pageviews):
    if pageviews is None or pageviews <= 0:
        return 0.0
    return min(1.0, math.log10(pageviews + 1) / 7.0)

def is_meta_page(title):
    lower = title.lower()
    bad = ['wikipedia:', 'template:', 'category:', 'portal:', 'help:', 'user:', 
           'talk:', 'file:', 'list of', 'outline of', 'timeline of', 'history of']
    return any(lower.startswith(p) for p in bad) or '(disambiguation)' in lower

@app.route('/api/related/<path:query>', methods=['GET'])
def get_related(query):
    cursor = db.cursor()
    
    # Try multiple lookup strategies for exact articles
    article_id = None
    
    # Strategy 1: Exact match with underscores
    cursor.execute("SELECT article_id FROM articles WHERE title = ?", (query,))
    row = cursor.fetchone()
    if row:
        article_id = int(row['article_id'])
    
    # Strategy 2: Try with spaces instead of underscores
    if not article_id:
        cursor.execute("SELECT article_id FROM articles WHERE title = ?", (query.replace('_', ' '),))
        row = cursor.fetchone()
        if row:
            article_id = int(row['article_id'])
    
    # Strategy 3: Case-insensitive search
    if not article_id:
        cursor.execute("SELECT article_id FROM articles WHERE LOWER(title) = LOWER(?)", (query,))
        row = cursor.fetchone()
        if row:
            article_id = int(row['article_id'])
    
    if article_id:
        # Found exact article - get its embedding
        try:
            embedding = index.reconstruct(article_id).reshape(1, -1)
            exclude_id = article_id
        except:
            # Fallback to encoding if reconstruction fails
            embedding = model.encode([query], normalize_embeddings=True, convert_to_numpy=True).astype(np.float32)
            exclude_id = None
    else:
        # No exact match - semantic search
        try:
            embedding = model.encode([query], normalize_embeddings=True, convert_to_numpy=True).astype(np.float32)
            exclude_id = None
        except:
            return jsonify([])
    
    # Search
    search_size = CANDIDATE_POOL_SIZE + 1 if exclude_id else CANDIDATE_POOL_SIZE
    distances, indices = index.search(embedding, search_size)
    
    # Get candidates
    candidate_ids = []
    candidate_dists = []
    for i, idx in enumerate(indices[0]):
        idx_int = int(idx)
        if idx_int >= 0 and idx_int != exclude_id:
            candidate_ids.append(idx_int)
            candidate_dists.append(distances[0][i])
    
    if not candidate_ids:
        return jsonify([])
    
    # Get metadata
    placeholders = ','.join('?' * len(candidate_ids))
    cursor.execute(
        f"SELECT article_id, title, pageviews FROM articles WHERE article_id IN ({placeholders})",
        candidate_ids
    )
    
    # Build results
    results = []
    data_map = {r['article_id']: r for r in cursor.fetchall()}
    
    for i, cand_id in enumerate(candidate_ids):
        data = data_map.get(cand_id)
        if not data or is_meta_page(data['title']):
            continue
        
        semantic = 1 - candidate_dists[i]
        popularity = normalize_popularity(data['pageviews'])
        final_score = (semantic * WEIGHT_SEMANTIC) + (popularity * WEIGHT_POPULARITY)
        
        results.append({
            "title": data['title'],
            "score": int(final_score * 100)
        })
    
    results.sort(key=lambda x: x['score'], reverse=True)
    return jsonify(results[:RESULTS_TO_RETURN])

if __name__ == '__main__':
    app.run(port=5001, debug=False, threaded=True)