#!/bin/bash

# Open VSX Publishing Script
# Publishes ekkos-connect to Open VSX Registry (open-vsx.org)

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Publishing ekkos-connect to Open VSX${NC}"
echo "=================================================="
echo ""

# Check if PAT is provided
if [ -z "$OVSX_PAT" ]; then
  echo -e "${YELLOW}⚠️  OVSX_PAT environment variable not set${NC}"
  echo ""
  echo "Get your token at: https://open-vsx.org/user-settings/tokens"
  echo ""
  echo "Then run:"
  echo "  export OVSX_PAT='your-token-here'"
  echo "  ./publish-to-openvsx.sh"
  echo ""
  echo "Or provide it now:"
  read -sp "Enter your Open VSX PAT (or press Ctrl+C to cancel): " PAT
  echo ""
  export OVSX_PAT="$PAT"
fi

# Verify extension is ready
echo -e "${YELLOW}📦 Verifying extension...${NC}"
VERSION=$(node -p "require('./package.json').version")
PUBLISHER=$(node -p "require('./package.json').publisher")
VSIX_FILE="ekkos-connect-${VERSION}.vsix"

echo "  Version: $VERSION"
echo "  Publisher: $PUBLISHER"
echo "  VSIX: $VSIX_FILE"
echo ""

# Check if VSIX exists
if [ ! -f "$VSIX_FILE" ]; then
  echo -e "${RED}❌ Error: $VSIX_FILE not found${NC}"
  echo "Run 'npx vsce package' first to create the VSIX"
  exit 1
fi

# Confirm before publishing
echo ""
echo -e "${YELLOW}⚠️  Ready to publish to Open VSX${NC}"
echo "  Extension: ekkos-connect"
echo "  Version: $VERSION"
echo "  File: $VSIX_FILE"
echo ""
read -p "Continue with publication? (yes/no): " -r
echo ""

if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo -e "${YELLOW}Cancelled. VSIX packaged but not published.${NC}"
  exit 0
fi

# Publish to Open VSX
echo -e "${GREEN}🚀 Publishing to Open VSX...${NC}"
npx ovsx publish "$VSIX_FILE" -p "$OVSX_PAT"

echo ""
echo -e "${GREEN}✅ Extension published successfully to Open VSX!${NC}"
echo ""
echo "Next steps:"
echo "1. Verify at: https://open-vsx.org/extension/ekkostech/ekkos-connect"
echo "2. Extension will be available in:"
echo "   - VSCodium"
echo "   - Eclipse Theia"
echo "   - Gitpod"
echo "   - Other Open VSX compatible editors"
echo ""
