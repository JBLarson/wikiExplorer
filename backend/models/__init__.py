from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy import Index
import uuid

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Identification
    ip_address = db.Column(db.String(45), nullable=False)
    user_agent = db.Column(db.Text, nullable=True)
    fingerprint = db.Column(db.String(64), unique=True, nullable=False, index=True)
    
    # Activity Stats
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_seen = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Contribution Counters (Denormalized for speed)
    total_searches = db.Column(db.Integer, default=0)
    edges_discovered = db.Column(db.Integer, default=0)

    # Relationships
    edges = db.relationship('CachedEdge', backref='discoverer', lazy='dynamic')

    def __repr__(self):
        return f'<User {self.fingerprint[:8]}...>'

class CachedEdge(db.Model):
    """
    Stores pre-computed semantic relationships between nodes.
    Includes provenance data (who found it, which model validated it).
    """
    __tablename__ = 'cached_edges'

    source_id = db.Column(db.Integer, nullable=False)
    target_id = db.Column(db.Integer, nullable=False)
    score = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Provenance
    model_version = db.Column(db.String(50), default="all-MiniLM-L6-v2", nullable=False)
    created_by_user_id = db.Column(UUID(as_uuid=True), db.ForeignKey('users.id'), nullable=True)

    # Composite Primary Key & Indexes
    __table_args__ = (
        db.PrimaryKeyConstraint('source_id', 'target_id'),
        Index('idx_edge_lookup', 'source_id', 'target_id'),
        Index('idx_edge_score', 'score'),
        Index('idx_edge_provenance', 'created_by_user_id', 'model_version')
    )

    def __repr__(self):
        return f'<Edge {self.source_id}-{self.target_id}: {self.score}>'

class PublicSearch(db.Model):
    __tablename__ = 'public_searches'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    search_query = db.Column(db.Text, nullable=False, unique=True)
    graph_data = db.Column(JSONB)
    search_count = db.Column(db.Integer, default=1)
    last_searched_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Analytics
    ip_addresses = db.Column(JSONB, default=list)
    user_agents = db.Column(JSONB, default=list)
    last_ip = db.Column(db.String(45))
    
    def __repr__(self):
        return f'<PublicSearch {self.search_query}>'
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'query': self.search_query,
            'graph_data': self.graph_data,
            'search_count': self.search_count,
            'last_searched_at': self.last_searched_at.isoformat(),
            'created_at': self.created_at.isoformat()
        }