#!/bin/bash
# Sync extension to public GitHub repo
# Run this after publishing to marketplaces

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
TEMP_DIR=$(mktemp -d)

# Get GitHub token from main repo's remote (if available)
GITHUB_TOKEN=$(cd "$SCRIPT_DIR" && git config --get remote.origin.url 2>/dev/null | grep -o 'github_pat_[^@]*' | head -1 || echo "")

if [ -n "$GITHUB_TOKEN" ]; then
  PUBLIC_REPO="https://${GITHUB_TOKEN}@github.com/ekkostech/ekkos-connect.git"
else
  PUBLIC_REPO="https://github.com/ekkostech/ekkos-connect.git"
fi

echo "📦 Syncing ekkOS_Connect to public repo..."

# Clone public repo
git clone "$PUBLIC_REPO" "$TEMP_DIR/repo"

# Copy extension files (excluding sensitive/build files)
rsync -av --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='out' \
  --exclude='.vercel' \
  --exclude='*.vsix' \
  "$SCRIPT_DIR/" "$TEMP_DIR/repo/"

# Get version from package.json
VERSION=$(node -p "require('$SCRIPT_DIR/package.json').version")

# Commit and push
cd "$TEMP_DIR/repo"
git add -A
git commit -m "Release v$VERSION" || echo "No changes to commit"
git push origin main

# Cleanup
rm -rf "$TEMP_DIR"

echo "✅ Synced v$VERSION to public repo"
echo "   https://github.com/ekkostech/ekkos-connect"
