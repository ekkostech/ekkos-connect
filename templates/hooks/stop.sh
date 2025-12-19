#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# ekkOS_ Hook: Stop (Claude Code) - ENFORCEMENT + CAPTURE
#
# ARCHITECTURE: Dumb Hook, Smart Backend
# ═══════════════════════════════════════════════════════════════════════════
# This hook does THREE things:
# 1. VALIDATE compliance (PatternGuard coverage, footer presence)
# 2. CAPTURE data and send to backend for async analysis
# 3. RECORD outcomes with compliance metadata
#
# GOLDEN LOOP ENFORCEMENT:
# - Loads turn contract written at retrieval time
# - Validates PatternGuard coverage (100% required if patterns retrieved)
# - Validates footer presence
# - Records violations and auto-forges anti-patterns
# ═══════════════════════════════════════════════════════════════════════════

# Don't use set -e here - we want graceful degradation
set +e

# Get project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
STATE_DIR="$PROJECT_ROOT/.claude/state"
mkdir -p "$STATE_DIR" 2>/dev/null || true

# Load turn contract library
if [ -f "$SCRIPT_DIR/lib/contract.sh" ]; then
  source "$SCRIPT_DIR/lib/contract.sh" 2>/dev/null || true
fi

# Fallback functions if library didn't load
if ! command -v read_turn_contract >/dev/null 2>&1; then
  read_turn_contract() { return 1; }
fi
if ! command -v get_contract_field >/dev/null 2>&1; then
  get_contract_field() { echo ""; }
fi
if ! command -v get_contract_array >/dev/null 2>&1; then
  get_contract_array() { echo ""; }
fi
if ! command -v calculate_pattern_guard_coverage >/dev/null 2>&1; then
  calculate_pattern_guard_coverage() { echo "100"; }
fi
if ! command -v check_footer_present >/dev/null 2>&1; then
  check_footer_present() { echo "true"; }
fi
if ! command -v build_compliance_metadata >/dev/null 2>&1; then
  build_compliance_metadata() { echo '{}'; }
fi
if ! command -v cleanup_turn_contract >/dev/null 2>&1; then
  cleanup_turn_contract() { :; }
fi
if ! command -v is_turn_compliant >/dev/null 2>&1; then
  is_turn_compliant() { echo "true"; }
fi
if ! command -v get_violation_reason >/dev/null 2>&1; then
  get_violation_reason() { echo "none"; }
fi

# Read JSON input
INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // ""')
MODEL_USED=$(echo "$INPUT" | jq -r '.model // "claude-sonnet-4-5"')
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# ═══════════════════════════════════════════════════════════════════════════
# Load auth token - PORTABLE: Check 3 sources in priority order
# ═══════════════════════════════════════════════════════════════════════════
EKKOS_CONFIG="$HOME/.ekkos/config.json"
AUTH_TOKEN=""
USER_ID=""

# 1. First try ~/.ekkos/config.json (set by VS Code extension - most portable)
if [ -f "$EKKOS_CONFIG" ]; then
  AUTH_TOKEN=$(jq -r '.apiKey // ""' "$EKKOS_CONFIG" 2>/dev/null || echo "")
  USER_ID=$(jq -r '.userId // ""' "$EKKOS_CONFIG" 2>/dev/null || echo "")
fi

# 2. Then try project .env.local (for developers with service role key)
if [ -z "$AUTH_TOKEN" ] && [ -f "$PROJECT_ROOT/.env.local" ]; then
  AUTH_TOKEN=$(grep -E "^SUPABASE_SECRET_KEY=" "$PROJECT_ROOT/.env.local" | cut -d'=' -f2- | tr -d '"' | tr -d "'" | tr -d '\r')
fi

# 3. Finally try environment variable (for CI/CD or manual setup)
if [ -z "$AUTH_TOKEN" ]; then
  AUTH_TOKEN="${SUPABASE_SECRET_KEY:-}"
fi

# Skip if no auth found
if [ -z "$AUTH_TOKEN" ]; then
  exit 0
fi

# Cloud API
MEMORY_API_URL="https://mcp.ekkos.dev"

# Extract conversation from transcript
LAST_USER=""
LAST_ASSISTANT=""

if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
  LAST_USER=$(cat "$TRANSCRIPT_PATH" | jq -r 'select(.type == "queue-operation" and .operation == "enqueue") | .content[] | select(.type == "text") | .text' 2>/dev/null | tail -1 || echo "")
  LAST_USER_TIME=$(cat "$TRANSCRIPT_PATH" | jq -r 'select(.type == "queue-operation" and .operation == "enqueue") | .timestamp' 2>/dev/null | tail -1 || echo "")

  if [ -n "$LAST_USER_TIME" ]; then
    LAST_ASSISTANT=$(cat "$TRANSCRIPT_PATH" | jq -r --arg time "$LAST_USER_TIME" '
      select(.type == "assistant" and .timestamp > $time)
      | .message.content[]?
      | select(.type == "text")
      | .text
    ' 2>/dev/null | tr '\n' ' ' || echo "")
  fi

  if [ -z "$LAST_ASSISTANT" ]; then
    LAST_ASSISTANT=$(echo "$INPUT" | jq -r '.response // ""' 2>/dev/null || echo "")
  fi
fi

# Load patterns from RETRIEVE step
PATTERNS_FILE="$STATE_DIR/patterns-${SESSION_ID}.json"
PATTERN_COUNT=0
PATTERN_IDS=""
APPLIED_PATTERN_IDS=""
TASK_ID=""

if [ -f "$PATTERNS_FILE" ]; then
  STORED_DATA=$(cat "$PATTERNS_FILE" 2>/dev/null || echo "{}")
  PATTERNS=$(echo "$STORED_DATA" | jq '.patterns // []' 2>/dev/null || echo "[]")
  PATTERN_COUNT=$(echo "$PATTERNS" | jq 'length' 2>/dev/null || echo "0")
  PATTERN_IDS=$(echo "$PATTERNS" | jq -r '[.[].id // .[].pattern_id] | join(",")' 2>/dev/null || echo "")
  MODEL_USED=$(echo "$STORED_DATA" | jq -r '.model_used // "claude-sonnet-4-5"' 2>/dev/null || echo "claude-sonnet-4-5")
  TASK_ID=$(echo "$STORED_DATA" | jq -r '.task_id // ""' 2>/dev/null || echo "")
fi

# ═══════════════════════════════════════════════════════════════════════════
# [ekkOS_CONTRACT] Load turn contract from retrieval phase
# ═══════════════════════════════════════════════════════════════════════════
CONTRACT_JSON=""
RETRIEVAL_OK="false"
CONTRACT_PATTERN_IDS=""

CONTRACT_JSON=$(read_turn_contract "$SESSION_ID" "claude-code" "$PROJECT_ROOT")
if [ -n "$CONTRACT_JSON" ]; then
  RETRIEVAL_OK=$(get_contract_field "$CONTRACT_JSON" "retrieval_ok")
  CONTRACT_PATTERN_IDS=$(get_contract_array "$CONTRACT_JSON" "retrieved_pattern_ids")
  EKKOS_STRICT_FROM_CONTRACT=$(get_contract_field "$CONTRACT_JSON" "ekkos_strict")

  # Use contract pattern IDs if available (more accurate than state file)
  if [ -n "$CONTRACT_PATTERN_IDS" ]; then
    PATTERN_IDS="$CONTRACT_PATTERN_IDS"
    PATTERN_COUNT=$(echo "$PATTERN_IDS" | tr ',' '\n' | grep -c '.' || echo 0)
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════
# [ekkOS_VALIDATE] PatternGuard Compliance Check
# ═══════════════════════════════════════════════════════════════════════════
PATTERN_GUARD_COVERAGE=100
APPLIED_IDS=""
SKIPPED_IDS=""

if [ -n "$LAST_ASSISTANT" ] && [ "$PATTERN_COUNT" -gt 0 ]; then
  # Calculate PatternGuard coverage
  PATTERN_GUARD_COVERAGE=$(calculate_pattern_guard_coverage "$LAST_ASSISTANT" "$PATTERN_IDS")

  # Extract applied IDs from [ekkOS_SELECT] block
  SELECT_BLOCK=$(echo "$LAST_ASSISTANT" | grep -ozP '\[ekkOS_SELECT\][\s\S]*?\[/ekkOS_SELECT\]' 2>/dev/null | tr '\0' '\n' || true)
  if [ -n "$SELECT_BLOCK" ]; then
    APPLIED_IDS=$(echo "$SELECT_BLOCK" | grep -oE 'id:\s*[a-f0-9-]+' | sed 's/id:\s*//' | tr '\n' ',' | sed 's/,$//' || true)
  fi

  # Extract skipped IDs from [ekkOS_SKIP] block
  SKIP_BLOCK=$(echo "$LAST_ASSISTANT" | grep -ozP '\[ekkOS_SKIP\][\s\S]*?\[/ekkOS_SKIP\]' 2>/dev/null | tr '\0' '\n' || true)
  if [ -n "$SKIP_BLOCK" ]; then
    SKIPPED_IDS=$(echo "$SKIP_BLOCK" | grep -oE 'id:\s*[a-f0-9-]+' | sed 's/id:\s*//' | tr '\n' ',' | sed 's/,$//' || true)
  fi

  # Legacy: Check for [ekkOS_APPLY] markers (fallback)
  if [ -z "$APPLIED_IDS" ] && [ -z "$SKIPPED_IDS" ]; then
    if [ -f "$PATTERNS_FILE" ]; then
      for pattern in $(echo "$PATTERNS" | jq -c '.[]' 2>/dev/null); do
        TITLE=$(echo "$pattern" | jq -r '.title // ""')
        PID=$(echo "$pattern" | jq -r '.id // .pattern_id // ""')
        if echo "$LAST_ASSISTANT" | grep -qF "[ekkOS_APPLY]" && echo "$LAST_ASSISTANT" | grep -qF "$TITLE"; then
          APPLIED_IDS="${APPLIED_IDS}${PID},"
        fi
      done
      APPLIED_IDS=$(echo "$APPLIED_IDS" | sed 's/,$//')
    fi
  fi
fi

APPLIED_PATTERN_IDS="$APPLIED_IDS"

# ═══════════════════════════════════════════════════════════════════════════
# [ekkOS_VALIDATE] Footer Compliance Check
# ═══════════════════════════════════════════════════════════════════════════
FOOTER_PRESENT="false"
if [ -n "$LAST_ASSISTANT" ]; then
  FOOTER_PRESENT=$(check_footer_present "$LAST_ASSISTANT")
fi

# ═══════════════════════════════════════════════════════════════════════════
# [ekkOS_COMPLIANCE] Build compliance metadata and determine status
# ═══════════════════════════════════════════════════════════════════════════
IS_COMPLIANT=$(is_turn_compliant "$RETRIEVAL_OK" "$PATTERN_GUARD_COVERAGE" "$FOOTER_PRESENT" "$PATTERN_COUNT")
VIOLATION_REASON=$(get_violation_reason "$RETRIEVAL_OK" "$PATTERN_GUARD_COVERAGE" "$FOOTER_PRESENT" "$PATTERN_COUNT")

COMPLIANCE_METADATA=$(build_compliance_metadata \
  "$RETRIEVAL_OK" \
  "$PATTERN_GUARD_COVERAGE" \
  "$FOOTER_PRESENT" \
  "${EKKOS_STRICT:-0}" \
  "$PATTERN_COUNT")

# ═══════════════════════════════════════════════════════════════════════════
# ANSI Color Codes for Terminal Styling
# ═══════════════════════════════════════════════════════════════════════════
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
MAGENTA='\033[0;35m'
BLUE='\033[0;34m'
WHITE='\033[1;37m'
RED='\033[0;31m'
DIM='\033[2m'
BOLD='\033[1m'
RESET='\033[0m'

echo ""

# ═══════════════════════════════════════════════════════════════════════════
# [ekkOS_COMPLIANCE_REPORT] Show compliance status
# ═══════════════════════════════════════════════════════════════════════════
echo -e "${CYAN}${BOLD}[[[[ｅｋｋＯＳ＿Ｃｏｍｐｌｉａｎｃｅ]]]]${RESET}"
echo ""

# PatternGuard status
if [ "$PATTERN_COUNT" -gt 0 ]; then
  if [ "$PATTERN_GUARD_COVERAGE" -eq 100 ]; then
    echo -e "  ${GREEN}✓${RESET} PatternGuard: ${GREEN}100%${RESET} coverage (all $PATTERN_COUNT patterns acknowledged)"
  else
    echo -e "  ${RED}✗${RESET} PatternGuard: ${RED}${PATTERN_GUARD_COVERAGE}%${RESET} coverage (${PATTERN_COUNT} patterns, some unacknowledged)"
  fi
else
  echo -e "  ${DIM}○${RESET} PatternGuard: ${DIM}N/A${RESET} (no patterns retrieved)"
fi

# Footer status
if [ "$FOOTER_PRESENT" = "true" ]; then
  echo -e "  ${GREEN}✓${RESET} Footer: ${GREEN}present${RESET}"
else
  echo -e "  ${RED}✗${RESET} Footer: ${RED}missing${RESET} (must end with 🧠 **ekkOS_™** · 📅)"
fi

# Retrieval status
if [ "$RETRIEVAL_OK" = "true" ]; then
  echo -e "  ${GREEN}✓${RESET} Retrieval: ${GREEN}succeeded${RESET}"
else
  echo -e "  ${YELLOW}⚠${RESET} Retrieval: ${YELLOW}not confirmed${RESET}"
fi

# Overall compliance
if [ "$IS_COMPLIANT" = "true" ]; then
  echo ""
  echo -e "  ${GREEN}${BOLD}✓ GOLDEN LOOP COMPLIANT${RESET}"
else
  echo ""
  echo -e "  ${RED}${BOLD}✗ GOLDEN LOOP VIOLATION: ${VIOLATION_REASON}${RESET}"
fi

echo ""

# ═══════════════════════════════════════════════════════════════════════════
# [ekkOS_LEARN_DETECT] Check for manual forge markers in response
# ═══════════════════════════════════════════════════════════════════════════
FORGE_COUNT=0
if [ -n "$LAST_ASSISTANT" ]; then
  FORGE_MARKERS=$(echo "$LAST_ASSISTANT" | grep -oE '\[ekkOS_LEARN\][^"]*"[^"]+"' || true)

  if [ -n "$FORGE_MARKERS" ]; then
    echo -e "${YELLOW}+${RESET} ${YELLOW}[[[[ｅｋｋＯＳ＿Ｌｅａｒｎ ｄｅｔｅｃｔ]]]]${RESET} ${DIM}found forge markers${RESET}"

    while IFS= read -r marker; do
      [ -z "$marker" ] && continue
      PATTERN_TITLE=$(echo "$marker" | grep -oE '"[^"]+"' | head -1 | tr -d '"')
      if [ -n "$PATTERN_TITLE" ]; then
        echo -e "  ${GREEN}+${RESET} forging: \"$PATTERN_TITLE\""
        FORGE_COUNT=$((FORGE_COUNT + 1))

        # Send to forge endpoint (background, non-blocking)
        (
          FORGE_RESPONSE=$(curl -s -X POST "$MEMORY_API_URL/api/v1/patterns" \
            -H "Authorization: Bearer $AUTH_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{
              \"title\": $(echo "$PATTERN_TITLE" | jq -R .),
              \"problem\": $(echo "${LAST_USER:0:500}" | jq -R -s .),
              \"solution\": $(echo "${LAST_ASSISTANT:0:2000}" | jq -R -s .),
              \"tags\": [\"hook-detected\", \"golden-loop\", \"claude-code\"],
              \"source\": \"claude-code-hook\",
              \"confidence\": 0.85
            }" \
            --connect-timeout 5 \
            --max-time 10 2>/dev/null || echo '{"error":"timeout"}')

          if echo "$FORGE_RESPONSE" | jq -e '.pattern_id // .id' >/dev/null 2>&1; then
            PID=$(echo "$FORGE_RESPONSE" | jq -r '.pattern_id // .id')
            echo -e "  ${GREEN}✓${RESET} forged ${DIM}(ID: ${PID:0:8}...)${RESET}" >&2
          fi
        ) &
      fi
    done <<< "$FORGE_MARKERS"
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════
# [ekkOS_AUTO_FORGE_VIOLATION] Auto-forge anti-pattern for violations
# ═══════════════════════════════════════════════════════════════════════════
if [ "$IS_COMPLIANT" != "true" ] && [ -n "$LAST_USER" ]; then
  echo -e "${YELLOW}+${RESET} ${YELLOW}[[[[ｅｋｋＯＳ＿Ａｎｔｉ-Ｐａｔｔｅｒｎ]]]]${RESET} ${DIM}recording violation${RESET}"

  # Forge anti-pattern in background
  (
    ANTIPATTERN_TITLE="Golden Loop Violation: $VIOLATION_REASON"
    ANTIPATTERN_PROBLEM="Response did not comply with Golden Loop requirements. Violations: $VIOLATION_REASON. PatternGuard coverage: ${PATTERN_GUARD_COVERAGE}%. Footer present: $FOOTER_PRESENT."
    ANTIPATTERN_SOLUTION="Ensure: 1) All retrieved pattern IDs are acknowledged with [ekkOS_SELECT] or [ekkOS_SKIP], 2) Response ends with footer: 🧠 **ekkOS_™** · 📅 YYYY-MM-DD, 3) Retrieval succeeds before answering."

    curl -s -X POST "$MEMORY_API_URL/api/v1/patterns" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"title\": $(echo "$ANTIPATTERN_TITLE" | jq -R .),
        \"problem\": $(echo "$ANTIPATTERN_PROBLEM" | jq -R -s .),
        \"solution\": $(echo "$ANTIPATTERN_SOLUTION" | jq -R -s .),
        \"tags\": [\"anti-pattern\", \"golden-loop-violation\", \"claude-code\", \"compliance\"],
        \"source\": \"claude-code-hook-enforcement\",
        \"confidence\": 0.7,
        \"anti_patterns\": [\"Skipping PatternGuard acknowledgment\", \"Omitting footer\", \"Answering without retrieval\"]
      }" \
      --connect-timeout 5 \
      --max-time 10 >/dev/null 2>&1 || true
  ) &
fi

# ═══════════════════════════════════════════════════════════════════════════
# [ekkOS_CAPTURE] Send data to backend - backend does ALL the work
# ═══════════════════════════════════════════════════════════════════════════
CAPTURED="false"
if [ -n "$LAST_USER" ] && [ -n "$LAST_ASSISTANT" ]; then
  echo -e "${CYAN}+${RESET} ${CYAN}[[[[ｅｋｋＯＳ＿Ｃａｐｔｕｒｅ]]]]${RESET} ${DIM}sending to memory substrate${RESET}"

  # Build payload with ALL the data including compliance metadata
  JSON_PAYLOAD=$(cat << EOF
{
  "user_query": $(echo "$LAST_USER" | jq -R -s .),
  "assistant_response": $(echo "$LAST_ASSISTANT" | jq -R -s .),
  "session_id": "claude-code-${SESSION_ID}",
  "user_id": "${USER_ID:-system}",
  "patterns_retrieved": $(echo "$PATTERN_IDS" | jq -R 'split(",") | map(select(. != ""))'),
  "patterns_applied": $(echo "$APPLIED_PATTERN_IDS" | jq -R 'split(",") | map(select(. != ""))'),
  "metadata": {
    "source": "claude-code",
    "model_used": "$MODEL_USED",
    "patterns_retrieved_count": $PATTERN_COUNT,
    "patterns_applied_count": $(echo "$APPLIED_PATTERN_IDS" | grep -o "," | wc -l | xargs echo),
    "task_id": "$TASK_ID",
    "captured_at": "$TIMESTAMP",
    "auto_apply_detection": true,
    "user_id": "${USER_ID:-system}",
    "compliance": {
      "retrieval_ok": $RETRIEVAL_OK,
      "pattern_guard_coverage_pct": $PATTERN_GUARD_COVERAGE,
      "footer_present": $FOOTER_PRESENT,
      "is_compliant": $IS_COMPLIANT,
      "violation_reason": "$VIOLATION_REASON",
      "ekkos_strict": ${EKKOS_STRICT:-0}
    }
  }
}
EOF
)

  # Single API call - backend handles everything asynchronously
  CAPTURE_RESPONSE=$(curl -s -X POST "$MEMORY_API_URL/api/v1/memory/capture" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$JSON_PAYLOAD" \
    --connect-timeout 5 \
    --max-time 10 2>/dev/null || echo '{"error":"timeout"}')

  if echo "$CAPTURE_RESPONSE" | jq -e '.conversation_id' >/dev/null 2>&1; then
    CONV_ID=$(echo "$CAPTURE_RESPONSE" | jq -r '.conversation_id')
    echo -e "  ${GREEN}+${RESET} saved ${DIM}(ID: ${CONV_ID:0:8}...)${RESET}"
    echo -e "${BLUE}+${RESET} ${BLUE}[[[[ｅｋｋＯＳ＿Ａｎａｌｙｚｅ]]]]${RESET} ${DIM}queued for async processing${RESET}"
    CAPTURED="true"
  else
    echo -e "  ${RED}-${RESET} failed to save"
  fi
else
  echo -e "${DIM}-${RESET} ${DIM}[[[[ｅｋｋＯＳ＿Ｃａｐｔｕｒｅ]]]]${RESET} ${DIM}skipped (no content)${RESET}"
fi

# Cleanup state file
rm -f "$PATTERNS_FILE" 2>/dev/null

# Cleanup turn contract ONLY after successful capture
if [ "$CAPTURED" = "true" ]; then
  cleanup_turn_contract "$SESSION_ID" "claude-code" "$PROJECT_ROOT"
fi

# ═══════════════════════════════════════════════════════════════════════════
# [ekkOS_REFLEX] Send turn_end event to trigger 3-Judge evaluation
# ═══════════════════════════════════════════════════════════════════════════
REFLEX_API_URL="${REFLEX_API_URL:-https://mcp.ekkos.dev/api/v1/reflex/log}"

if [ "$CAPTURED" = "true" ] && [ -n "$LAST_USER" ] && [ -n "$LAST_ASSISTANT" ]; then
  echo -e "${YELLOW}+${RESET} ${YELLOW}[[[[ｅｋｋＯＳ＿３-Ｊｕｄｇｅs]]]]${RESET} ${DIM}triggering consensus evaluation${RESET}"

  # Build reflex event payload with compliance data
  REFLEX_PAYLOAD=$(cat << EOF
{
  "action": "turn_end",
  "summary": $(echo "Claude Code session: ${LAST_USER:0:100}..." | jq -R -s .),
  "details": {
    "user_query": $(echo "$LAST_USER" | jq -R -s .),
    "assistant_response": $(echo "${LAST_ASSISTANT:0:2000}" | jq -R -s .),
    "source": "claude-code",
    "model_used": "$MODEL_USED",
    "patterns_retrieved": $PATTERN_COUNT,
    "patterns_applied": $(echo "$APPLIED_PATTERN_IDS" | tr ',' '\n' | grep -c . || echo "0"),
    "session_id": "claude-code-${SESSION_ID}",
    "timestamp": "$TIMESTAMP",
    "compliance": {
      "retrieval_ok": $RETRIEVAL_OK,
      "pattern_guard_coverage_pct": $PATTERN_GUARD_COVERAGE,
      "footer_present": $FOOTER_PRESENT,
      "is_compliant": $IS_COMPLIANT,
      "violation_reason": "$VIOLATION_REASON"
    }
  },
  "learn": {
    "lookups": $PATTERN_COUNT,
    "reuse": $(echo "$APPLIED_PATTERN_IDS" | tr ',' '\n' | grep -c . || echo "0"),
    "saves": $FORGE_COUNT,
    "abstain": 0
  },
  "context": {
    "source": "claude-code",
    "task_id": "$TASK_ID"
  }
}
EOF
)

  # Send to cloud reflex API (background, non-blocking)
  (
    REFLEX_RESPONSE=$(curl -s -X POST "$REFLEX_API_URL" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -d "$REFLEX_PAYLOAD" \
      --connect-timeout 5 \
      --max-time 10 2>/dev/null || echo '{"error":"timeout"}')

    if echo "$REFLEX_RESPONSE" | jq -e '.id' >/dev/null 2>&1; then
      REFLEX_ID=$(echo "$REFLEX_RESPONSE" | jq -r '.id')
      echo -e "  ${GREEN}+${RESET} event queued ${DIM}(ID: ${REFLEX_ID:0:8}...)${RESET}" >&2
    else
      echo -e "  ${YELLOW}-${RESET} cloud API unavailable ${DIM}(event not logged)${RESET}" >&2
    fi
  ) &
fi

# ═══════════════════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${CYAN}${BOLD}[[[[ｅｋｋＯＳ＿Ｇｏｌｄｅｎ ｌｏｏｐ]]]]${RESET}"
echo ""

# Status summary
if [ "$CAPTURED" = "true" ]; then
  echo -e "  ${GREEN}+${RESET} capture: saved to substrate"
  echo -e "  ${GREEN}+${RESET} 3-judge: consensus eval queued"
else
  echo -e "  ${DIM}-${RESET} capture: skipped (no content)"
fi
echo -e "  ${GREEN}+${RESET} patterns: ${PATTERN_COUNT} retrieved"
if [ "$FORGE_COUNT" -gt 0 ]; then
  echo -e "  ${GREEN}+${RESET} forged: ${FORGE_COUNT} new patterns (from [ekkOS_LEARN] markers)"
fi
echo -e "  ${GREEN}+${RESET} analyze: async backend processing"

# Compliance summary
if [ "$IS_COMPLIANT" = "true" ]; then
  echo -e "  ${GREEN}+${RESET} compliance: ${GREEN}PASS${RESET}"
else
  echo -e "  ${RED}-${RESET} compliance: ${RED}FAIL${RESET} (${VIOLATION_REASON})"
fi

echo ""

exit 0
