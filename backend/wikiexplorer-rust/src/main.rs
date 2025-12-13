use axum::{
    routing::{get, post},
    Json, Router,
    extract::State,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use tracing::info;
use sqlx::SqlitePool;

// ============================================================================
// TYPES
// ============================================================================

#[derive(Debug, Serialize)]
struct HealthResponse {
    status: String,
    index_path: String,
    metadata_path: String,
    total_articles: i64,
    index_total_vectors: i64,
    nprobe: String,
    ranking_weights: RankingWeights,
    connectivity: Connectivity,
    available_signals: AvailableSignals,
    signal_coverage: SignalCoverage,
    candidate_pool_size: usize,
    default_results: usize,
}

#[derive(Debug, Serialize)]
struct RankingWeights {
    semantic: f64,
    pagerank: f64,
    pageviews: f64,
    title_match: f64,
}

#[derive(Debug, Serialize)]
struct Connectivity {
    threshold: f64,
    enabled: bool,
}

#[derive(Debug, Serialize)]
struct AvailableSignals {
    pagerank: bool,
    pageviews: bool,
    backlinks: bool,
}

#[derive(Debug, Serialize)]
struct SignalCoverage {
    pagerank: i64,
    pageviews: i64,
    backlinks: i64,
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
// CONFIG
// ============================================================================

struct Config {
    weight_semantic: f64,
    weight_pagerank: f64,
    weight_pageviews: f64,
    weight_title_match: f64,
    cross_edge_threshold: f64,
    candidate_pool_size: usize,
    results_to_return: usize,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            weight_semantic: 0.30,
            weight_pagerank: 0.50,
            weight_pageviews: 0.15,
            weight_title_match: 0.05,
            cross_edge_threshold: 0.65,
            candidate_pool_size: 1000,
            results_to_return: 60,
        }
    }
}

// ============================================================================
// APPLICATION STATE
// ============================================================================

struct AppState {
    index_path: String,
    metadata_path: String,
    db_pool: SqlitePool,
    config: Config,
    total_vectors: i64,
}

// ============================================================================
// HANDLERS
// ============================================================================

async fn health_check(State(state): State<Arc<AppState>>) -> Json<HealthResponse> {
    info!("Health check requested");
    
    // Query total articles
    let total_articles: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM articles")
        .fetch_one(&state.db_pool)
        .await
        .unwrap_or((0,));
    
    // Check signal coverage
    let pagerank_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM articles WHERE pagerank > 0")
        .fetch_one(&state.db_pool)
        .await
        .unwrap_or((0,));
    
    let pageviews_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM articles WHERE pageviews > 0")
        .fetch_one(&state.db_pool)
        .await
        .unwrap_or((0,));
    
    let backlinks_count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM articles WHERE backlinks > 0")
        .fetch_one(&state.db_pool)
        .await
        .unwrap_or((0,));
    
    Json(HealthResponse {
        status: "ok".to_string(),
        index_path: state.index_path.clone(),
        metadata_path: state.metadata_path.clone(),
        total_articles: total_articles.0,
        index_total_vectors: state.total_vectors,
        nprobe: "32".to_string(),
        ranking_weights: RankingWeights {
            semantic: state.config.weight_semantic,
            pagerank: state.config.weight_pagerank,
            pageviews: state.config.weight_pageviews,
            title_match: state.config.weight_title_match,
        },
        connectivity: Connectivity {
            threshold: state.config.cross_edge_threshold,
            enabled: true,
        },
        available_signals: AvailableSignals {
            pagerank: true,
            pageviews: true,
            backlinks: true,
        },
        signal_coverage: SignalCoverage {
            pagerank: pagerank_count.0,
            pageviews: pageviews_count.0,
            backlinks: backlinks_count.0,
        },
        candidate_pool_size: state.config.candidate_pool_size,
        default_results: state.config.results_to_return,
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
// MAIN
// ============================================================================

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize logging
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
    
    // Determine paths based on OS
    let (index_path, metadata_path) = if cfg!(target_os = "macos") {
        (
            "../data/index.faiss".to_string(),
            "../data/metadata.db".to_string(),
        )
    } else {
        (
            "/opt/we/data/index.faiss".to_string(),
            "/opt/we/data/metadata.db".to_string(),
        )
    };
    
    info!("Loading metadata database from: {}", metadata_path);
    
    // Connect to SQLite
    let db_pool = SqlitePool::connect(&format!("sqlite:{}", metadata_path))
        .await?;
    
    info!("✓ Database connected");
    
    // Get total vectors (we'll load FAISS properly next)
    let total_vectors: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM articles")
        .fetch_one(&db_pool)
        .await?;
    
    info!("✓ Found {} articles in metadata", total_vectors.0);
    
    // Application state
    let state = Arc::new(AppState {
        index_path: index_path.clone(),
        metadata_path: metadata_path.clone(),
        db_pool,
        config: Config::default(),
        total_vectors: total_vectors.0,
    });

    // Build router
    let app = Router::new()
        .route("/api/health", get(health_check))
        .route("/api/related", post(search))
        .layer(CorsLayer::permissive())
        .with_state(state);

    // Start server
    let addr = "0.0.0.0:5002";  // Changed to 5002 so it doesn't conflict with Flask
    info!("");
    info!("{}", separator);
    info!("🚀 API READY - Server listening on {}", addr);
    info!("{}", separator);
    
    let listener = tokio::net::TcpListener::bind(addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}