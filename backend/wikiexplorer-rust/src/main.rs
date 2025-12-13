use axum::{
    routing::{get, post},
    Json, Router,
    extract::State,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use tracing::info;

// ============================================================================
// TYPES (replacing your Flask models)
// ============================================================================

#[derive(Debug, Serialize)]
struct HealthResponse {
    status: String,
    index_path: String,
    total_vectors: usize,
}

#[derive(Debug, Deserialize)]
struct SearchRequest {
    query: String,
    context: Option<Vec<i64>>,
    k: Option<usize>,
}

#[derive(Debug, Serialize)]
struct SearchResponse {
    results: Vec<SearchResult>,
    cross_edges: Vec<CrossEdge>,
}

#[derive(Debug, Serialize)]
struct SearchResult {
    title: String,
    score: i32,
}

#[derive(Debug, Serialize)]
struct CrossEdge {
    source: String,
    target: String,
    score: f32,
}

// ============================================================================
// APPLICATION STATE (replacing current_app.search_engine)
// ============================================================================

struct AppState {
    index_path: String,
    metadata_path: String,
    // We'll add SearchEngine here once we build it
}

// ============================================================================
// HANDLERS (replacing Flask routes)
// ============================================================================

async fn health_check(State(state): State<Arc<AppState>>) -> Json<HealthResponse> {
    info!("Health check requested");
    
    Json(HealthResponse {
        status: "ok".to_string(),
        index_path: state.index_path.clone(),
        total_vectors: 0, // Placeholder
    })
}

async fn search(
    State(_state): State<Arc<AppState>>,
    Json(payload): Json<SearchRequest>,
) -> Json<SearchResponse> {
    info!("Search request: query={}", payload.query);
    
    // Placeholder response
    Json(SearchResponse {
        results: vec![
            SearchResult {
                title: "Test Result".to_string(),
                score: 100,
            }
        ],
        cross_edges: vec![],
    })
}

// ============================================================================
// MAIN (replacing app.py)
// ============================================================================

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize logging (replaces your console.py colors)
    tracing_subscriber::fmt()
        .with_target(false)
        .compact()
        .init();

    let separator = "=".repeat(80);
    info!("{}", separator);
    info!("WIKIPEDIA SEMANTIC SEARCH API (Rust Edition)");
    info!("{}", separator);

    // Load environment
    dotenvy::dotenv().ok();
    
    // Application state
    let state = Arc::new(AppState {
        index_path: std::env::var("INDEX_PATH")
            .unwrap_or_else(|_| "data/index.faiss".to_string()),
        metadata_path: std::env::var("METADATA_PATH")
            .unwrap_or_else(|_| "data/metadata.db".to_string()),
    });

    // Build router (replaces Flask blueprints)
    let app = Router::new()
        .route("/api/health", get(health_check))
        .route("/api/related", post(search))
        .layer(CorsLayer::permissive())  // Configure properly later
        .with_state(state);

    // Start server
    let addr = "0.0.0.0:5001";
    info!("🚀 Server starting on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}