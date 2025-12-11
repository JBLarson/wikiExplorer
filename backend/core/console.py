import time
import sys
from datetime import datetime

class Console:
    """
    Simple ANSI color logger to make the terminal output look like a 
    hacker console / dashboard.
    """
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

    @staticmethod
    def timestamp():
        return datetime.now().strftime("%H:%M:%S")

    @staticmethod
    def log_search(query, ip, context_size):
        t = Console.timestamp()
        print(f"{Console.HEADER}[{t}] 🔍 SEARCH INITIATED{Console.ENDC}")
        print(f"    ├─ Query:   {Console.OKCYAN}{Console.BOLD}'{query}'{Console.ENDC}")
        print(f"    ├─ IP:      {ip}")
        print(f"    └─ Context: {context_size} existing nodes")

    @staticmethod
    def log_verification(raw_count, verified_count, time_taken):
        dropped = raw_count - verified_count
        color = Console.OKGREEN if verified_count > 0 else Console.WARNING
        print(f"    ├─ {Console.OKBLUE}Vector Search:{Console.ENDC} {raw_count} raw candidates found ({time_taken:.3f}s)")
        if dropped > 0:
            print(f"    ├─ {Console.WARNING}Verification:{Console.ENDC}  Dropped {dropped} mismatches / ghosts")
        print(f"    └─ {color}Result:{Console.ENDC}        {verified_count} confirmed semantically relevant")

    @staticmethod
    def log_edges(cache_hits, calculated, total_needed, time_taken):
        """
        Logs the specific cache hit/miss ratio requested.
        """
        # Create a visual progress bar
        total = cache_hits + calculated
        if total == 0: total = 1
        
        percent_cached = (cache_hits / total) * 10
        bar = "█" * int(percent_cached) + "░" * (10 - int(percent_cached))
        
        print(f"    ┌─ {Console.HEADER}⚡ CROSS-EDGE CONNECTIVITY{Console.ENDC}")
        
        if cache_hits > 0:
            print(f"    │  Found {Console.OKGREEN}{cache_hits}{Console.ENDC} cached edges {Console.OKGREEN}[{bar}]{Console.ENDC}")
        
        if calculated > 0:
            print(f"    │  Calculated {Console.WARNING}{calculated}/{total_needed}{Console.ENDC} missing vectors")
        else:
            print(f"    │  {Console.OKGREEN}100% Cache Hit{Console.ENDC} - No vector math required")
            
        print(f"    └─ Time: {time_taken:.3f}s")

    @staticmethod
    def log_success(msg):
        print(f"{Console.OKGREEN}    ✓ {msg}{Console.ENDC}")

    @staticmethod
    def log_error(msg):
        print(f"{Console.FAIL}    ✕ ERROR: {msg}{Console.ENDC}")

console = Console()