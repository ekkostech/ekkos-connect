#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# ekkOS_ Hook: BeforeSubmitPrompt (Windsurf Cascade) - RETRIEVE + INJECT + CONTRACT
#
# ARCHITECTURE: Dumb Hook, Smart Backend
# ═══════════════════════════════════════════════════════════════════════════
# This hook runs BEFORE the prompt is sent to the AI.
# It is THE CANONICAL retrieval path for Windsurf.
#
# GOLDEN LOOP ENFORCEMENT:
# - Writes turn contract as evidence of retrieval
# - In STRICT mode, returns continue=false to block turn
# - Lists pattern IDs explicitly for PatternGuard validation
# ═══════════════════════════════════════════════════════════════════════════

set +e  # Don't exit on errors - be bulletproof

# Get project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
STATE_DIR="$PROJECT_ROOT/.windsurf/state"
mkdir -p "$STATE_DIR" 2>/dev/null || true

# Load turn contract library
if [ -f "$SCRIPT_DIR/lib/contract.sh" ]; then
  source "$SCRIPT_DIR/lib/contract.sh" 2>/dev/null || true
fi

# Fallback functions if library didn't load
if ! command -v write_turn_contract >/dev/null 2>&1; then
  write_turn_contract() { return 0; }
fi
if ! command -v generate_query_hash >/dev/null 2>&1; then
  generate_query_hash() { echo "$(date +%s)"; }
fi
if ! command -v is_strict_mode >/dev/null 2>&1; then
  is_strict_mode() { [ "${EKKOS_STRICT:-0}" = "1" ]; }
fi
if ! command -v get_strict_blocker_message >/dev/null 2>&1; then
  get_strict_blocker_message() { echo "⛔ EKKOS_STRICT: Retrieval failed - DO NOT ANSWER"; }
fi

# Read JSON input from stdin
INPUT=$(cat)

# Extract prompt text and session info
PROMPT_TEXT=$(echo "$INPUT" | jq -r '.prompt // .text // ""' 2>/dev/null || echo "")
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // .conversation_id // ""' 2>/dev/null || echo "")
MODEL_INFO=$(echo "$INPUT" | jq -r '.model // ""' 2>/dev/null || echo "")

# Generate session ID if not provided
if [ -z "$SESSION_ID" ] || [ "$SESSION_ID" = "null" ]; then
  SESSION_ID="windsurf-$(date +%s)-$$"
fi

# Skip if empty
if [ -z "$PROMPT_TEXT" ] || [ "$PROMPT_TEXT" = "null" ]; then
  echo '{"continue": true}'
  exit 0
fi

# Generate query hash for contract
QUERY_HASH=$(generate_query_hash "$PROMPT_TEXT")

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

# 2. Then try project .env.local (for developers)
if [ -z "$AUTH_TOKEN" ] && [ -f "$PROJECT_ROOT/.env.local" ]; then
  AUTH_TOKEN=$(grep -E "^SUPABASE_SECRET_KEY=" "$PROJECT_ROOT/.env.local" | cut -d'=' -f2- | tr -d '"' | tr -d "'" | tr -d '\r')
fi

# 3. Finally try environment variable
if [ -z "$AUTH_TOKEN" ]; then
  AUTH_TOKEN="${SUPABASE_SECRET_KEY:-}"
fi

# Track retrieval status
RETRIEVAL_OK="false"
RETRIEVED_PATTERN_IDS=""
RETRIEVED_DIRECTIVE_IDS=""

# Skip if no auth
if [ -z "$AUTH_TOKEN" ]; then
  # STRICT MODE: Block turn if no auth
  if is_strict_mode; then
    BLOCKER_MSG=$(get_strict_blocker_message)
    write_turn_contract "$SESSION_ID" "false" "windsurf" "" "" "$QUERY_HASH" "$PROJECT_ROOT"
    echo "{\"continue\": false, \"user_message\": $(echo "$BLOCKER_MSG" | jq -R -s .)}"
    exit 0
  fi

  write_turn_contract "$SESSION_ID" "false" "windsurf" "" "" "$QUERY_HASH" "$PROJECT_ROOT"
  echo '{"continue": true, "user_message": "[ekkOS] No auth token. Run ekkOS: Connect in VS Code."}'
  exit 0
fi

# Cloud API
MEMORY_API_URL="https://mcp.ekkos.dev"

# ═══════════════════════════════════════════════════════════════════════════
# [ekkOS_RETRIEVE] Search memory for patterns (all 8 queryable layers)
# ═══════════════════════════════════════════════════════════════════════════
JSON_PAYLOAD=$(jq -n \
  --arg query "$PROMPT_TEXT" \
  --arg user_id "${USER_ID:-system}" \
  --arg session "windsurf-$SESSION_ID" \
  '{
    query: $query,
    user_id: $user_id,
    session_id: $session,
    max_per_layer: 5,
    include_layers: ["working", "episodic", "semantic", "patterns", "procedural", "collective", "codebase", "directives"],
    metadata: { source: "windsurf-cascade-hook" }
  }' 2>/dev/null || echo '{}')

API_RESPONSE=$(curl -s -X POST "$MEMORY_API_URL/api/v1/context/retrieve" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD" \
  --connect-timeout 3 \
  --max-time 5 2>/dev/null || echo '{"error":"timeout"}')

# Check if retrieval succeeded
if echo "$API_RESPONSE" | jq -e '.layers' >/dev/null 2>&1; then
  RETRIEVAL_OK="true"
else
  # STRICT MODE: Block turn if retrieval failed
  if is_strict_mode; then
    BLOCKER_MSG=$(get_strict_blocker_message)
    write_turn_contract "$SESSION_ID" "false" "windsurf" "" "" "$QUERY_HASH" "$PROJECT_ROOT"
    echo "{\"continue\": false, \"user_message\": $(echo "$BLOCKER_MSG" | jq -R -s .)}"
    exit 0
  fi

  API_RESPONSE='{"error":"timeout","formatted_context":"","layers":{"patterns":[],"directives":[]}}'
fi

# Extract counts
PATTERN_COUNT=$(echo "$API_RESPONSE" | jq '.layers.patterns // [] | length' 2>/dev/null || echo "0")
DIRECTIVE_COUNT=$(echo "$API_RESPONSE" | jq '.layers.directives // [] | length' 2>/dev/null || echo "0")
TOTAL_COUNT=$((PATTERN_COUNT + DIRECTIVE_COUNT))

# Extract pattern and directive IDs for turn contract
RETRIEVED_PATTERN_IDS=$(echo "$API_RESPONSE" | jq -r '.layers.patterns // [] | map(.pattern_id // .id) | join(",")' 2>/dev/null || echo "")
RETRIEVED_DIRECTIVE_IDS=$(echo "$API_RESPONSE" | jq -r '.layers.directives // [] | map(.directive_id // .id) | join(",")' 2>/dev/null || echo "")

# ═══════════════════════════════════════════════════════════════════════════
# [ekkOS_CONTRACT] Write turn contract as evidence of retrieval
# ═══════════════════════════════════════════════════════════════════════════
write_turn_contract "$SESSION_ID" "$RETRIEVAL_OK" "windsurf" "$RETRIEVED_PATTERN_IDS" "$RETRIEVED_DIRECTIVE_IDS" "$QUERY_HASH" "$PROJECT_ROOT"

# Save session ID to state file
echo "$SESSION_ID" > "$STATE_DIR/current_session_id.txt" 2>/dev/null || true

# ═══════════════════════════════════════════════════════════════════════════
# [ekkOS_INJECT] Build user message with patterns
# ═══════════════════════════════════════════════════════════════════════════
if [ "$PATTERN_COUNT" -gt 0 ]; then
  # Get formatted context
  FORMATTED=$(echo "$API_RESPONSE" | jq -r '.formatted_context // ""' 2>/dev/null)

  # Get pattern IDs for PatternGuard
  PATTERN_ID_LIST=$(echo "$API_RESPONSE" | jq -r '.layers.patterns[:5][] | .pattern_id // .id' 2>/dev/null || echo "")

  if [ -n "$FORMATTED" ] && [ "$FORMATTED" != "null" ]; then
    MESSAGE="━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 ekkOS™ Memory Substrate
✓ $PATTERN_COUNT patterns loaded from memory
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$FORMATTED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  PATTERNGUARD REQUIRED

You MUST acknowledge ALL $PATTERN_COUNT pattern(s) above.

Pattern IDs to acknowledge:
$PATTERN_ID_LIST

For patterns you USE:
[ekkOS_SELECT]
- id: <pattern-uuid>
  reason: <why using>
  confidence: <0.0-1.0>
[/ekkOS_SELECT]

For patterns you DO NOT use:
[ekkOS_SKIP]
- id: <pattern-uuid>
  reason: <why not relevant>
[/ekkOS_SKIP]

Coverage MUST be 100% (all IDs acknowledged).

RESPONSE FORMAT: End with:
🧠 **ekkOS_™** · 📅 YYYY-MM-DD H:MM AM/PM TZ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  else
    # Fallback: minimal injection
    MESSAGE="━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 ekkOS™: $PATTERN_COUNT patterns found

Pattern IDs to acknowledge with [ekkOS_SELECT] or [ekkOS_SKIP]:
$PATTERN_ID_LIST

End response with: 🧠 **ekkOS_™** · 📅 YYYY-MM-DD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  fi

  # Save patterns for capture
  echo "$API_RESPONSE" | jq '.layers.patterns // []' > "$STATE_DIR/patterns-${SESSION_ID}.json" 2>/dev/null || true

  echo "{\"continue\": true, \"user_message\": $(echo "$MESSAGE" | jq -R -s .)}" | jq -c .
else
  # No patterns - still write contract and remind about footer
  MESSAGE="━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 ekkOS™: No patterns found (new territory)

End response with: 🧠 **ekkOS_™** · 📅 YYYY-MM-DD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  echo "{\"continue\": true, \"user_message\": $(echo "$MESSAGE" | jq -R -s .)}" | jq -c .
fi

exit 0
