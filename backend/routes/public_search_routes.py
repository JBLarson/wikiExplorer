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
    
    ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
    if ip_address and ',' in ip_address:
        ip_address = ip_address.split(',')[0].strip()
    
    user_agent = request.headers.get('User-Agent', 'Unknown')
    
    try:
        existing = PublicSearch.query.filter_by(search_query=query).first()
        
        if existing:
            existing.search_count += 1
            existing.last_searched_at = datetime.utcnow()
            existing.last_ip = ip_address
            if graph_data:
                existing.graph_data = graph_data
            
            if existing.ip_addresses is None:
                existing.ip_addresses = []
            if existing.user_agents is None:
                existing.user_agents = []
                
            if ip_address not in existing.ip_addresses:
                existing.ip_addresses = existing.ip_addresses + [ip_address]
            if user_agent not in existing.user_agents:
                existing.user_agents = existing.user_agents + [user_agent]
                
            db.session.commit()
            return jsonify(existing.to_dict())
        else:
            new_search = PublicSearch(
                search_query=query,
                graph_data=graph_data,
                search_count=1,
                last_ip=ip_address,
                ip_addresses=[ip_address],
                user_agents=[user_agent]
            )
            db.session.add(new_search)
            db.session.commit()
            return jsonify(new_search.to_dict()), 201
            
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


@public_search_bp.route('/searches/by-ip/<ip>', methods=['GET'])
def get_searches_by_ip(ip):
    """Admin endpoint to see all searches from a specific IP"""
    searches = PublicSearch.query.filter(
        PublicSearch.ip_addresses.contains([ip])
    ).order_by(PublicSearch.last_searched_at.desc()).all()
    
    return jsonify({
        'ip': ip,
        'total_searches': len(searches),
        'queries': [s.to_dict() for s in searches]
    })

@public_search_bp.route('/searches/stats', methods=['GET'])
def get_search_stats():
    """Admin endpoint for abuse detection"""
    from sqlalchemy import func
    
    # Get IPs with most searches
    heavy_users = db.session.query(
        PublicSearch.last_ip,
        func.sum(PublicSearch.search_count).label('total')
    ).group_by(PublicSearch.last_ip).order_by(func.sum(PublicSearch.search_count).desc()).limit(20).all()
    
    return jsonify({
        'top_ips': [{'ip': ip, 'search_count': total} for ip, total in heavy_users]
    })