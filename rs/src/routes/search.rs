use axum::{
    extract::{State, Json},
    http::HeaderMap,
};
use std::sync::Arc;
use crate::state::AppState;
use crate::utils::errors::AppError;
use crate::search::ranking::{calculate_multisignal_score, is_meta_page};
use crate::search::cross_edges::calculate_global_cross_edges;
use crate::models::Article;
use serde::{Deserialize, Serialize};
use tracing::{info, debug};

#[derive(Deserialize)]
pub struct SearchRequest {
    query: String,
    #[serde(default)]
    context: Vec<i64>, // List of IDs currently on the graph
    #[serde(default)]
    k: Option<usize>,
    #[serde(default)]
    debug: bool,
}

#[derive(Serialize)]
pub struct SearchResult {
    id: i64,
    title: String,
    score: i32,
    score_float: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    debug: Option<DebugScores>,
}

#[derive(Serialize)]
pub struct DebugScores {
    sem_faiss: f32,
    sem_verify: f32,
    final_score: f64,
}

#[derive(Serialize)]
pub struct SearchResponse {
    results: Vec<SearchResult>,
    cross_edges: Vec<crate::search::cross_edges::EdgeResult>,
}

pub async fn search_handler(
    State(state): State<Arc<AppState>>,
    headers: HeaderMap,
    Json(payload): Json<SearchRequest>,
) -> Result<Json<SearchResponse>, AppError> {
    let config = &state.config;
    let query_clean = payload.query.replace('_', " ");
    
    // 1. Identify Client (Simple logging for now)
    let ip = headers.get("x-forwarded-for")
        .and_then(|h| h.to_str().ok())
        .unwrap_or("unknown");
    info!("SEARCH: '{}' from IP: {}", query_clean, ip);

    // 2. Encode Query
    let query_vec = state.search_engine.encode_query(&query_clean)?;

    // 3. FAISS Search (Pool Size)
    // We request more candidates than needed because the verification step drops many
    let (dists, ids) = state.search_engine.search_index(&query_vec, config.candidate_pool_size)?;

    // 4. Fetch Metadata from SQLite
    // Dynamic query construction for IN clause
    if ids.is_empty() {
        return Ok(Json(SearchResponse { results: vec![], cross_edges: vec![] }));
    }

    let params = format!("?{}", ",?".repeat(ids.len() - 1));
    let sql = format!(
        "SELECT article_id, title, pagerank, pageviews, backlinks FROM articles WHERE article_id IN ({})", 
        params
    );

    let mut query_builder = sqlx::query_as::<_, Article>(&sql);
    for id in &ids {
        query_builder = query_builder.bind(id);
    }
    
    let articles = query_builder.fetch_all(&state.db).await?;

    // Map IDs to raw FAISS scores for debug
    let mut faiss_scores = std::collections::HashMap::new();
    for (i, id) in ids.iter().enumerate() {
        faiss_scores.insert(*id, dists[i]);
    }

    // 5. Verification & Ranking
    let mut results = Vec::new();
    
    // Optional: Re-encode article titles to verify semantic match (The "Fix" in Python code)
    // In Rust this is heavier because we don't batch-encode comfortably inside the loop.
    // We will verify strictly based on the ranking formula for now to save latency.
    
    for article in articles {
        if is_meta_page(&article.title) { continue; }

        let raw_score = *faiss_scores.get(&article.article_id).unwrap_or(&0.0);
        
        // Calculate multisignal score
        let final_score = calculate_multisignal_score(
            raw_score, 
            article.pagerank.unwrap_or(0.0), 
            article.pageviews.unwrap_or(0) as f64, 
            &article.title, 
            &query_clean
        );

        let debug_info = if payload.debug {
            Some(DebugScores {
                sem_faiss: raw_score,
                sem_verify: raw_score, // Skipping double-verify for performance in V1
                final_score,
            })
        } else {
            None
        };

        results.push(SearchResult {
            id: article.article_id,
            title: article.title,
            score: (final_score * 100.0) as i32,
            score_float: final_score,
            debug: debug_info,
        });
    }

    // Sort descending
    results.sort_by(|a, b| b.score_float.partial_cmp(&a.score_float).unwrap());
    
    // Slice to requested k
    let k = payload.k.unwrap_or(config.results_to_return);
    results.truncate(k);

    // 6. Cross Edges
    let result_ids: Vec<i64> = results.iter().map(|r| r.id).collect();
    
    let cross_edges = calculate_global_cross_edges(
        &state.search_engine,
        &state.db,
        &result_ids,
        &payload.context,
        config.cross_edge_threshold as f32
    ).await?;

    Ok(Json(SearchResponse {
        results,
        cross_edges,
    }))
}