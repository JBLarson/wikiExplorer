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
    WEIGHT_SEMANTIC = 0.50
    WEIGHT_PAGERANK = 0.40
    WEIGHT_PAGEVIEWS = 0.05
    WEIGHT_TITLE_MATCH = 0.05
    
    # Search parameters
    CROSS_EDGE_THRESHOLD = 0.65
    EPSILON = 1e-8
    CANDIDATE_POOL_SIZE = 200
    RESULTS_TO_RETURN = 32
    
    # File paths
    if platform.system() == "Darwin":
        INDEX_PATH = "data/index.faiss"
        METADATA_PATH = "data/metadata.db"
    else:
        INDEX_PATH = "/opt/wikiexplorer/data/index.faiss"
        METADATA_PATH = "/opt/wikiexplorer/data/metadata.db"