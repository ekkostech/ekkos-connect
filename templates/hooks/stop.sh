#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# ekkOS_ Hook: Stop (Claude Code) - SIMPLIFIED
#
# ARCHITECTURE: Dumb Hook, Smart Backend
# ═══════════════════════════════════════════════════════════════════════════
# This hook just CAPTURES data. All intelligence runs in the backend:
# - Pattern detection (semantic, not text matching)
# - Success judgment (LLM-based)
# - Outcome recording
# - Auto-forging new patterns
#
# The capture endpoint triggers async analysis. The hook doesn't wait.
# This makes the hook fast and reliable.
# ═══════════════════════════════════════════════════════════════════════════

# Don't use set -e here - we want graceful degradation
set +e

# Get project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
STATE_DIR="$PROJECT_ROOT/.claude/state"
mkdir -p "$STATE_DIR" 2>/dev/null || true

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
  AUTH_TOKEN=$(grep -E "^SUPABASE_SERVICE_ROLE_KEY=" "$PROJECT_ROOT/.env.local" | cut -d'=' -f2- | tr -d '"' | tr -d "'" | tr -d '\r')
fi

# 3. Finally try environment variable (for CI/CD or manual setup)
if [ -z "$AUTH_TOKEN" ]; then
  AUTH_TOKEN="${SUPABASE_SERVICE_ROLE_KEY:-}"
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

  # PATTERN ACKNOWLEDGMENT DETECTION (PatternGuard)
  # 1. [ekkOS_SELECT] - patterns that were applied (preferred)
  # 2. [ekkOS_SKIP] - patterns explicitly skipped (new)
  # 3. [ekkOS_APPLY] - legacy marker (fallback)
  # Coverage = (applied + skipped) / total retrieved
  if [ -n "$LAST_ASSISTANT" ] && [ "$PATTERN_COUNT" -gt 0 ]; then
    APPLIED_IDS=""
    SKIPPED_IDS=""

    # Check for structured [ekkOS_SELECT] block (applied patterns)
    SELECT_BLOCK=$(echo "$LAST_ASSISTANT" | grep -ozP '\[ekkOS_SELECT\][\s\S]*?\[/ekkOS_SELECT\]' 2>/dev/null | tr '\0' '\n' || true)

    if [ -n "$SELECT_BLOCK" ]; then
      # Extract pattern IDs from YAML-like format: "- id: <uuid>"
      SELECTED_IDS=$(echo "$SELECT_BLOCK" | grep -oE 'id:\s*[a-f0-9-]+' | sed 's/id:\s*//' || true)

      for pid in $SELECTED_IDS; do
        # Validate it's a real UUID (or short ID)
        if [ -n "$pid" ] && [ ${#pid} -ge 8 ]; then
          APPLIED_IDS="${APPLIED_IDS}${pid},"
          echo "[ekkOS_SELECT] Applied: ${pid:0:8}..." >&2
        fi
      done
    fi

    # NEW: Check for [ekkOS_SKIP] block (skipped patterns with reason)
    SKIP_BLOCK=$(echo "$LAST_ASSISTANT" | grep -ozP '\[ekkOS_SKIP\][\s\S]*?\[/ekkOS_SKIP\]' 2>/dev/null | tr '\0' '\n' || true)

    if [ -n "$SKIP_BLOCK" ]; then
      # Extract skipped pattern IDs
      SKIP_IDS=$(echo "$SKIP_BLOCK" | grep -oE 'id:\s*[a-f0-9-]+' | sed 's/id:\s*//' || true)

      for pid in $SKIP_IDS; do
        if [ -n "$pid" ] && [ ${#pid} -ge 8 ]; then
          SKIPPED_IDS="${SKIPPED_IDS}${pid},"
          echo "[ekkOS_SKIP] Skipped: ${pid:0:8}..." >&2
        fi
      done
    fi

    # Calculate coverage (PatternGuard metric)
    TOTAL_RETRIEVED=$PATTERN_COUNT
    APPLIED_COUNT=$(echo "$APPLIED_IDS" | tr ',' '\n' | grep -c '.' || echo 0)
    SKIPPED_COUNT=$(echo "$SKIPPED_IDS" | tr ',' '\n' | grep -c '.' || echo 0)
    ACKNOWLEDGED=$((APPLIED_COUNT + SKIPPED_COUNT))

    if [ "$TOTAL_RETRIEVED" -gt 0 ]; then
      COVERAGE=$((ACKNOWLEDGED * 100 / TOTAL_RETRIEVED))
      if [ "$COVERAGE" -lt 100 ]; then
        echo -e "${YELLOW}[PatternGuard] Coverage: ${COVERAGE}% (${ACKNOWLEDGED}/${TOTAL_RETRIEVED} patterns acknowledged)${RESET}" >&2
      else
        echo -e "${GREEN}[PatternGuard] 100% coverage - all patterns acknowledged${RESET}" >&2
      fi
    fi

    # LEGACY: Check for [ekkOS_APPLY] markers (fallback if no SELECT block)
    if [ -z "$APPLIED_IDS" ] && [ -z "$SKIPPED_IDS" ]; then
      for pattern in $(echo "$PATTERNS" | jq -c '.[]'); do
        TITLE=$(echo "$pattern" | jq -r '.title // ""')
        PID=$(echo "$pattern" | jq -r '.id // .pattern_id // ""')

        # Only count as applied if AI explicitly marked it with [ekkOS_APPLY]
        if echo "$LAST_ASSISTANT" | grep -qF "[ekkOS_APPLY]" && echo "$LAST_ASSISTANT" | grep -qF "$TITLE"; then
          APPLIED_IDS="${APPLIED_IDS}${PID},"
          echo "[ekkOS_APPLY_DETECTED] Pattern: \"$TITLE\"" >&2
        fi
      done
    fi

    APPLIED_PATTERN_IDS=$(echo "$APPLIED_IDS" | sed 's/,$//')
    SKIPPED_PATTERN_IDS=$(echo "$SKIPPED_IDS" | sed 's/,$//')
  fi
fi

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
# [ekkOS_LEARN_DETECT] Check for manual forge markers in response
# If AI output [ekkOS_LEARN] tags, extract and send to forge endpoint
# This enforces the Golden Loop - AI just outputs marker, hook does the work
# ═══════════════════════════════════════════════════════════════════════════
FORGE_COUNT=0
if [ -n "$LAST_ASSISTANT" ]; then
  # Look for forge markers: [ekkOS_LEARN] Forging: "Title" or similar
  FORGE_MARKERS=$(echo "$LAST_ASSISTANT" | grep -oE '\[ekkOS_LEARN\][^"]*"[^"]+"' || true)

  if [ -n "$FORGE_MARKERS" ]; then
    echo -e "${YELLOW}+${RESET} ${YELLOW}[[[[ｅｋｋＯＳ＿Ｌｅａｒｎ ｄｅｔｅｃｔ]]]]${RESET} ${DIM}found forge markers${RESET}"

    # Extract pattern titles from markers and send to backend for forging
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
# [ekkOS_CAPTURE] Send data to backend - backend does ALL the work
# ═══════════════════════════════════════════════════════════════════════════
CAPTURED="false"
if [ -n "$LAST_USER" ] && [ -n "$LAST_ASSISTANT" ]; then
  echo -e "${CYAN}+${RESET} ${CYAN}[[[[ｅｋｋＯＳ＿Ｃａｐｔｕｒｅ]]]]${RESET} ${DIM}sending to memory substrate${RESET}"

  # Build payload with ALL the data - backend handles intelligence
  # CRITICAL: Include user_id so pattern_applications can be tracked per user
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
    "user_id": "${USER_ID:-system}"
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

# ═══════════════════════════════════════════════════════════════════════════
# [ekkOS_REFLEX] Send turn_end event to trigger 3-Judge evaluation
# PORTABLE: Uses cloud API by default (mcp.ekkos.dev), no local process needed
# ═══════════════════════════════════════════════════════════════════════════
REFLEX_API_URL="${REFLEX_API_URL:-https://mcp.ekkos.dev/api/v1/reflex/log}"

if [ "$CAPTURED" = "true" ] && [ -n "$LAST_USER" ] && [ -n "$LAST_ASSISTANT" ]; then
  echo -e "${YELLOW}+${RESET} ${YELLOW}[[[[ｅｋｋＯＳ＿３-Ｊｕｄｇｅs]]]]${RESET} ${DIM}triggering consensus evaluation${RESET}"

  # Build reflex event payload
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
    "timestamp": "$TIMESTAMP"
  },
  "learn": {
    "lookups": $PATTERN_COUNT,
    "reuse": $(echo "$APPLIED_PATTERN_IDS" | tr ',' '\n' | grep -c . || echo "0"),
    "saves": 0,
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
echo ""

exit 0
