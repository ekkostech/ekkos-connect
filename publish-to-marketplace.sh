#!/bin/bash

# VS Code Marketplace Publishing Script
# Uses Azure DevOps Personal Access Token to publish extension

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Publishing ekkos-connect to VS Code Marketplace${NC}"
echo "=================================================="
echo ""

# Check if PAT is provided
if [ -z "$VSCE_PAT" ]; then
  echo -e "${YELLOW}⚠️  VSCE_PAT environment variable not set${NC}"
  echo ""
  echo "Please provide your Azure DevOps Personal Access Token:"
  echo "  export VSCE_PAT='your-token-here'"
  echo ""
  echo "Or run this script with:"
  echo "  VSCE_PAT='your-token' ./publish-to-marketplace.sh"
  echo ""
  read -sp "Enter your PAT (or press Ctrl+C to cancel): " PAT
  echo ""
  export VSCE_PAT="$PAT"
fi

# Verify extension is ready
echo -e "${YELLOW}📦 Verifying extension...${NC}"
VERSION=$(node -p "require('./package.json').version")
PUBLISHER=$(node -p "require('./package.json').publisher")
echo "  Version: $VERSION"
echo "  Publisher: $PUBLISHER"
echo ""

# Check if compiled
if [ ! -f "out/extension.js" ]; then
  echo -e "${YELLOW}🔨 Compiling extension...${NC}"
  npm run compile
fi

# Verify icon exists
if [ ! -f "resources/icon.png" ]; then
  echo -e "${RED}❌ Error: icon.png not found${NC}"
  exit 1
fi

# Package extension (for verification)
echo -e "${YELLOW}📦 Creating package...${NC}"
npm run package

# Confirm before publishing
echo ""
echo -e "${YELLOW}⚠️  Ready to publish to VS Code Marketplace${NC}"
echo "  Extension: ekkos-connect"
echo "  Version: $VERSION"
echo "  Publisher: $PUBLISHER"
echo ""
read -p "Continue with publication? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo -e "${YELLOW}Cancelled. Extension packaged but not published.${NC}"
  exit 0
fi

# Publish to marketplace
echo -e "${GREEN}🚀 Publishing to VS Code Marketplace...${NC}"
export VSCE_PAT
npx @vscode/vsce publish --pat "$VSCE_PAT"

echo ""
echo -e "${GREEN}✅ Extension published successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Verify at: https://marketplace.visualstudio.com/manage"
echo "2. Extension URL: https://marketplace.visualstudio.com/items?itemName=ekkostech.ekkos-connect"
echo "3. Test installation: ext install ekkostech.ekkos-connect"
echo ""









































































