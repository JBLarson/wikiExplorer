#!/bin/bash
# deploy-frontend.sh - Build and deploy wikiExplorer frontend to Dreamhost
# Uses a single SSH connection for all operations

set -e  # Exit on any error

# Configuration
DREAMHOST_USER="dh_wfbffg"
DREAMHOST_HOST="pdx1-shared-a1-34.dreamhost.com"
DREAMHOST_PATH="~/wikiexplorer.org"  # Adjust this to your actual path
LOCAL_BUILD_DIR="./dist"

echo "=========================================="
echo "wikiExplorer Frontend Deployment"
echo "=========================================="

# Step 1: Build the frontend
echo ""
echo "[1/3] Building frontend..."
npm run build

if [ ! -d "$LOCAL_BUILD_DIR" ]; then
    echo "ERROR: Build directory not found at $LOCAL_BUILD_DIR"
    exit 1
fi

echo "✓ Build complete"

# Step 2: Create a tarball locally
echo ""
echo "[2/3] Creating deployment package..."
cd $LOCAL_BUILD_DIR
tar -czf ../deploy.tar.gz *
cd ..
echo "✓ Package created"

# Step 3: Single SSH session - upload and extract
echo ""
echo "[3/3] Uploading and deploying..."
cat deploy.tar.gz | ssh ${DREAMHOST_USER}@${DREAMHOST_HOST} "
    cd ${DREAMHOST_PATH}
    
    # Backup existing files
    if [ -f index.html ]; then
        echo 'Creating backup...'
        tar -czf backup-\$(date +%Y%m%d-%H%M%S).tar.gz index.html assets 2>/dev/null || true
    fi
    
    # Remove old files
    echo 'Removing old files...'
    rm -rf assets index.html *.png *.ico
    
    # Extract new files
    echo 'Extracting new build...'
    tar -xzf - 
    
    echo '✓ Deployment complete'
"

# Cleanup local tarball
rm -f deploy.tar.gz

echo ""
echo "=========================================="
echo "✓ Deployment successful!"
echo "=========================================="
echo "Site: https://wikiexplorer.org"
echo ""