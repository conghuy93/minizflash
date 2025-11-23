#!/bin/bash

echo "========================================"
echo "  Push to GitHub Repository"
echo "========================================"
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "[ERROR] Git not found!"
    echo "Please install Git"
    exit 1
fi

cd "$(dirname "$0")"

echo "[INFO] Current directory: $(pwd)"
echo ""

# Initialize git if not already
if [ ! -d .git ]; then
    echo "[INFO] Initializing git repository..."
    git init
    git branch -M main
fi

# Add all files
echo "[INFO] Adding files..."
git add .

# Commit
echo "[INFO] Creating commit..."
git commit -m "ESP Web Flasher - Initial commit"

# Add remote if not exists
if ! git remote get-url origin &> /dev/null; then
    echo "[INFO] Adding remote origin..."
    read -p "Enter your GitHub repository URL (https://github.com/conghuy93/minizflash.git): " REPO_URL
    git remote add origin "$REPO_URL"
fi

# Push to GitHub
echo "[INFO] Pushing to GitHub..."
git push -u origin main

echo ""
echo "========================================"
echo "  Push complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Go to https://github.com/conghuy93/minizflash/settings/pages"
echo "2. Under 'Build and deployment'"
echo "3. Source: Select 'GitHub Actions'"
echo "4. Wait 2-3 minutes for deployment"
echo "5. Visit: https://conghuy93.github.io/minizflash/"
echo ""
