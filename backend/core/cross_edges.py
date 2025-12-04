import numpy as np
from sentence_transformers import util

def calculate_cross_edges(search_engine, candidate_ids, context_ids):
    """
    Calculates edges by re-encoding titles on the fly.
    This bypasses FAISS reconstruction issues entirely.
    """
    edges = []
    threshold = 0.60  # Slightly lowered to ensure connections in scientific topics
    
    # 1. Clean Inputs
    # We need to compare Candidates (new nodes) vs Context (existing nodes)
    # AND Candidates vs Candidates (to link the new batch together)
    candidate_ids = list(set([int(x) for x in candidate_ids]))
    context_ids = list(set([int(x) for x in context_ids]))
    
    # Combine sets for the "Target" pool (Existing + New)
    # We want to check: New Node -> (Any Existing Node OR Any Other New Node)
    target_ids = list(set(context_ids + candidate_ids))
    
    if not candidate_ids or len(target_ids) < 2:
        return []

    # 2. Fetch Titles from DB
    # We need titles to generate fresh embeddings
    all_needed_ids = list(set(candidate_ids + target_ids))
    
    cursor = search_engine.metadata_db.cursor()
    id_to_title = {}
    
    # Batch fetch titles
    placeholders = ','.join('?' * len(all_needed_ids))
    sql = f"SELECT article_id, title FROM articles WHERE article_id IN ({placeholders})"
    cursor.execute(sql, all_needed_ids)
    
    for row in cursor.fetchall():
        # Store clean title for embedding, formatted title for graph
        id_to_title[row['article_id']] = row['title']

    # 3. Prepare Text for Encoding
    # Filter out IDs that might be missing from DB (rare but possible)
    valid_cands = [cid for cid in candidate_ids if cid in id_to_title]
    valid_targets = [tid for tid in target_ids if tid in id_to_title]

    if not valid_cands or not valid_targets:
        return []

    cand_texts = [id_to_title[cid].replace('_', ' ') for cid in valid_cands]
    target_texts = [id_to_title[tid].replace('_', ' ') for tid in valid_targets]

    try:
        # 4. Generate Embeddings (CPU/GPU)
        # This is robust because it uses the model directly, ignoring FAISS index quirks
        cand_embeddings = search_engine.model.encode(cand_texts, convert_to_tensor=True, normalize_embeddings=True)
        target_embeddings = search_engine.model.encode(target_texts, convert_to_tensor=True, normalize_embeddings=True)

        # 5. Calculate Cosine Similarity Matrix
        # output is a (len(cand) x len(target)) matrix
        cosine_scores = util.cos_sim(cand_embeddings, target_embeddings)
        
        # Convert to numpy for easier handling
        scores_np = cosine_scores.cpu().numpy()

        # 6. Extract Edges
        # Iterate through the matrix
        for i, c_id in enumerate(valid_cands):
            for j, t_id in enumerate(valid_targets):
                
                # Skip self-loops
                if c_id == t_id:
                    continue
                
                score = float(scores_np[i][j])
                
                if score > threshold:
                    edges.append({
                        "source": id_to_title[c_id],
                        "target": id_to_title[t_id],
                        "score": score
                    })

    except Exception as e:
        print(f"CRITICAL ERROR in cross_edges: {e}")
        return []

    return edges