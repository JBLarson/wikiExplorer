use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use chrono::NaiveDateTime;

#[derive(Debug, Serialize, FromRow)]
pub struct Article {
    pub article_id: i64,
    pub title: String,
    pub pagerank: Option<f64>,
    pub pageviews: Option<i64>,
    pub backlinks: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct User {
    pub id: Uuid,
    pub ip_address: String,
    pub user_agent: Option<String>,
    pub fingerprint: String,
    pub created_at: NaiveDateTime,
    pub last_seen: NaiveDateTime,
    pub total_searches: i32,
    pub edges_discovered: i32,
}

#[derive(Debug, Serialize, FromRow)]
pub struct CachedEdge {
    pub source_id: i64,
    pub target_id: i64,
    pub score: f64,
    pub created_at: NaiveDateTime,
    pub model_version: String,
    pub created_by_user_id: Option<Uuid>,
}
