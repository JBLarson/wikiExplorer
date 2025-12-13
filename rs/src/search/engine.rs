use crate::config::get_config;
use crate::utils::errors::AppError;
use faiss::{index_factory, Index, MetricType};
use parking_lot::Mutex;
use rust_bert::pipelines::sentence_embeddings::{
    SentenceEmbeddingsBuilder, SentenceEmbeddingsModel, SentenceEmbeddingsModelType,
};
use std::path::Path;
use std::sync::Arc;
use tracing::{info, warn};

pub struct SearchEngine {
    // Wrapped in Mutex because `faiss` crate search requires mutable reference
    // strictly speaking, FAISS C++ allows concurrent searches, but the rust wrapper enforces ownership
    pub index: Mutex<Box<dyn Index>>, 
    pub model: Arc<SentenceEmbeddingsModel>,
    pub can_reconstruct: bool,
    pub available_signals: AvailableSignals,
}

#[derive(Debug, Clone, Default)]
pub struct AvailableSignals {
    pub pagerank: bool,
    pub pageviews: bool,
    pub backlinks: bool,
}

impl SearchEngine {
    pub fn new() -> Result<Self, AppError> {
        let config = get_config();
        
        info!("================================================================================");
        info!("WIKIPEDIA SEMANTIC SEARCH API (Rust Backend)");
        info!("================================================================================");

        // 1. Load Model
        // This will download "all-MiniLM-L6-v2" automatically if not present in cache
        info!("Loading sentence transformer model (all-MiniLM-L6-v2)...");
        let model = SentenceEmbeddingsBuilder::remote(SentenceEmbeddingsModelType::AllMiniLmL6V2)
            .create_model()
            .map_err(AppError::Model)?;
        
        // 2. Load FAISS Index
        info!("Loading FAISS index from {}...", config.index_path);
        let index_result = faiss::read_index(&config.index_path);
        
        let index: Box<dyn Index> = match index_result {
            Ok(idx) => {
                info!("✓ Index loaded: {} vectors", idx.ntotal());
                idx
            }
            Err(e) => {
                warn!("CRITICAL ERROR: Could not load index: {:?}", e);
                warn!("Falling back to empty FlatL2 index");
                // Create a dummy index if file missing (prevents crash, matches Python fallback logic)
                index_factory(384, "Flat", MetricType::L2)
                    .map_err(|e| AppError::Faiss(format!("{:?}", e)))?
            }
        };

        // 3. Configure/Check capabilities
        // We try to reconstruct vector 0 to see if the index supports reconstruction (needed for cross-edges)
        let can_reconstruct = match index.reconstruct(0) {
            Ok(_) => {
                info!("✓ Direct map initialized - cross-edges enabled");
                true
            }
            Err(_) => {
                warn!("⚠ Reconstruction not available - cross-edges disabled");
                false
            }
        };

        Ok(Self {
            index: Mutex::new(index),
            model: Arc::new(model),
            can_reconstruct,
            available_signals: AvailableSignals::default(), // Will be updated by state init
        })
    }

    pub fn encode_query(&self, query: &str) -> Result<Vec<f32>, AppError> {
        let clean_query = query.replace('_', " ");
        let embeddings = self.model.encode(&[clean_query]).map_err(AppError::Model)?;
        
        // rust-bert returns Vec<Vec<f32>>, we just want the first one
        embeddings.into_iter().next().ok_or_else(|| AppError::Model(
            rust_bert::RustBertError::InvalidInput("No embedding generated".to_string())
        ))
    }

    pub fn search_index(&self, query_vec: &[f32], k: usize) -> Result<(Vec<f32>, Vec<i64>), AppError> {
        let mut index = self.index.lock(); // Lock for query
        
        // faiss::Index::search returns (distances, labels)
        // labels are i64 (indices), distances are f32
        let result = index.search(query_vec, k as usize)
            .map_err(|e| AppError::Faiss(format!("{:?}", e)))?;
            
        Ok((
            result.distances,
            result.labels.into_iter().map(|l| l.get_u64() as i64).collect()
        ))
    }

    /// Used for cross-edges: Reconstructs a vector for a given ID
    pub fn reconstruct(&self, id: i64) -> Result<Vec<f32>, AppError> {
        let index = self.index.lock();
        index.reconstruct(id as u64)
            .map_err(|e| AppError::Faiss(format!("{:?}", e)))
    }
}