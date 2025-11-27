from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid

db = SQLAlchemy()

class PublicSearch(db.Model):
    __tablename__ = 'public_searches'
    
    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    query = db.Column(db.Text, nullable=False, unique=True)
    graph_data = db.Column(JSONB)
    search_count = db.Column(db.Integer, default=1)
    last_searched_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<PublicSearch {self.query}>'
    
    def to_dict(self):
        return {
            'id': str(self.id),
            'query': self.query,
            'graph_data': self.graph_data,
            'search_count': self.search_count,
            'last_searched_at': self.last_searched_at.isoformat(),
            'created_at': self.created_at.isoformat()
        }