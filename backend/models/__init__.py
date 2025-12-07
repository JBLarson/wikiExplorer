from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy import Index
import uuid

db = SQLAlchemy()

class PublicSearch(db.Model):
    __tablename__ = 'public_searches'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    search_query = db.Column(db.Text, nullable=False, unique=True)
    graph_data = db.Column(JSONB)
    search_count = db.Column(db.Integer, default=1)
    last_searched_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # New fields
    ip_addresses = db.Column(JSONB, default=list)  # Store array of IPs that searched this
    user_agents = db.Column(JSONB, default=list)   # Store array of user agents
    last_ip = db.Column(db.String(45))             # Most recent IP (for quick filtering)
    
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

class CachedEdge(db.Model):
    """
    Stores pre-computed semantic relationships between nodes.
    We enforce source_id < target_id to handle undirected edges efficiently.
    """
    __tablename__ = 'cached_edges'

    source_id = db.Column(db.Integer, nullable=False)
    target_id = db.Column(db.Integer, nullable=False)
    score = db.Column(db.Float, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Composite Primary Key
    __table_args__ = (
        db.PrimaryKeyConstraint('source_id', 'target_id'),
        Index('idx_edge_lookup', 'source_id', 'target_id'),
        # Useful for cleaning up old edges or sorting by relevance
        Index('idx_edge_score', 'score'),
    )

    def __repr__(self):
        return f'<Edge {self.source_id}-{self.target_id}: {self.score}>'