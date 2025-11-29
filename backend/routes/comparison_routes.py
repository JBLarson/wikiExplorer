# backend/routes/comparison_routes.py
from flask import Blueprint, jsonify, request
from collections import defaultdict

comparison_bp = Blueprint('comparison', __name__)

@comparison_bp.route('/api/compare', methods=['POST'])
def compare_graphs():
    """
    Compare statistics across multiple graph explorations.
    
    Request body:
    {
      "graphs": [
        {"article": "Machine Learning", "expansions": 3},
        {"article": "Quantum Computing", "expansions": 2},
        ...
      ]
    }
    """
    data = request.json
    graphs = data.get('graphs', [])
    
    if not graphs or len(graphs) > 12:
        return jsonify({"error": "Provide 1-12 graphs"}), 400
    
    results = []
    
    for graph_spec in graphs:
        article = graph_spec.get('article')
        max_expansions = graph_spec.get('expansions', 1)
        
        if not article:
            continue
            
        # Simulate exploration to specified depth
        stats = simulate_graph_exploration(article, max_expansions)
        results.append({
            "root_article": article,
            "expansions_requested": max_expansions,
            **stats
        })
    
    return jsonify({
        "graphs": results,
        "comparison": generate_comparison_metrics(results)
    })


def simulate_graph_exploration(root_article: str, max_expansions: int):
    """
    Simulate graph building to calculate statistics without storing full graph.
    Returns aggregated metrics.
    """
    from core.search_engine import search_engine
    from core.ranking import is_meta_page
    import numpy as np
    
    # Track nodes and edges
    nodes = {}  # id -> {title, depth, edges}
    edges = set()  # (source, target) tuples
    to_expand = [(root_article, 0, 0)]  # (title, depth, expansion_count)
    expanded = set()
    
    cursor = search_engine.metadata_db.cursor()
    
    while to_expand:
        current_title, depth, exp_count = to_expand.pop(0)
        node_id = current_title.lower().replace(' ', '_')
        
        if node_id in expanded:
            continue
            
        # Get related articles
        try:
            response = requests.get(
                f"http://localhost:5001/api/related/{current_title}",
                params={"k": 7, "private": "true"}
            )
            related = response.json().get('results', [])
        except:
            continue
        
        # Add node
        if node_id not in nodes:
            nodes[node_id] = {
                "title": current_title,
                "depth": depth,
                "outgoing": 0,
                "incoming": 0,
                "expansion_count": 0,
            }
        
        nodes[node_id]["expansion_count"] += 1
        
        # Add edges and child nodes
        for rel in related:
            child_title = rel['title']
            child_id = child_title.lower().replace(' ', '_')
            
            # Add edge
            edge = (node_id, child_id)
            if edge not in edges:
                edges.add(edge)
                nodes[node_id]["outgoing"] += 1
                
                # Initialize child node
                if child_id not in nodes:
                    nodes[child_id] = {
                        "title": child_title,
                        "depth": depth + 1,
                        "outgoing": 0,
                        "incoming": 0,
                        "expansion_count": 0,
                    }
                
                nodes[child_id]["incoming"] += 1
                
                # Queue for expansion if within limits
                if (exp_count < max_expansions and 
                    child_id not in expanded and
                    depth + 1 <= max_expansions):
                    to_expand.append((child_title, depth + 1, exp_count + 1))
        
        expanded.add(node_id)
    
    # Calculate neighbor connectivity
    for node_id, node_data in nodes.items():
        neighbor_conn = 0
        for edge in edges:
            if edge[0] == node_id:
                neighbor_id = edge[1]
                neighbor_conn += nodes[neighbor_id]["outgoing"] + nodes[neighbor_id]["incoming"]
            elif edge[1] == node_id:
                neighbor_id = edge[0]
                neighbor_conn += nodes[neighbor_id]["outgoing"] + nodes[neighbor_id]["incoming"]
        node_data["neighbor_connectivity"] = neighbor_conn
    
    # Build ranked results
    ranked_nodes = sorted(
        [
            {
                "rank": idx + 1,
                "article": data["title"],
                "depth": data["depth"],
                "total_edges": data["outgoing"] + data["incoming"],
                "outgoing": data["outgoing"],
                "incoming": data["incoming"],
                "neighbor_connectivity": data["neighbor_connectivity"],
                "expansions": data["expansion_count"],
            }
            for idx, (node_id, data) in enumerate(
                sorted(
                    nodes.items(),
                    key=lambda x: x[1]["outgoing"] + x[1]["incoming"],
                    reverse=True
                )
            )
        ],
        key=lambda x: x["total_edges"],
        reverse=True
    )
    
    total_nodes = len(nodes)
    total_edges = len(edges)
    avg_edges = (total_edges * 2) / total_nodes if total_nodes > 0 else 0
    max_depth = max([n["depth"] for n in nodes.values()]) if nodes else 0
    
    return {
        "total_nodes": total_nodes,
        "total_edges": total_edges,
        "avg_edges_per_node": round(avg_edges, 1),
        "max_depth": max_depth,
        "nodes": ranked_nodes,
    }


def generate_comparison_metrics(results):
    """Generate cross-graph comparison insights."""
    if len(results) < 2:
        return {}
    
    # Find common articles
    all_articles = [set(n["article"] for n in r["nodes"]) for r in results]
    common = set.intersection(*all_articles) if all_articles else set()
    
    # Density comparison
    densities = [
        r["total_edges"] / r["total_nodes"] if r["total_nodes"] > 0 else 0
        for r in results
    ]
    
    return {
        "common_articles": list(common),
        "common_count": len(common),
        "density_comparison": {
            "min": round(min(densities), 2),
            "max": round(max(densities), 2),
            "avg": round(sum(densities) / len(densities), 2),
        },
        "node_count_range": {
            "min": min(r["total_nodes"] for r in results),
            "max": max(r["total_nodes"] for r in results),
        },
    }