import numpy as np
from sentence_transformers import util
from models import db, CachedEdge

def calculate_global_cross_edges(search_engine, new_node_ids, existing_node_ids, threshold=0.62, max_edges_per_node=5, user_context=None):
    """
    Optimized Hybrid Strategy with Provenance:
    1. DB Lookup: Check if edges for 'new_node_ids' already exist.
    2. Smart Filter: Remove nodes found in cache from the compute list.
    3. Vector Calc: Compute ONLY for the cache misses.
    4. Persist: Save new edges with USER ID and MODEL VERSION.
    """
    if not new_node_ids:
        return []

    # 1. Normalize Inputs
    new_ids_set = set(int(nid) for nid in new_node_ids)
    existing_ids_set = set(int(nid) for nid in existing_node_ids if int(nid) not in new_ids_set)
    
    combined_edges = {} 
    resolved_nodes = set()

    # ---------------------------------------------------------
    # STEP A: Query Cache
    # ---------------------------------------------------------
    try:
        if new_ids_set:
            new_ids_list = list(new_ids_set)
            
            cached_results = CachedEdge.query.filter(
                (CachedEdge.source_id.in_(new_ids_list)) | 
                (CachedEdge.target_id.in_(new_ids_list))
            ).all()

            for row in cached_results:
                if row.source_id in new_ids_set:
                    node_id = row.source_id
                    other_id = row.target_id
                else:
                    node_id = row.target_id
                    other_id = row.source_id
                
                is_relevant = (other_id in existing_ids_set or other_id in new_ids_set)
                
                if is_relevant:
                    edge_key = tuple(sorted([row.source_id, row.target_id]))
                    combined_edges[edge_key] = row.score
                    resolved_nodes.add(node_id)
            
    except Exception as e:
        print(f"Warning: DB Cache lookup failed: {e}")

    # ---------------------------------------------------------
    # STEP B: Compute Missing (Smart Skip)
    # ---------------------------------------------------------
    nodes_to_compute = list(new_ids_set - resolved_nodes)
    
    if search_engine.can_reconstruct and nodes_to_compute:
        try:
            def get_vectors(node_ids):
                vecs = []
                valid = []
                for nid in node_ids:
                    try:
                        v = search_engine.index.reconstruct(nid)
                        vecs.append(v)
                        valid.append(nid)
                    except:
                        continue
                if not vecs: return None, []
                return np.array(vecs), valid

            # Fetch vectors ONLY for cache misses
            new_vecs, new_valid = get_vectors(nodes_to_compute)
            
            context_pool = list(existing_ids_set.union(resolved_nodes))
            context_vecs = None
            context_valid = []
            
            if context_pool:
                context_vecs, context_valid = get_vectors(context_pool)

            edges_to_save = []

            def extract_edges(source_ids, target_ids, matrix):
                rows, cols = matrix.shape
                
                for i in range(rows):
                    source_id = source_ids[i]
                    scores = matrix[i]
                    
                    valid_indices = np.where(scores > threshold)[0]
                    if len(valid_indices) == 0: continue

                    valid_scores = scores[valid_indices]
                    sorted_order = np.argsort(valid_scores)[::-1]
                    top_indices = valid_indices[sorted_order]

                    count = 0
                    for idx in top_indices:
                        if count >= max_edges_per_node: break
                        target_id = target_ids[idx]
                        if source_id == target_id: continue

                        s_id, t_id = sorted([source_id, target_id])
                        edge_key = (s_id, t_id)
                        score_val = float(scores[idx])

                        if edge_key not in combined_edges:
                            combined_edges[edge_key] = score_val
                            edges_to_save.append({
                                'source_id': int(s_id),
                                'target_id': int(t_id),
                                'score': score_val
                            })
                        count += 1

            # 1. Missing vs Missing
            if new_vecs is not None and len(new_valid) > 1:
                mat = util.cos_sim(new_vecs, new_vecs).cpu().numpy()
                extract_edges(new_valid, new_valid, mat)

            # 2. Missing vs Context
            if new_vecs is not None and context_vecs is not None:
                mat = util.cos_sim(new_vecs, context_vecs).cpu().numpy()
                extract_edges(new_valid, context_valid, mat)

            # ---------------------------------------------------------
            # STEP C: Persist with Provenance
            # ---------------------------------------------------------
            if edges_to_save:
                try:
                    edges_added_count = 0
                    
                    for edge_data in edges_to_save:
                        exists = CachedEdge.query.filter_by(
                            source_id=edge_data['source_id'], 
                            target_id=edge_data['target_id']
                        ).first()
                        
                        if not exists:
                            new_edge = CachedEdge(
                                source_id=edge_data['source_id'],
                                target_id=edge_data['target_id'],
                                score=edge_data['score'],
                                # Provenance Data
                                model_version="all-MiniLM-L6-v2",
                                created_by_user_id=user_context.id if user_context else None
                            )
                            db.session.add(new_edge)
                            edges_added_count += 1
                    
                    if user_context and edges_added_count > 0:
                        user_context.edges_discovered += edges_added_count
                        
                    db.session.commit()
                except Exception as e:
                    db.session.rollback()
                    print(f"Error saving edges: {e}")

        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"Computation error: {e}")

    # ---------------------------------------------------------
    # STEP D: Resolve Titles
    # ---------------------------------------------------------
    final_output = []
    needed_ids = set()
    for (src, tgt) in combined_edges.keys():
        needed_ids.add(src)
        needed_ids.add(tgt)
    
    if not needed_ids:
        return []

    try:
        cursor = search_engine.metadata_db.cursor()
        id_to_title = {}
        
        id_list = list(needed_ids)
        placeholders = ','.join('?' * len(id_list))
        sql = f"SELECT article_id, title FROM articles WHERE article_id IN ({placeholders})"
        cursor.execute(sql, id_list)
        
        for row in cursor.fetchall():
            id_to_title[row['article_id']] = row['title']

        for (src, tgt), score in combined_edges.items():
            if src in id_to_title and tgt in id_to_title:
                final_output.append({
                    "source": id_to_title[src],
                    "target": id_to_title[tgt],
                    "score": score
                })
                
        return final_output

    except Exception as e:
        print(f"Title resolution error: {e}")
        return []