import math
import re
from config import Config

config = Config()

def normalize_pagerank(pagerank_score):
    if pagerank_score is None or pagerank_score <= 0:
        return 0.0
    # CHANGED: Removed the ** 0.8 smoothing. 
    # We want a linear or stricter curve to punish low-authority pages more heavily.
    normalized = pagerank_score / 100.0
    return normalized

def normalize_pageviews(pageview_count):
    if pageview_count is None or pageview_count < 1:
        return 0.0
    
    # Log scale is good, but let's shift the floor.
    # Articles with < 100 views/month are usually noise.
    if pageview_count < 100:
        return 0.1

    min_log = 2.0 # 100 views
    max_log = 7.0 # 10M views
    
    log_val = math.log10(pageview_count)
    score = (log_val - min_log) / (max_log - min_log)
    return min(1.0, max(0.0, score))

def calculate_title_match_score(title: str, query: str) -> float:
    title_lower = title.lower().replace('_', ' ')
    query_lower = query.lower()
    
    title_words = set(title_lower.split())
    query_words = set(query_lower.split())
    
    if not title_words:
        return 0.0
    
    intersection = len(title_words & query_words)
    union = len(title_words | query_words)
    
    if union == 0:
        return 0.0
    
    base_score = intersection / union
    
    if title_lower == query_lower:
        return 1.0
    elif title_lower.startswith(query_lower) or query_lower in title_lower:
        base_score = min(1.0, base_score * 1.5)
    
    if " in " in title_lower:
        parts = title_lower.split(" in ")
        if len(parts) == 2:
            place_indicators = [
                "africa", "asia", "europe", "america", "states", "kingdom",
                "china", "india", "russia", "france", "germany", "japan",
                "canada", "australia", "brazil", "mexico", "italy", "spain",
                "california", "texas", "york", "london", "paris", "tokyo"
            ]
            if any(place in parts[1] for place in place_indicators):
                base_score *= 0.5
    
    if re.match(r'^\d{4}', title_lower):
        base_score *= 0.4
    
    meta_prefixes = ["list of", "index of", "glossary of", "timeline of", 
                     "outline of", "history of", "bibliography of"]
    if any(title_lower.startswith(prefix) for prefix in meta_prefixes):
        base_score *= 0.1 # Heavily penalize lists
    
    return min(1.0, max(0.0, base_score))

def is_meta_page(title):
    lower = title.lower()
    bad_prefixes = [
        'wikipedia:', 'template:', 'category:', 'portal:', 'help:', 
        'user:', 'talk:', 'file:', 'mediawiki:', 'draft:'
    ]
    return any(lower.startswith(p) for p in bad_prefixes) or '(disambiguation)' in lower

def calculate_multisignal_score(semantic_similarity, pagerank_score, pageview_count, title, query):
    sem_norm = float(semantic_similarity)
    pr_norm = normalize_pagerank(pagerank_score)
    pv_norm = normalize_pageviews(pageview_count)
    title_norm = calculate_title_match_score(title, query)
    
    sem_norm = max(sem_norm, config.EPSILON)
    pr_norm = max(pr_norm, config.EPSILON)
    pv_norm = max(pv_norm, config.EPSILON)
    title_norm = max(title_norm, config.EPSILON)
    
    # Geometric Mean
    score = (
        (sem_norm ** config.WEIGHT_SEMANTIC) *
        (pr_norm ** config.WEIGHT_PAGERANK) *
        (pv_norm ** config.WEIGHT_PAGEVIEWS) *
        (title_norm ** config.WEIGHT_TITLE_MATCH)
    )
    
    # OBSCURITY PENALTY:
    # If an article is semantically relevant but has near-zero popularity,
    # crush its score to prevent "random bullshit" from appearing.
    if pv_norm < 0.2 and pr_norm < 0.1:
        score *= 0.5

    return score