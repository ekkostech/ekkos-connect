#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# ekkOS_ Hook: SessionStart - MINIMAL + AUTO-RESTORE + TIME MACHINE CONTINUE
# ═══════════════════════════════════════════════════════════════════════════
# This hook does THREE things:
# 1. Check for pending Time Machine "Continue from here" requests
# 2. Initialize session tracking
# 3. Auto-restore from L2 if recent turns exist (FAST TRIM support)
#
# TIME MACHINE FLOW:
# User clicks "Continue from here" on web → API queues request →
# User runs `claude` → This hook detects pending request →
# Restores THAT session's context → Seamless time travel!
#
# FAST TRIM FLOW:
# User runs /clear → session-start detects fresh session →
# Checks L2 for recent turns → Auto-injects last 15 turns → Seamless continuity
# ═══════════════════════════════════════════════════════════════════════════

set +e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // ""')
SOURCE=$(echo "$INPUT" | jq -r '.source // "unknown"')  # "startup", "resume", or "clear"

# ═══════════════════════════════════════════════════════════════════════════
# Load auth
# ═══════════════════════════════════════════════════════════════════════════
EKKOS_CONFIG="$HOME/.ekkos/config.json"
AUTH_TOKEN=""
USER_ID=""

if [ -f "$EKKOS_CONFIG" ]; then
  AUTH_TOKEN=$(jq -r '.hookApiKey // .apiKey // ""' "$EKKOS_CONFIG" 2>/dev/null || echo "")
  USER_ID=$(jq -r '.userId // ""' "$EKKOS_CONFIG" 2>/dev/null || echo "")
fi

if [ -z "$AUTH_TOKEN" ] && [ -f "$PROJECT_ROOT/.env.local" ]; then
  AUTH_TOKEN=$(grep -E "^SUPABASE_SECRET_KEY=" "$PROJECT_ROOT/.env.local" | cut -d'=' -f2- | tr -d '"' | tr -d "'" | tr -d '\r')
fi

[ -z "$AUTH_TOKEN" ] && exit 0

MEMORY_API_URL="https://mcp.ekkos.dev"

# ═══════════════════════════════════════════════════════════════════════════
# TIME MACHINE: Check for pending "Continue from here" requests
# ═══════════════════════════════════════════════════════════════════════════
RESTORE_REQUEST_ID="${EKKOS_RESTORE:-}"
TIME_MACHINE_SESSION=""
TIME_MACHINE_FROM_TURN=""
TIME_MACHINE_TO_TURN=""

# Check via env var first, then API
if [ -n "$RESTORE_REQUEST_ID" ]; then
  echo -e "\033[0;35m⏰ Time Machine request detected: $RESTORE_REQUEST_ID\033[0m" >&2
fi

# Check API for pending requests (if we have user_id)
if [ -z "$TIME_MACHINE_SESSION" ] && [ -n "$USER_ID" ]; then
  PENDING_RESPONSE=$(curl -s -X GET "$MEMORY_API_URL/api/v1/context/restore-request/pending?user_id=$USER_ID" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    --connect-timeout 2 \
    --max-time 3 2>/dev/null || echo '{}')

  IS_PENDING=$(echo "$PENDING_RESPONSE" | jq -r '.pending // false' 2>/dev/null)

  if [ "$IS_PENDING" = "true" ]; then
    TIME_MACHINE_SESSION=$(echo "$PENDING_RESPONSE" | jq -r '.request.session_id // ""')
    TIME_MACHINE_FROM_TURN=$(echo "$PENDING_RESPONSE" | jq -r '.request.from_turn // ""')
    TIME_MACHINE_TO_TURN=$(echo "$PENDING_RESPONSE" | jq -r '.request.to_turn // ""')
    RESTORE_REQUEST_ID=$(echo "$PENDING_RESPONSE" | jq -r '.request.request_id // ""')

    if [ -n "$TIME_MACHINE_SESSION" ]; then
      echo "" >&2
      echo -e "\033[0;35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m" >&2
      echo -e "\033[0;35m\033[1m⏰ TIME MACHINE\033[0m \033[2m| Restoring session from web request...\033[0m" >&2
      echo -e "\033[0;35m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\033[0m" >&2

      # Mark request as consumed
      curl -s -X POST "$MEMORY_API_URL/api/v1/context/restore-request/consume" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"request_id\": \"$RESTORE_REQUEST_ID\"}" \
        --connect-timeout 2 \
        --max-time 3 >/dev/null 2>&1 || true
    fi
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════
# Session ID persistence - PROJECT-LOCAL for isolation
# ═══════════════════════════════════════════════════════════════════════════
STATE_DIR="$PROJECT_ROOT/.claude/state"
mkdir -p "$STATE_DIR" 2>/dev/null || true
SESSION_FILE="$STATE_DIR/current-session.json"

# Project-local session storage (isolated per project)
PROJECT_SESSION_DIR="$STATE_DIR/sessions"
mkdir -p "$PROJECT_SESSION_DIR" 2>/dev/null || true

# Use Claude's RAW_SESSION_ID directly (from session_id field)
CURRENT_SESSION_ID="$SESSION_ID"

# Find most recent session in THIS PROJECT for auto-restore
MOST_RECENT_SESSION=""
SAVED_TURN_COUNT=0

if [ -n "$CURRENT_SESSION_ID" ] && [ "$CURRENT_SESSION_ID" != "unknown" ]; then
  # Check if THIS session has saved turns (for /clear continuity)
  TURN_COUNTER_FILE="$PROJECT_SESSION_DIR/${CURRENT_SESSION_ID}.turn"
  if [ -f "$TURN_COUNTER_FILE" ]; then
    SAVED_TURN_COUNT=$(cat "$TURN_COUNTER_FILE" 2>/dev/null || echo "0")
    MOST_RECENT_SESSION="$CURRENT_SESSION_ID"
  else
    # Fresh start: find most recent session in project
    MOST_RECENT_FILE=$(ls -t "$PROJECT_SESSION_DIR"/*.turn 2>/dev/null | head -1)
    if [ -n "$MOST_RECENT_FILE" ]; then
      MOST_RECENT_SESSION=$(basename "$MOST_RECENT_FILE" .turn)
      SAVED_TURN_COUNT=$(cat "$MOST_RECENT_FILE" 2>/dev/null || echo "0")
    fi
  fi
fi

# Save current session info
if [ -n "$CURRENT_SESSION_ID" ]; then
  cat > "$SESSION_FILE" << EOF
{
  "session_id": "$CURRENT_SESSION_ID",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "project_root": "$PROJECT_ROOT"
}
EOF
fi

# ═══════════════════════════════════════════════════════════════════════════
# 🔄 GOLDEN LOOP: Initialize session tracking file
# ═══════════════════════════════════════════════════════════════════════════
GOLDEN_LOOP_FILE="$PROJECT_ROOT/.ekkos/golden-loop-current.json"
mkdir -p "$PROJECT_ROOT/.ekkos" 2>/dev/null || true

# Initialize with session start state
jq -n \
  --arg phase "idle" \
  --argjson turn 0 \
  --arg session "${CURRENT_SESSION_ID}" \
  --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  '{
    phase: $phase,
    turn: $turn,
    session: $session,
    timestamp: $timestamp,
    stats: {
      retrieved: 0,
      applied: 0,
      forged: 0
    }
  }' > "$GOLDEN_LOOP_FILE" 2>/dev/null || true

# ═══════════════════════════════════════════════════════════════════════════
# COLORS
# ═══════════════════════════════════════════════════════════════════════════
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
MAGENTA='\033[0;35m'
DIM='\033[2m'
BOLD='\033[1m'
RESET='\033[0m'

# ═══════════════════════════════════════════════════════════════════════════
# AUTO-RESTORE REMOVED: Manual /continue only (saves 79% token burn!)
# ═══════════════════════════════════════════════════════════════════════════
# WHY REMOVED:
# - Auto-restore burned 5,000 tokens per turn on session start
# - Manual /continue: one-time cost + clean slate (79% token savings!)
# - Manual /continue is 10x more powerful (Bash + multi-source + narrative)
#
# KEPT: Time Machine feature (explicit user request)
# ═══════════════════════════════════════════════════════════════════════════

# Handle Time Machine requests (explicit user action)
if [ -n "$TIME_MACHINE_SESSION" ]; then
  echo "" >&2
  echo -e "${MAGENTA}${BOLD}⏰ TIME MACHINE${RESET} ${DIM}| Restoring past session: ${TIME_MACHINE_SESSION:0:12}...${RESET}" >&2

  # Build recall request with turn range
  RECALL_BODY="{\"session_id\": \"${TIME_MACHINE_SESSION}\", \"last_n\": 15, \"format\": \"summary\"}"

  if [ -n "$TIME_MACHINE_FROM_TURN" ] && [ -n "$TIME_MACHINE_TO_TURN" ]; then
    RECALL_BODY="{\"session_id\": \"${TIME_MACHINE_SESSION}\", \"from_turn\": ${TIME_MACHINE_FROM_TURN}, \"to_turn\": ${TIME_MACHINE_TO_TURN}, \"format\": \"summary\"}"
  elif [ -n "$TIME_MACHINE_FROM_TURN" ]; then
    RECALL_BODY="{\"session_id\": \"${TIME_MACHINE_SESSION}\", \"from_turn\": ${TIME_MACHINE_FROM_TURN}, \"format\": \"summary\"}"
  fi

  # Fetch turns from L2
  RESTORE_RESPONSE=$(curl -s -X POST "$MEMORY_API_URL/api/v1/turns/recall" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$RECALL_BODY" \
    --connect-timeout 3 \
    --max-time 5 2>/dev/null || echo '{"error":"timeout"}')

  # Check if we got turns back
  RESTORED_COUNT=$(echo "$RESTORE_RESPONSE" | jq '.turns // [] | length' 2>/dev/null || echo "0")

  if [ "$RESTORED_COUNT" -gt 0 ]; then
    echo -e "${MAGENTA}   ✓${RESET} Restored ${RESTORED_COUNT} turns from past session" >&2
    echo "" >&2
    echo -e "${MAGENTA}${BOLD}## Time Machine Context${RESET}" >&2
    echo "" >&2

    # Output the turns as context (stderr for user, stdout for Claude)
    TURNS_OUTPUT=$(echo "$RESTORE_RESPONSE" | jq -r '.turns[]? | "**Turn \(.turn_number // "?")**: \(.user_query[:100] // "...")...\n> \(.assistant_response[:200] // "...")...\n"' 2>/dev/null || true)
    echo "$TURNS_OUTPUT" >&2
    echo "$TURNS_OUTPUT"  # Also to stdout for Claude's context

    echo "" >&2
    echo -e "${DIM}You've traveled to a past session. Continue from here!${RESET}" >&2
    echo "" >&2
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════
# DIRECTIVE RETRIEVAL: Fetch user's MUST/NEVER/PREFER/AVOID rules
# ═══════════════════════════════════════════════════════════════════════════
DIRECTIVES_INJECTED=false
DIRECTIVE_COUNT=0

# Only fetch if we have auth
if [ -n "$AUTH_TOKEN" ]; then
  # Fetch directives (top 20 by priority to avoid token bloat)
  DIRECTIVES_RESPONSE=$(curl -s -X GET "$MEMORY_API_URL/api/v1/memory/directives?limit=20" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    --connect-timeout 2 \
    --max-time 3 2>/dev/null || echo '{}')

  # Parse response
  DIRECTIVE_COUNT=$(echo "$DIRECTIVES_RESPONSE" | jq '.count // 0' 2>/dev/null || echo "0")

  if [ "$DIRECTIVE_COUNT" -gt 0 ]; then
    DIRECTIVES_INJECTED=true

    # Extract MUST/NEVER/PREFER/AVOID arrays
    MUST_RULES=$(echo "$DIRECTIVES_RESPONSE" | jq -r '.MUST[]?.rule // empty' 2>/dev/null | head -5)
    NEVER_RULES=$(echo "$DIRECTIVES_RESPONSE" | jq -r '.NEVER[]?.rule // empty' 2>/dev/null | head -5)
    PREFER_RULES=$(echo "$DIRECTIVES_RESPONSE" | jq -r '.PREFER[]?.rule // empty' 2>/dev/null | head -5)
    AVOID_RULES=$(echo "$DIRECTIVES_RESPONSE" | jq -r '.AVOID[]?.rule // empty' 2>/dev/null | head -5)

    # Build compact directive block for injection
    echo "<system-reminder>"
    echo "USER DIRECTIVES (FOLLOW THESE):"
    echo ""

    if [ -n "$MUST_RULES" ]; then
      echo "MUST:"
      echo "$MUST_RULES" | while read -r rule; do
        [ -n "$rule" ] && echo "  • $rule"
      done
    fi

    if [ -n "$NEVER_RULES" ]; then
      echo "NEVER:"
      echo "$NEVER_RULES" | while read -r rule; do
        [ -n "$rule" ] && echo "  • $rule"
      done
    fi

    if [ -n "$PREFER_RULES" ]; then
      echo "PREFER:"
      echo "$PREFER_RULES" | while read -r rule; do
        [ -n "$rule" ] && echo "  • $rule"
      done
    fi

    if [ -n "$AVOID_RULES" ]; then
      echo "AVOID:"
      echo "$AVOID_RULES" | while read -r rule; do
        [ -n "$rule" ] && echo "  • $rule"
      done
    fi

    echo "</system-reminder>"

    echo -e "${GREEN}📋 ${DIRECTIVE_COUNT} directives loaded${RESET}" >&2
  fi
fi

# Simple status display (no auto-restore)
if [ "$SAVED_TURN_COUNT" -gt 0 ]; then
  # New session or few turns - just show status
  echo "" >&2
  if [ "$SAVED_TURN_COUNT" -gt 0 ]; then
    echo -e "${CYAN}${BOLD}🧠 ekkOS${RESET} ${DIM}|${RESET} Session: ${CURRENT_SESSION_ID:-$SESSION_ID} ${DIM}|${RESET} ${GREEN}${SAVED_TURN_COUNT} turns${RESET}" >&2
  else
    echo -e "${CYAN}${BOLD}🧠 ekkOS${RESET} ${DIM}|${RESET} Session: ${CURRENT_SESSION_ID:-$SESSION_ID} ${DIM}| New session${RESET}" >&2
  fi
fi

# Final confirmation that's always visible
if [ -n "$TIME_MACHINE_SESSION" ]; then
  echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}" >&2
  echo -e "${MAGENTA}⏰${RESET} Time Machine active · Restored from session ${TIME_MACHINE_SESSION:0:12}..." >&2
  echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}" >&2
elif [ "$SAVED_TURN_COUNT" -gt 0 ]; then
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}" >&2
  echo -e "${GREEN}✓${RESET} Session continued · ${SAVED_TURN_COUNT} turns preserved · Ready to resume" >&2
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}" >&2
else
  echo -e "${CYAN}✓${RESET} New session started" >&2
fi
echo "" >&2

exit 0
