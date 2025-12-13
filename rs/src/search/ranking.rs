use crate::config::get_config;
use regex::Regex;
use std::collections::HashSet;
use std::sync::OnceLock;

// Pre-compiled regex for performance
static YEAR_REGEX: OnceLock<Regex> = OnceLock::new();

fn get_year_regex() -> &'static Regex {
    YEAR_REGEX.get_or_init(|| Regex::new(r"^\d{4}").unwrap())
}

pub fn normalize_pagerank(pagerank_score: Option<f64>) -> f64 {
    match pagerank_score {
        Some(score) if score > 0.0 => score / 100.0,
        _ => 0.0,
    }
}

pub fn normalize_pageviews(pageview_count: Option<i64>) -> f64 {
    let count = match pageview_count {
        Some(c) if c > 0 => c as f64,
        _ => return 0.0,
    };

    if count < 100.0 {
        return 0.1;
    }

    let min_log = 2.0; // 100 views
    let max_log = 7.0; // 10M views

    let log_val = count.log10();
    let score = (log_val - min_log) / (max_log - min_log);
    
    // Clamp between 0.0 and 1.0
    score.max(0.0).min(1.0)
}

pub fn calculate_title_match_score(title: &str, query: &str) -> f64 {
    let title_lower = title.to_lowercase().replace('_', " ");
    let query_lower = query.to_lowercase();

    let title_words: HashSet<&str> = title_lower.split_whitespace().collect();
    let query_words: HashSet<&str> = query_lower.split_whitespace().collect();

    if title_words.is_empty() {
        return 0.0;
    }

    let intersection_count = title_words.intersection(&query_words).count();
    let union_count = title_words.union(&query_words).count();

    if union_count == 0 {
        return 0.0;
    }

    let mut base_score = intersection_count as f64 / union_count as f64;

    // Exact or substring match boost
    if title_lower == query_lower {
        return 1.0;
    } else if title_lower.starts_with(&query_lower) || title_lower.contains(&query_lower) {
        base_score = (base_score * 1.5).min(1.0);
    }

    // Place indicator penalty logic
    // Checks if " in " splits the title and the second part contains a location
    if let Some((_, suffix)) = title_lower.split_once(" in ") {
        let place_indicators = [
            "africa", "asia", "europe", "america", "states", "kingdom",
            "china", "india", "russia", "france", "germany", "japan",
            "canada", "australia", "brazil", "mexico", "italy", "spain",
            "california", "texas", "york", "london", "paris", "tokyo"
        ];
        if place_indicators.iter().any(|&place| suffix.contains(place)) {
            base_score *= 0.5;
        }
    }

    // Year penalty
    if get_year_regex().is_match(&title_lower) {
        base_score *= 0.4;
    }

    // Meta page penalty
    let meta_prefixes = [
        "list of", "index of", "glossary of", "timeline of", 
        "outline of", "history of", "bibliography of"
    ];
    if meta_prefixes.iter().any(|&prefix| title_lower.starts_with(prefix)) {
        base_score *= 0.1;
    }

    base_score.max(0.0).min(1.0)
}

pub fn is_meta_page(title: &str) -> bool {
    let lower = title.to_lowercase();
    let bad_prefixes = [
        "wikipedia:", "template:", "category:", "portal:", "help:", 
        "user:", "talk:", "file:", "mediawiki:", "draft:"
    ];
    
    bad_prefixes.iter().any(|&p| lower.starts_with(p)) || lower.contains("(disambiguation)")
}

pub fn calculate_multisignal_score(
    semantic_similarity: f32,
    pagerank_score: f64,
    pageview_count: f64,
    title: &str,
    query: &str,
) -> f64 {
    let config = get_config();

    let sem_norm = (semantic_similarity as f64).max(config.epsilon);
    let pr_norm = pagerank_score.max(config.epsilon);
    let pv_norm = pageview_count.max(config.epsilon);
    let title_norm = calculate_title_match_score(title, query).max(config.epsilon);

    // Geometric Mean
    let mut score = sem_norm.powf(config.weight_semantic) *
                    pr_norm.powf(config.weight_pagerank) *
                    pv_norm.powf(config.weight_pageviews) *
                    title_norm.powf(config.weight_title_match);

    // Obscurity Penalty
    // If semantically relevant but near-zero popularity, crush score
    if pv_norm < 0.2 && pr_norm < 0.1 {
        score *= 0.5;
    }

    score
}