#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# Pre-Publish Check Script
# Runs all validation checks before publishing to VS Code Marketplace
# ═══════════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
RESET='\033[0m'

ERRORS=0
WARNINGS=0

echo -e "${MAGENTA}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${MAGENTA}${BOLD}ekkOS Extension Pre-Publish Checks${RESET}"
echo -e "${MAGENTA}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# Check 1: Template Validation
# ═══════════════════════════════════════════════════════════════════════════
echo -e "${BLUE}[1/10]${RESET} Running template validation..."

if bash "$SCRIPT_DIR/validate-templates.sh"; then
  echo -e "${GREEN}✓ PASS: Templates validated${RESET}"
else
  echo -e "${RED}✗ FAIL: Template validation failed${RESET}"
  ((ERRORS++))
fi

echo ""

# ═══════════════════════════════════════════════════════════════════════════
# Check 2: TypeScript Compilation
# ═══════════════════════════════════════════════════════════════════════════
echo -e "${BLUE}[2/10]${RESET} Compiling TypeScript..."

cd "$PROJECT_ROOT"

if npm run compile 2>&1 | grep -q "error"; then
  echo -e "${RED}✗ FAIL: TypeScript compilation errors${RESET}"
  npm run compile
  ((ERRORS++))
else
  echo -e "${GREEN}✓ PASS: TypeScript compiled successfully${RESET}"
fi

echo ""

# ═══════════════════════════════════════════════════════════════════════════
# Check 3: Linting
# ═══════════════════════════════════════════════════════════════════════════
echo -e "${BLUE}[3/10]${RESET} Running linter..."

if npm run lint 2>&1 | grep -qE "(error|✖)"; then
  echo -e "${YELLOW}⚠ WARN: Linting warnings/errors found${RESET}"
  ((WARNINGS++))
else
  echo -e "${GREEN}✓ PASS: Code passes linting${RESET}"
fi

echo ""

# ═══════════════════════════════════════════════════════════════════════════
# Check 4: Package.json Validation
# ═══════════════════════════════════════════════════════════════════════════
echo -e "${BLUE}[4/10]${RESET} Validating package.json..."

PKG_JSON="$PROJECT_ROOT/package.json"

# Check publisher field
PUBLISHER=$(jq -r '.publisher // ""' "$PKG_JSON")
if [ "$PUBLISHER" = "ekkos" ]; then
  echo -e "${GREEN}  ✓ Publisher: $PUBLISHER${RESET}"
else
  echo -e "${RED}  ✗ Publisher should be 'ekkos', got: $PUBLISHER${RESET}"
  ((ERRORS++))
fi

# Check version format
VERSION=$(jq -r '.version // ""' "$PKG_JSON")
if [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo -e "${GREEN}  ✓ Version: $VERSION${RESET}"
else
  echo -e "${RED}  ✗ Invalid version format: $VERSION${RESET}"
  ((ERRORS++))
fi

# Check required fields
REQUIRED_FIELDS=("name" "displayName" "description" "repository" "license")
for field in "${REQUIRED_FIELDS[@]}"; do
  VALUE=$(jq -r ".$field // \"\"" "$PKG_JSON")
  if [ -z "$VALUE" ] || [ "$VALUE" = "null" ]; then
    echo -e "${RED}  ✗ Missing required field: $field${RESET}"
    ((ERRORS++))
  else
    echo -e "${GREEN}  ✓ $field: $(echo "$VALUE" | cut -c1-50)${RESET}"
  fi
done

echo ""

# ═══════════════════════════════════════════════════════════════════════════
# Check 5: CHANGELOG Updated
# ═══════════════════════════════════════════════════════════════════════════
echo -e "${BLUE}[5/10]${RESET} Checking CHANGELOG.md..."

CHANGELOG="$PROJECT_ROOT/CHANGELOG.md"
if [ ! -f "$CHANGELOG" ]; then
  echo -e "${YELLOW}  ⚠ CHANGELOG.md not found${RESET}"
  ((WARNINGS++))
else
  if grep -q "$VERSION" "$CHANGELOG"; then
    echo -e "${GREEN}  ✓ Version $VERSION documented in CHANGELOG${RESET}"
  else
    echo -e "${RED}  ✗ Version $VERSION not found in CHANGELOG${RESET}"
    ((ERRORS++))
  fi
fi

echo ""

# ═══════════════════════════════════════════════════════════════════════════
# Check 6: README Updated
# ═══════════════════════════════════════════════════════════════════════════
echo -e "${BLUE}[6/10]${RESET} Checking README.md..."

README="$PROJECT_ROOT/README.md"
if [ ! -f "$README" ]; then
  echo -e "${RED}  ✗ README.md not found${RESET}"
  ((ERRORS++))
else
  # Check for outdated version references
  if grep -qE "v[0-9]+\.[0-9]+\.[0-9]+" "$README"; then
    echo -e "${YELLOW}  ⚠ README contains version references - verify they're current${RESET}"
    ((WARNINGS++))
  else
    echo -e "${GREEN}  ✓ README looks good${RESET}"
  fi
fi

echo ""

# ═══════════════════════════════════════════════════════════════════════════
# Check 7: Git Status
# ═══════════════════════════════════════════════════════════════════════════
echo -e "${BLUE}[7/10]${RESET} Checking git status..."

cd "$PROJECT_ROOT"

UNCOMMITTED=$(git status --porcelain | wc -l | tr -d ' ')
if [ "$UNCOMMITTED" -gt 0 ]; then
  echo -e "${YELLOW}  ⚠ $UNCOMMITTED uncommitted change(s):${RESET}"
  git status --short | head -5
  if [ "$UNCOMMITTED" -gt 5 ]; then
    echo -e "${YELLOW}    ... and $(($UNCOMMITTED - 5)) more${RESET}"
  fi
  ((WARNINGS++))
else
  echo -e "${GREEN}  ✓ Working directory clean${RESET}"
fi

# Check if on correct branch
BRANCH=$(git branch --show-current)
if [ "$BRANCH" = "main" ] || [ "$BRANCH" = "master" ]; then
  echo -e "${GREEN}  ✓ On $BRANCH branch${RESET}"
else
  echo -e "${YELLOW}  ⚠ On branch '$BRANCH' (not main/master)${RESET}"
  ((WARNINGS++))
fi

echo ""

# ═══════════════════════════════════════════════════════════════════════════
# Check 8: Version Tag Doesn't Exist
# ═══════════════════════════════════════════════════════════════════════════
echo -e "${BLUE}[8/10]${RESET} Checking version tag..."

if git tag | grep -q "^v$VERSION$"; then
  echo -e "${RED}  ✗ Git tag v$VERSION already exists${RESET}"
  ((ERRORS++))
else
  echo -e "${GREEN}  ✓ Tag v$VERSION available${RESET}"
fi

echo ""

# ═══════════════════════════════════════════════════════════════════════════
# Check 9: Dependencies Installed
# ═══════════════════════════════════════════════════════════════════════════
echo -e "${BLUE}[9/10]${RESET} Checking dependencies..."

if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
  echo -e "${RED}  ✗ node_modules not found - run 'npm install'${RESET}"
  ((ERRORS++))
else
  # Check for outdated critical deps
  OUTDATED=$(npm outdated --json 2>/dev/null || echo "{}")
  OUTDATED_COUNT=$(echo "$OUTDATED" | jq 'length' 2>/dev/null || echo "0")

  if [ "$OUTDATED_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}  ⚠ $OUTDATED_COUNT outdated package(s)${RESET}"
    ((WARNINGS++))
  else
    echo -e "${GREEN}  ✓ Dependencies up-to-date${RESET}"
  fi
fi

echo ""

# ═══════════════════════════════════════════════════════════════════════════
# Check 10: PAT Available
# ═══════════════════════════════════════════════════════════════════════════
echo -e "${BLUE}[10/10]${RESET} Checking publishing credentials..."

if [ -z "$VSCE_PAT" ]; then
  echo -e "${YELLOW}  ⚠ VSCE_PAT environment variable not set${RESET}"
  echo -e "${YELLOW}     Publishing will require manual PAT entry${RESET}"
  ((WARNINGS++))
else
  echo -e "${GREEN}  ✓ VSCE_PAT configured${RESET}"
fi

echo ""

# ═══════════════════════════════════════════════════════════════════════════
# Summary & Recommendations
# ═══════════════════════════════════════════════════════════════════════════
echo -e "${MAGENTA}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${MAGENTA}${BOLD}Summary${RESET}"
echo -e "${MAGENTA}${BOLD}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

echo ""
echo -e "${BOLD}Extension:${RESET} ekkos-connect"
echo -e "${BOLD}Version:${RESET}   $VERSION"
echo -e "${BOLD}Publisher:${RESET} $PUBLISHER"
echo -e "${BOLD}Branch:${RESET}    $BRANCH"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}${BOLD}✓ ALL CHECKS PASSED${RESET}"
  echo ""
  echo -e "${GREEN}Ready to publish!${RESET}"
  echo ""
  echo -e "Next steps:"
  echo -e "  1. ${BOLD}npm run package${RESET}  (build VSIX)"
  echo -e "  2. ${BOLD}npx @vscode/vsce publish${RESET}  (publish to marketplace)"
  echo -e "  3. ${BOLD}git tag v$VERSION && git push --tags${RESET}  (create release tag)"
  echo ""
  exit 0

elif [ $ERRORS -eq 0 ]; then
  echo -e "${YELLOW}${BOLD}⚠ PASSED WITH $WARNINGS WARNING(S)${RESET}"
  echo ""
  echo -e "${YELLOW}You can proceed, but review warnings first.${RESET}"
  echo ""
  exit 0

else
  echo -e "${RED}${BOLD}✗ FAILED WITH $ERRORS ERROR(S) AND $WARNINGS WARNING(S)${RESET}"
  echo ""
  echo -e "${RED}Fix errors before publishing.${RESET}"
  echo ""
  exit 1
fi
