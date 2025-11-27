from flask import Blueprint, jsonify, request
from datetime import datetime
from models import db, PublicSearch
from sqlalchemy.exc import IntegrityError

public_search_bp = Blueprint('public_search', __name__)

@public_search_bp.route('/searches/public', methods=['POST'])
def save_public_search():
    data = request.json
    query = data.get('query')
    graph_data = data.get('graph_data')
    
    if not query:
        return jsonify({'error': 'Query required'}), 400
    
    try:
        existing = PublicSearch.query.filter_by(query=query).first()
        
        if existing:
            existing.search_count += 1
            existing.last_searched_at = datetime.utcnow()
            if graph_data:
                existing.graph_data = graph_data
            db.session.commit()
            return jsonify(existing.to_dict())
        else:
            new_search = PublicSearch(
                query=query,
                graph_data=graph_data,
                search_count=1
            )
            db.session.add(new_search)
            db.session.commit()
            return jsonify(new_search.to_dict()), 201
            
    except IntegrityError:
        db.session.rollback()
        existing = PublicSearch.query.filter_by(query=query).first()
        if existing:
            existing.search_count += 1
            existing.last_searched_at = datetime.utcnow()
            db.session.commit()
            return jsonify(existing.to_dict())
        return jsonify({'error': 'Database error'}), 500
    except Exception as e:
        db.session.rollback()
        print(f"Error saving search: {e}")
        return jsonify({'error': 'Failed to save search'}), 500

@public_search_bp.route('/searches/public', methods=['GET'])
def get_public_searches():
    sort_by = request.args.get('sort', 'recent')
    limit = int(request.args.get('limit', 20))
    
    if sort_by == 'popular':
        searches = PublicSearch.query.order_by(PublicSearch.search_count.desc()).limit(limit).all()
    else:
        searches = PublicSearch.query.order_by(PublicSearch.last_searched_at.desc()).limit(limit).all()
    
    return jsonify([s.to_dict() for s in searches])