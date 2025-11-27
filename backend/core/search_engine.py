import faiss
import sqlite3
from sentence_transformers import SentenceTransformer
from flask import current_app
from config import Config

class SearchEngine:
    def __init__(self):
        print("="*80)
        print("WIKIPEDIA SEMANTIC SEARCH API")
        print("="*80)
        
        self.config = Config()
        self._load_index()
        self._load_metadata_db()
        self._load_model()
        self._verify_signals()
        
        print("\n" + "="*80)
        print("✓ API READY")
        print("="*80)
        self._print_config()
    
    def _load_index(self):
        print("\nLoading FAISS index...")
        try:
            self.index = faiss.read_index(self.config.INDEX_PATH)
            print(f"✓ Index loaded: {self.index.ntotal} vectors")
        except Exception as e:
            print(f"CRITICAL ERROR: Could not load index at {self.config.INDEX_PATH}")
            print(f"Error details: {e}")
            self.index = faiss.IndexFlatL2(384)
        
        self._configure_index()
    
    def _configure_index(self):
        self.can_reconstruct = True
        
        try:
            base_index = self.index.index if hasattr(self.index, 'index') else self.index
            ivf_index = faiss.downcast_index(base_index)
            
            if hasattr(ivf_index, 'nprobe'):
                ivf_index.nprobe = 32
                print(f"✓ IVF index configured (nprobe={ivf_index.nprobe})")
            
            if hasattr(ivf_index, 'make_direct_map'):
                try:
                    ivf_index.make_direct_map()
                    test_vec = ivf_index.reconstruct(0)
                    self.can_reconstruct = True
                    print("✓ Direct map initialized - cross-edges enabled")
                except Exception as e:
                    print(f"⚠ Direct map initialization failed: {e}")
                    self.can_reconstruct = False
            else:
                try:
                    test_vec = base_index.reconstruct(0)
                    self.can_reconstruct = True
                    print("✓ Flat index - cross-edges enabled")
                except:
                    self.can_reconstruct = False
                    print("⚠ Reconstruction not available - cross-edges disabled")
        except Exception as e:
            print(f"ℹ Index configuration: {e}")
            try:
                test_vec = self.index.reconstruct(0)
                self.can_reconstruct = True
                print("✓ Reconstruction available")
            except:
                self.can_reconstruct = False
                print("⚠ Reconstruction not available - cross-edges disabled")
    
    def _load_metadata_db(self):
        print("\nLoading metadata database...")
        self.metadata_db = sqlite3.connect(self.config.METADATA_PATH, check_same_thread=False)
        self.metadata_db.row_factory = sqlite3.Row
    
    def _load_model(self):
        print("\nLoading sentence transformer model...")
        self.model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    
    def _verify_signals(self):
        cursor = self.metadata_db.cursor()
        try:
            cursor.execute("PRAGMA table_info(articles)")
            columns = {row[1] for row in cursor.fetchall()}
            
            self.available_signals = {
                'pagerank': 'pagerank' in columns,
                'pageviews': 'pageviews' in columns,
                'backlinks': 'backlinks' in columns
            }
        except Exception as e:
            print(f"Warning: Could not verify columns: {e}")
            self.available_signals = {'pagerank': False, 'pageviews': False, 'backlinks': False}
        
        print(f"\nAvailable signals:")
        print(f"  PageRank: {'✓' if self.available_signals['pagerank'] else '✗'}")
        print(f"  Pageviews: {'✓' if self.available_signals['pageviews'] else '✗'}")
        print(f"  Backlinks: {'✓' if self.available_signals['backlinks'] else '✗'}")
        print(f"  Cross-edges: {'✓' if self.can_reconstruct else '✗'}")
    
    def _print_config(self):
        print(f"\nRanking weights:")
        print(f"  Semantic similarity: {self.config.WEIGHT_SEMANTIC:.0%}")
        print(f"  PageRank (importance): {self.config.WEIGHT_PAGERANK:.0%}")
        print(f"  Pageviews (popularity): {self.config.WEIGHT_PAGEVIEWS:.0%}")
        print(f"  Title match: {self.config.WEIGHT_TITLE_MATCH:.0%}")
        print()