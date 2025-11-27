import numpy as np

def calculate_cross_edges(search_engine, candidate_ids, context_ids):
    edges = []
    threshold = 0.65
    
    all_ids = list(set(candidate_ids + context_ids))
    
    if len(all_ids) < 2:
        return []
    
    cursor = search_engine.metadata_db.cursor()
    id_to_title = {}
    
    placeholders = ','.join('?' * len(all_ids))
    cursor.execute(f"SELECT article_id, title FROM articles WHERE article_id IN ({placeholders})", all_ids)
    for row in cursor.fetchall():
        id_to_title[row['article_id']] = row['title'].replace(' ', '_')
    
    for cand_id in candidate_ids:
        if cand_id not in id_to_title:
            continue
            
        title = id_to_title[cand_id].replace('_', ' ')
        
        try:
            embedding = search_engine.model.encode(
                [title], 
                normalize_embeddings=True, 
                convert_to_numpy=True
            ).astype(np.float32)
            distances, indices = search_engine.index.search(embedding, min(50, len(all_ids) * 2))
            
            for i, (dist, idx) in enumerate(zip(distances[0], indices[0])):
                idx_int = int(idx)
                
                if idx_int == cand_id:
                    continue
                    
                if idx_int in all_ids:
                    similarity = float(dist)
                    
                    if similarity > threshold:
                        src_title = id_to_title.get(cand_id)
                        tgt_title = id_to_title.get(idx_int)
                        
                        if src_title and tgt_title:
                            edges.append({
                                "source": src_title,
                                "target": tgt_title,
                                "score": similarity
                            })
        except Exception as e:
            print(f"Error processing {cand_id}: {e}")
            continue
    
    return edges