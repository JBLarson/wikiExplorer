import re

def calculate_edge_distance(score):
    if not isinstance(score, (int, float)):
        return 150
    normalized_score = min(score / 25, 1.0)
    return 40 + (1 - normalized_score) * 260

def calculate_edge_strength(score):
    if not isinstance(score, (int, float)):
        return 1.0
    normalized_score = min(score / 25, 1.0)
    return 0.3 + (normalized_score * 1.7)

def normalize_node_id(title):
    return re.sub(r'\s+', '_', title.lower())