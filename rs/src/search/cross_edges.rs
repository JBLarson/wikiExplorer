use crate::search::engine::SearchEngine;
use crate::utils::errors::AppError;
use ndarray::{Array1, Array2, Axis};
use sqlx::SqlitePool;
use std::collections::{HashMap, HashSet};
use tracing::{info, warn};

#[derive(Debug, Clone)]
pub struct EdgeResult {
    pub source: String,
    pub target: String,
    pub score: f32,
}

pub async fn calculate_global_cross_edges(
    engine: &SearchEngine,
    pool: &SqlitePool,
    new_node_ids: &[i64],
    existing_node_ids: &[i64],
    threshold: f32,
) -> Result<Vec<EdgeResult>, AppError> {
    if new_node_ids.is_empty() {
        return Ok(vec![]);
    }

    let start_time = std::time::Instant::now();

    // 1. Normalize Inputs
    let new_ids_set: HashSet<i64> = new_node_ids.iter().cloned().collect();
    // Ensure existing IDs don't overlap with new ones to avoid self-loops/dupes
    let existing_ids_set: HashSet<i64> = existing_node_ids
        .iter()
        .filter(|id| !new_ids_set.contains(id))
        .cloned()
        .collect();

    let mut combined_edges: HashMap<(i64, i64), f32> = HashMap::new();
    let mut resolved_nodes: HashSet<i64> = HashSet::new();

    // 2. Query Cache (DB Lookup)
    // In Rust/SQLx, `WHERE id IN (...)` requires dynamic query building
    let new_ids_vec: Vec<i64> = new_ids_set.iter().cloned().collect();
    
    // NOTE: For brevity, assuming a helper exists or raw query. 
    // Real implementation needs `QueryBuilder` for dynamic IN clauses.
    // We skip the DB cache read implementation here to focus on the math logic, 
    // assuming cache miss for this snippet or add it if strictly needed.
    
    // 3. Compute Missing (Vector Math)
    // Identify nodes that weren't resolved by DB cache
    let nodes_to_compute: Vec<i64> = new_ids_set
        .difference(&resolved_nodes)
        .cloned()
        .collect();

    if engine.can_reconstruct && !nodes_to_compute.is_empty() {
        // A. Get Vectors for New Nodes
        let (new_vecs, new_valid_ids) = get_vectors(engine, &nodes_to_compute);
        
        // B. Get Vectors for Context (Existing) Nodes
        let context_pool: Vec<i64> = existing_ids_set.union(&resolved_nodes).cloned().collect();
        let (ctx_vecs, ctx_valid_ids) = get_vectors(engine, &context_pool);

        // C. Calculate: New vs New
        if !new_vecs.is_empty() {
             // Convert Vec<Vec<f32>> to ndarray::Array2
            let new_matrix = vec_to_matrix(&new_vecs, 384);
            let similarity_matrix = cosine_similarity(&new_matrix, &new_matrix);
            
            extract_edges(
                &new_valid_ids, 
                &new_valid_ids, 
                &similarity_matrix, 
                threshold, 
                &mut combined_edges
            );
        }

        // D. Calculate: New vs Context
        if !new_vecs.is_empty() && !ctx_vecs.is_empty() {
            let new_matrix = vec_to_matrix(&new_vecs, 384);
            let ctx_matrix = vec_to_matrix(&ctx_vecs, 384);
            let similarity_matrix = cosine_similarity(&new_matrix, &ctx_matrix);

            extract_edges(
                &new_valid_ids, 
                &ctx_valid_ids, 
                &similarity_matrix, 
                threshold, 
                &mut combined_edges
            );
        }
    }

    // 4. Resolve Titles (Final DB Lookup)
    // Collect all unique IDs involved in edges
    let mut needed_ids = HashSet::new();
    for (src, tgt) in combined_edges.keys() {
        needed_ids.insert(*src);
        needed_ids.insert(*tgt);
    }

    if needed_ids.is_empty() {
        return Ok(vec![]);
    }

    // Resolve titles
    let mut id_to_title = HashMap::new();
    let params = format!("?{}", ",?".repeat(needed_ids.len() - 1));
    let sql = format!("SELECT article_id, title FROM articles WHERE article_id IN ({})", params);
    
    let mut query = sqlx::query_as::<_, (i64, String)>(&sql);
    for id in &needed_ids {
        query = query.bind(id);
    }
    
    let rows = query.fetch_all(pool).await?;
    for (id, title) in rows {
        id_to_title.insert(id, title);
    }

    // Format output
    let mut final_output = Vec::new();
    for ((src_id, tgt_id), score) in combined_edges {
        if let (Some(src_title), Some(tgt_title)) = (id_to_title.get(&src_id), id_to_title.get(&tgt_id)) {
            final_output.push(EdgeResult {
                source: src_title.clone(),
                target: tgt_title.clone(),
                score,
            });
        }
    }

    info!("Cross-edges: {} calculated in {:?}", final_output.len(), start_time.elapsed());
    Ok(final_output)
}

// --- Helpers ---

fn get_vectors(engine: &SearchEngine, ids: &[i64]) -> (Vec<Vec<f32>>, Vec<i64>) {
    let mut vecs = Vec::new();
    let mut valid = Vec::new();
    
    for &id in ids {
        if let Ok(v) = engine.reconstruct(id) {
            vecs.push(v);
            valid.push(id);
        }
    }
    (vecs, valid)
}

fn vec_to_matrix(vecs: &[Vec<f32>], dim: usize) -> Array2<f32> {
    let flattened: Vec<f32> = vecs.iter().flatten().cloned().collect();
    Array2::from_shape_vec((vecs.len(), dim), flattened).unwrap()
}

fn cosine_similarity(a: &Array2<f32>, b: &Array2<f32>) -> Array2<f32> {
    // A dot B.T
    a.dot(&b.t())
}

fn extract_edges(
    row_ids: &[i64],
    col_ids: &[i64],
    matrix: &Array2<f32>,
    threshold: f32,
    accumulator: &mut HashMap<(i64, i64), f32>
) {
    for (row_idx, row) in matrix.outer_iter().enumerate() {
        for (col_idx, &score) in row.iter().enumerate() {
            let src = row_ids[row_idx];
            let tgt = col_ids[col_idx];

            if src == tgt { continue; }
            if score < threshold { continue; }

            // Normalize key order to prevent duplicates (A-B vs B-A)
            let key = if src < tgt { (src, tgt) } else { (tgt, src) };
            
            // Only keep the edge if it's new or this score is higher
            accumulator
                .entry(key)
                .and_modify(|e| *e = score.max(*e))
                .or_insert(score);
        }
    }
}
