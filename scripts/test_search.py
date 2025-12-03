import requests
import sys
import pandas as pd

def main():
    if len(sys.argv) < 2:
        print("Usage: python test_quality.py <search_term>")
        sys.exit(1)
        
    query = sys.argv[1]
    print(f"Testing Quality Weights for: '{query}'...")
    
    try:
        response = requests.post('http://localhost:5001/api/cluster/search_step', json={'query': query})
        
        if response.status_code != 200:
            print(f"Error: {response.text}")
            return
            
        data = response.json()
        stats = data['stats']
        scores = data['debug_scores']
        
        # 1. Print The Table (Exactly as requested)
        print("\n" + "="*80)
        print(f"{'ARTICLE':<40} {'DEPTH':<6} {'EDGES':<6} {'OUT':<4} {'IN':<4} {'CONN':<6} {'EXP':<4}")
        print("-" * 80)
        
        for row in stats:
            # Truncate title for clean table
            title = row['ARTICLE']
            if len(title) > 38: title = title[:35] + "..."
            
            print(f"{title:<40} {row['DEPTH']:<6} {row['TOTAL EDGES']:<6} {row['OUTGOING']:<4} {row['INCOMING']:<4} {row['NEIGHBOR CONN']:<6} {row['EXPANSIONS']:<4}")
            
        print("="*80 + "\n")

        # 2. Print Debug Score Breakdown (To prove it used your logic)
        print("--- SCORING BREAKDOWN (Top 7) ---")
        print(f"{'Article':<35} {'Final':<8} {'Semantic':<8} {'PageRank':<8} {'PageViews':<8}")
        for s in scores:
            t = s['title'][:32]
            final = f"{s['final_score']:.4f}"
            sem = f"{s['debug']['sem']:.4f}"
            pr = f"{s['debug']['pr']:.1f}"
            pv = f"{s['debug']['pv']}"
            print(f"{t:<35} {final:<8} {sem:<8} {pr:<8} {pv:<8}")

    except Exception as e:
        print(f"Connection Error: {e}")

if __name__ == "__main__":
    main()