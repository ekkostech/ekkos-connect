#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# Template Validation Script
# Ensures all templates are consistent and properly formatted
# ═══════════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEMPLATES_DIR="$PROJECT_ROOT/templates"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RESET='\033[0m'

ERRORS=0
WARNINGS=0

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BLUE}Template Validation${RESET}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo ""

# ═══════════════════════════════════════════════════════════════════════════
# Check 1: Footer Format in CLAUDE.md
# ═══════════════════════════════════════════════════════════════════════════
echo -e "${BLUE}[1/7]${RESET} Checking footer format in CLAUDE.md..."

EXPECTED_FOOTER_PATTERN='\{IDE\} \(\{Model\}\) · 🧠 \*\*ekkOS_™\*\* · Turn \{N\} · 📅 \{Timestamp\}'
CLAUDE_MD="$TEMPLATES_DIR/CLAUDE.md"

if [ ! -f "$CLAUDE_MD" ]; then
  echo -e "${RED}✗ FAIL: $CLAUDE_MD not found${RESET}"
  ((ERRORS++))
else
  if grep -q "{IDE} ({Model})" "$CLAUDE_MD"; then
    echo -e "${GREEN}✓ PASS: Footer format is correct${RESET}"
  else
    echo -e "${RED}✗ FAIL: Footer format is outdated in $CLAUDE_MD${RESET}"
    echo -e "${YELLOW}  Expected pattern: $EXPECTED_FOOTER_PATTERN${RESET}"
    ((ERRORS++))
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════
# Check 2: Hook Scripts Syntax
# ═══════════════════════════════════════════════════════════════════════════
echo -e "${BLUE}[2/7]${RESET} Validating hook scripts syntax..."

HOOKS_DIR="$TEMPLATES_DIR/hooks"
HOOK_ERRORS=0

if [ -d "$HOOKS_DIR" ]; then
  for hook in "$HOOKS_DIR"/*.sh; do
    if [ -f "$hook" ]; then
      if bash -n "$hook" 2>/dev/null; then
        echo -e "${GREEN}  ✓ $(basename "$hook")${RESET}"
      else
        echo -e "${RED}  ✗ $(basename "$hook") - syntax error${RESET}"
        bash -n "$hook"
        ((HOOK_ERRORS++))
      fi
    fi
  done

  if [ $HOOK_ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ PASS: All hooks have valid syntax${RESET}"
  else
    echo -e "${RED}✗ FAIL: $HOOK_ERRORS hook(s) have syntax errors${RESET}"
    ((ERRORS++))
  fi
else
  echo -e "${YELLOW}⚠ WARN: Hooks directory not found${RESET}"
  ((WARNINGS++))
fi

# ═══════════════════════════════════════════════════════════════════════════
# Check 3: Skills Exist
# ═══════════════════════════════════════════════════════════════════════════
echo -e "${BLUE}[3/7]${RESET} Checking skills are present..."

SKILLS_DIR="$TEMPLATES_DIR/skills"
EXPECTED_SKILLS=(
  "ekkOS_Memory_First"
  "ekkOS_Learn"
  "ekkOS_Preferences"
  "ekkOS_Safety"
  "ekkOS_Schema"
  "ekkOS_Deep_Recall"
  "ekkOS_Vault"
  "ekkOS_Reflect"
  "ekkOS_Summary"
  "ekkOS_Plan_Assist"
  "continue"
)

MISSING_SKILLS=0
if [ -d "$SKILLS_DIR" ]; then
  for skill in "${EXPECTED_SKILLS[@]}"; do
    if [ -f "$SKILLS_DIR/$skill/Skill.md" ]; then
      echo -e "${GREEN}  ✓ $skill${RESET}"
    else
      echo -e "${RED}  ✗ $skill - missing${RESET}"
      ((MISSING_SKILLS++))
    fi
  done

  if [ $MISSING_SKILLS -eq 0 ]; then
    echo -e "${GREEN}✓ PASS: All expected skills present${RESET}"
  else
    echo -e "${RED}✗ FAIL: $MISSING_SKILLS skill(s) missing${RESET}"
    ((ERRORS++))
  fi
else
  echo -e "${RED}✗ FAIL: Skills directory not found${RESET}"
  ((ERRORS++))
fi

# ═══════════════════════════════════════════════════════════════════════════
# Check 4: No Hardcoded Credentials
# ═══════════════════════════════════════════════════════════════════════════
echo -e "${BLUE}[4/7]${RESET} Scanning for hardcoded credentials..."

CREDENTIAL_PATTERNS=(
  "ekk_[a-zA-Z0-9]{32}"
  "ghp_[a-zA-Z0-9]{36}"
  "sk-[a-zA-Z0-9]{48}"
  "Bearer [a-zA-Z0-9]{64}"
)

CREDENTIAL_MATCHES=0
for pattern in "${CREDENTIAL_PATTERNS[@]}"; do
  MATCHES=$(grep -rE "$pattern" "$TEMPLATES_DIR" 2>/dev/null | grep -v ".git" | wc -l | tr -d ' ')
  if [ "$MATCHES" -gt 0 ]; then
    echo -e "${RED}  ✗ Found $MATCHES match(es) for pattern: $pattern${RESET}"
    grep -rE "$pattern" "$TEMPLATES_DIR" 2>/dev/null | grep -v ".git" | head -3
    ((CREDENTIAL_MATCHES++))
  fi
done

if [ $CREDENTIAL_MATCHES -eq 0 ]; then
  echo -e "${GREEN}✓ PASS: No hardcoded credentials found${RESET}"
else
  echo -e "${RED}✗ FAIL: Found hardcoded credentials${RESET}"
  ((ERRORS++))
fi

# ═══════════════════════════════════════════════════════════════════════════
# Check 5: Windows Compatibility
# ═══════════════════════════════════════════════════════════════════════════
echo -e "${BLUE}[5/7]${RESET} Checking Windows compatibility..."

# Check for Unix-specific commands in hooks
WINDOWS_INCOMPATIBLE=0
if [ -d "$HOOKS_DIR" ]; then
  for hook in "$HOOKS_DIR"/*.sh; do
    if [ -f "$hook" ]; then
      # Check for commands that don't work well on Windows
      if grep -qE "(stat -f|readlink -f|ps aux)" "$hook"; then
        echo -e "${YELLOW}  ⚠ $(basename "$hook") - may have Windows compatibility issues${RESET}"
        ((WINDOWS_INCOMPATIBLE++))
      fi

      # Check for hardcoded /bin/bash (should support Git Bash path)
      if grep -q "^#!/bin/bash$" "$hook"; then
        echo -e "${GREEN}  ✓ $(basename "$hook") - standard shebang${RESET}"
      fi

      # Check for CRLF line endings (Windows Git Bash issue)
      if file "$hook" 2>/dev/null | grep -q "CRLF"; then
        echo -e "${RED}  ✗ $(basename "$hook") - has CRLF line endings (must be LF)${RESET}"
        echo -e "${YELLOW}     Fix with: dos2unix $hook${RESET}"
        ((WINDOWS_INCOMPATIBLE++))
      fi
    fi
  done

  if [ $WINDOWS_INCOMPATIBLE -eq 0 ]; then
    echo -e "${GREEN}✓ PASS: No Windows compatibility issues${RESET}"
  else
    echo -e "${YELLOW}⚠ WARN: $WINDOWS_INCOMPATIBLE Windows compatibility issue(s) found${RESET}"
    ((WARNINGS++))
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════
# Check 6: Template Variables Documented
# ═══════════════════════════════════════════════════════════════════════════
echo -e "${BLUE}[6/7]${RESET} Checking template variables are documented..."

VARIABLES_FOUND=$(grep -roh "\{[A-Z_]*\}" "$TEMPLATES_DIR" 2>/dev/null | sort -u)
UNDOCUMENTED=0

for var in $VARIABLES_FOUND; do
  if grep -q "$var" "$CLAUDE_MD"; then
    echo -e "${GREEN}  ✓ $var - documented${RESET}"
  else
    echo -e "${YELLOW}  ⚠ $var - not documented in CLAUDE.md${RESET}"
    ((UNDOCUMENTED++))
  fi
done

if [ $UNDOCUMENTED -eq 0 ]; then
  echo -e "${GREEN}✓ PASS: All template variables documented${RESET}"
else
  echo -e "${YELLOW}⚠ WARN: $UNDOCUMENTED variable(s) not documented${RESET}"
  ((WARNINGS++))
fi

# ═══════════════════════════════════════════════════════════════════════════
# Check 7: Required Files Present
# ═══════════════════════════════════════════════════════════════════════════
echo -e "${BLUE}[7/7]${RESET} Checking required files..."

REQUIRED_FILES=(
  "CLAUDE.md"
  "hooks/user-prompt-submit.sh"
  "hooks/session-start.sh"
)

MISSING_FILES=0
for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$TEMPLATES_DIR/$file" ]; then
    echo -e "${GREEN}  ✓ $file${RESET}"
  else
    echo -e "${RED}  ✗ $file - missing${RESET}"
    ((MISSING_FILES++))
  fi
done

if [ $MISSING_FILES -eq 0 ]; then
  echo -e "${GREEN}✓ PASS: All required files present${RESET}"
else
  echo -e "${RED}✗ FAIL: $MISSING_FILES required file(s) missing${RESET}"
  ((ERRORS++))
fi

# ═══════════════════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"
echo -e "${BLUE}Validation Summary${RESET}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✓ ALL CHECKS PASSED${RESET}"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo -e "${YELLOW}⚠ PASSED WITH $WARNINGS WARNING(S)${RESET}"
  exit 0
else
  echo -e "${RED}✗ FAILED WITH $ERRORS ERROR(S) AND $WARNINGS WARNING(S)${RESET}"
  exit 1
fi
