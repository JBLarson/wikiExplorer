import os
import platform

class Config:
    # Database
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
    }
    
    # Search weights
    WEIGHT_SEMANTIC = 0.30
    WEIGHT_PAGERANK = 0.50
    WEIGHT_PAGEVIEWS = 0.15
    WEIGHT_TITLE_MATCH = 0.05
    
    # Search parameters
    CROSS_EDGE_THRESHOLD = 0.65
    EPSILON = 1e-8
    
    # CRITICAL FIX: Increased from 200 to 1000.
    # This ensures "Linear Algebra" (which might be semantically distant) 
    # gets fetched into the pool so it can be boosted by its high PageRank.
    CANDIDATE_POOL_SIZE = 1000
    
    RESULTS_TO_RETURN = 60
    
    # File paths
    if platform.system() == "Darwin":
        INDEX_PATH = "data/index.faiss"
        METADATA_PATH = "data/metadata.db"
    else:
        INDEX_PATH = "/opt/we/data/index.faiss"
        METADATA_PATH = "/opt/we/data/metadata.db"