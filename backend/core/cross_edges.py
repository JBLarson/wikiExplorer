import numpy as np
from sentence_transformers import util

def calculate_cross_edges(search_engine, candidate_ids, context_titles):
    """
    Calculates edges between:
    1. New Candidates (IDs) <-> New Candidates (IDs)
    2. New Candidates (IDs) <-> Global Context (Titles)
    """
    THRESHOLD = 0.62
    MAX_EDGES_PER_NODE = 5
    
    # 1. Deduplicate Inputs
    candidate_ids = list(set([int(x) for x in candidate_ids]))
    
    # 2. Fetch Titles for Candidate IDs
    cursor = search_engine.metadata_db.cursor()
    id_to_title = {}
    
    if candidate_ids:
        placeholders = ','.join('?' * len(candidate_ids))
        sql = f"SELECT article_id, title FROM articles WHERE article_id IN ({placeholders})"
        cursor.execute(sql, candidate_ids)
        for row in cursor.fetchall():
            id_to_title[row['article_id']] = row['title']

    # Filter candidates that exist in DB
    valid_cands_ids = [cid for cid in candidate_ids if cid in id_to_title]
    if not valid_cands_ids:
        return []

    # 3. Prepare Text Lists
    # List A: New Candidates (We will iterate over these to find connections)
    cand_texts = [id_to_title[cid].replace('_', ' ') for cid in valid_cands_ids]
    
    # List B: Context Titles (The existing graph)
    # We strip underscores to ensure good embeddings
    clean_context_titles = [t.replace('_', ' ') for t in context_titles if t]
    
    # Target Pool = New Candidates + Existing Context
    # We want new nodes to connect to OTHER new nodes AND existing nodes
    # We track them by string to simplify the matrix logic
    target_texts = cand_texts + clean_context_titles
    
    # remove duplicates in target_texts to save compute, but keep index mapping? 
    # For simplicity in this "lite" version, we'll just embed all.
    
    if len(target_texts) < 2:
        return []

    edges = []

    try:
        # 4. Generate Embeddings
        # Encode Candidates
        cand_embeddings = search_engine.model.encode(cand_texts, convert_to_tensor=True, normalize_embeddings=True)
        
        # Encode Targets (Candidates + Context)
        # Note: In production, you might cache context embeddings, but for <2000 nodes this is fast on CPU
        target_embeddings = search_engine.model.encode(target_texts, convert_to_tensor=True, normalize_embeddings=True)

        # 5. Calculate Similarity Matrix
        cosine_scores = util.cos_sim(cand_embeddings, target_embeddings)
        scores_np = cosine_scores.cpu().numpy()

        # 6. Extract Edges
        # Iterate through candidates (rows)
        for i, c_id in enumerate(valid_cands_ids):
            c_title_clean = cand_texts[i]
            candidate_edges = []
            
            # Iterate through all targets (columns)
            for j, t_text in enumerate(target_texts):
                # Skip self-loops (based on string equality)
                if c_title_clean == t_text:
                    continue
                
                score = float(scores_np[i][j])
                
                if score > THRESHOLD:
                    # Determine source/target names
                    # Source is always the new candidate (using DB title)
                    source_title = id_to_title[c_id]
                    
                    # Target is either a fellow candidate or a context node
                    # We use the text we encoded, but we need to be careful about formatting
                    # The frontend normalizeNodeId handles spaces/underscores, 
                    # so sending "Graph Theory" (spaced) is fine.
                    target_title = t_text 
                    
                    candidate_edges.append({
                        "source": source_title,
                        "target": target_title,
                        "score": score
                    })
            
            # Sort by score and Limit
            candidate_edges.sort(key=lambda x: x['score'], reverse=True)
            edges.extend(candidate_edges[:MAX_EDGES_PER_NODE])

    except Exception as e:
        print(f"Error in global cross_edges: {e}")
        return []

    return edges