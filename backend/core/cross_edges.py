import numpy as np
from sentence_transformers import util

def calculate_global_cross_edges(search_engine, all_node_ids, threshold=0.62, max_edges_per_node=5):
    """
    Compare ALL nodes in the graph against each other using FAISS vectors.
    This should be called ONCE per expansion with the complete node list.
    """
    if not search_engine.can_reconstruct or len(all_node_ids) < 2:
        return []
    
    try:
        # 1. Get pre-computed embeddings from FAISS (O(n) disk read)
        embeddings = []
        valid_ids = []
        
        for nid in all_node_ids:
            try:
                vec = search_engine.index.reconstruct(int(nid))
                embeddings.append(vec)
                valid_ids.append(int(nid))
            except Exception as e:
                print(f"Warning: Could not reconstruct vector for ID {nid}: {e}")
                continue
        
        if len(valid_ids) < 2:
            return []
        
        embeddings = np.array(embeddings)
        
        # 2. Compute similarity matrix (O(n²) but unavoidable)
        cosine_scores = util.cos_sim(embeddings, embeddings).cpu().numpy()
        
        # 3. Get titles for valid IDs
        cursor = search_engine.metadata_db.cursor()
        id_to_title = {}
        placeholders = ','.join('?' * len(valid_ids))
        sql = f"SELECT article_id, title FROM articles WHERE article_id IN ({placeholders})"
        cursor.execute(sql, valid_ids)
        for row in cursor.fetchall():
            id_to_title[row['article_id']] = row['title']
        
        # 4. Extract top edges per node
        edges = []
        edge_set = set()  # Prevent duplicates (A->B and B->A)
        
        for i, node_id in enumerate(valid_ids):
            # Get top K similar nodes (excluding self)
            similarities = []
            for j in range(len(valid_ids)):
                if i != j:
                    similarities.append((j, cosine_scores[i][j]))
            
            similarities.sort(key=lambda x: x[1], reverse=True)
            
            for j, score in similarities[:max_edges_per_node]:
                if score > threshold:
                    target_id = valid_ids[j]
                    
                    # Create canonical edge key (smaller ID first)
                    edge_key = tuple(sorted([node_id, target_id]))
                    
                    if edge_key not in edge_set:
                        edge_set.add(edge_key)
                        edges.append({
                            "source": id_to_title.get(node_id, ""),
                            "target": id_to_title.get(target_id, ""),
                            "score": float(score)
                        })
        
        print(f"Generated {len(edges)} global cross-edges from {len(valid_ids)} nodes")
        return edges
        
    except Exception as e:
        import traceback
        print(f"Global cross-edge error: {e}")
        traceback.print_exc()
        return []


def calculate_cross_edges(search_engine, candidate_ids, context_ids):
    """
    LEGACY FUNCTION - Kept for backwards compatibility.
    Now just calls calculate_global_cross_edges with combined IDs.
    """
    # Combine candidates and context
    all_ids = list(set(candidate_ids + context_ids))
    return calculate_global_cross_edges(search_engine, all_ids, threshold=0.62, max_edges_per_node=5)