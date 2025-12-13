use std::env;
use std::sync::OnceLock;

#[derive(Debug, Clone)]
pub struct Config {
    // Database
    pub database_url: String,

    // Weights
    pub weight_semantic: f64,
    pub weight_pagerank: f64,
    pub weight_pageviews: f64,
    pub weight_title_match: f64,

    // Search Params
    pub cross_edge_threshold: f64,
    pub epsilon: f64,
    pub candidate_pool_size: usize,
    pub results_to_return: usize,

    // Paths
    pub index_path: String,
    pub metadata_path: String,
}

impl Config {
    pub fn load() -> Self {
        // We use typical defaults from your python config if env vars are missing
        let is_macos = cfg!(target_os = "macos");
        
        let default_index = if is_macos { "../data/index.faiss" } else { "/opt/we/data/index.faiss" };
        let default_meta = if is_macos { "../data/metadata.db" } else { "/opt/we/data/metadata.db" };

        Self {
            database_url: env::var("DATABASE_URL").expect("DATABASE_URL must be set"),
            
            weight_semantic: 0.30,
            weight_pagerank: 0.50,
            weight_pageviews: 0.15,
            weight_title_match: 0.05,
            
            cross_edge_threshold: 0.65,
            epsilon: 1e-8,
            
            candidate_pool_size: 1000,
            results_to_return: 60,
            
            index_path: env::var("INDEX_PATH").unwrap_or_else(|_| default_index.to_string()),
            metadata_path: env::var("METADATA_PATH").unwrap_or_else(|_| default_meta.to_string()),
        }
    }
}

pub static CONFIG: OnceLock<Config> = OnceLock::new();

pub fn get_config() -> &'static Config {
    CONFIG.get_or_init(Config::load)
}