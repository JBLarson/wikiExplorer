#!/usr/bin/env python3
from flask import Flask
from flask_cors import CORS
from flask_migrate import Migrate
from dotenv import load_dotenv
import platform
import os

from models import db
from config import Config
from core.search_engine import SearchEngine
from routes.search_routes import search_bp
from routes.public_search_routes import public_search_bp
from routes.health_routes import health_bp
from routes.comparison_routes import comparison_bp


load_dotenv()
os.environ["TOKENIZERS_PARALLELISM"] = "false"

app = Flask(__name__)
app.config.from_object(Config)


# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_pre_ping': True,
    'pool_recycle': 300,
}


# Initialize database
db.init_app(app)
migrate = Migrate(app, db)


with app.app_context():
    db.create_all()
    print("✓ SQLAlchemy tables created/verified")

# CORS
CORS(app, origins=[
    "https://wikiexplorer.org",
    "https://api.wikiexplorer.org",
    "http://wikiexplorer.org",
    "http://api.wikiexplorer.org",
    "http://localhost:5173",
    "http://localhost:5000"
], supports_credentials=False, 
   allow_headers=["Content-Type"],
   methods=["GET", "POST", "OPTIONS"])

# Initialize search engine
search_engine = SearchEngine()
app.search_engine = search_engine

# Register blueprints
app.register_blueprint(search_bp, url_prefix='/api')
app.register_blueprint(public_search_bp, url_prefix='/api')
app.register_blueprint(health_bp, url_prefix='/api')
app.register_blueprint(comparison_bp, url_prefix='/api')

if __name__ == '__main__':
    is_dev = platform.system() == "Darwin"
    if is_dev:  app.run(port=5001, debug=True, threaded=True)

    else:    
        app.run(
            host='0.0.0.0',
            port=5001,
            debug=False,
            threaded=True
        )