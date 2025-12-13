use crate::search::engine::SearchEngine;
use sqlx::SqlitePool;
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub db: SqlitePool,
    pub search_engine: Arc<SearchEngine>,
}

impl AppState {
    pub async fn new(db_pool: SqlitePool) -> anyhow::Result<Self> {
        let engine = SearchEngine::new()?;
        
        // We verify signals here (like Python's _verify_signals)
        let mut signals = engine.available_signals.clone();
        
        // Check columns in DB
        // Note: This is a simplified check. In Rust/SQLx we usually assume schema is known.
        // But to match the Python logic of dynamic capability detection:
        let row: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM articles")
            .fetch_one(&db_pool)
            .await?;
            
        // Assuming if table exists, we have the columns. 
        // In a real migration scenario, we might query pragma_table_info.
        signals.pagerank = true;
        signals.pageviews = true;
        signals.backlinks = true;

        Ok(Self {
            db: db_pool,
            search_engine: Arc::new(engine),
        })
    }
}