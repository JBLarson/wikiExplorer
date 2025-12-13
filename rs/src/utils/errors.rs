use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum AppError {
    #[error("Database error: {0}")]
    Database(#[from] sqlx::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Vector Search error: {0}")]
    Faiss(String), // faiss crate errors are sometimes strings or custom types

    #[error("Model error: {0}")]
    Model(#[from] rust_bert::RustBertError),

    #[error("Configuration error: {0}")]
    Config(String),

    #[error("Anyhow error: {0}")]
    Anyhow(#[from] anyhow::Error),
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            AppError::Database(e) => {
                tracing::error!("Database error: {:?}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Database Error".to_string())
            }
            AppError::Faiss(e) => {
                tracing::error!("FAISS error: {:?}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "Vector Index Error".to_string())
            }
            AppError::Model(e) => {
                tracing::error!("BERT Model error: {:?}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "ML Model Error".to_string())
            }
            _ => {
                tracing::error!("Internal error: {:?}", self);
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal Server Error".to_string())
            }
        };

        let body = Json(json!({
            "error": error_message,
            "details": format!("{:?}", self) // In prod, maybe hide this
        }));

        (status, body).into_response()
    }
}