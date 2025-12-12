#!/bin/bash

# frontend build / start - optional flag (-c) to clear cache(s)


# Parse command line arguments
CLEAR_CACHE=false

while getopts "c" opt; do
    case $opt in
        c)
            CLEAR_CACHE=true
            ;;
        \?)
            echo "Invalid option: -$OPTARG" >&2
            echo "Usage: $0 [-c]"
            echo "  -c: Clear all caches before running"
            exit 1
            ;;
    esac
done

# Clear cache if flag is set
if [ "$CLEAR_CACHE" = true ]; then
    echo "Clearing all caches..."
    
    # Remove Vite cache directories
    rm -rf node_modules/.vite
    rm -rf dist
    rm -rf .vite
    
    # Clear npm cache
    npm cache clean --force
    
    # Clear any potential TypeScript build cache
    rm -rf .tsbuildinfo
    
    # Clear any ESLint cache
    rm -rf .eslintcache
    
    # Reinstall dependencies
    echo "Reinstalling dependencies..."
    npm install
    
    echo "Cache cleared and dependencies reinstalled!"
fi

# Start dev server
npm run dev
