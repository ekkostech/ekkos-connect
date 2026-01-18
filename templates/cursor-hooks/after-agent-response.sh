#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# ekkOS_ Hook: AfterAgentResponse (Cursor Agent Mode)
#
# Captures agent responses for turn storage in ekkOS L2 (episodic memory)
# This enables Time Machine to work with Cursor Agent conversations
# ═══════════════════════════════════════════════════════════════════════════

set +e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
STATE_DIR="$PROJECT_ROOT/.cursor/state"
mkdir -p "$STATE_DIR" 2>/dev/null || true

# Read JSON input
INPUT=$(cat)

# Extract response text
RESPONSE_TEXT=$(echo "$INPUT" | jq -r '.text // ""' 2>/dev/null || echo "")

# Skip if empty
if [ -z "$RESPONSE_TEXT" ] || [ "$RESPONSE_TEXT" = "null" ]; then
  exit 0
fi

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
# Load session state
# ═══════════════════════════════════════════════════════════════════════════
SESSION_ID=""
LAST_QUERY=""

if [ -f "$STATE_DIR/current_session_id.txt" ]; then
  SESSION_ID=$(cat "$STATE_DIR/current_session_id.txt" 2>/dev/null || echo "")
fi

if [ -f "$STATE_DIR/last_query.txt" ]; then
  LAST_QUERY=$(cat "$STATE_DIR/last_query.txt" 2>/dev/null || echo "")
fi

# Generate session ID if missing
if [ -z "$SESSION_ID" ]; then
  SESSION_ID="cursor-agent-$(date +%s)-$$"
  echo "$SESSION_ID" > "$STATE_DIR/current_session_id.txt"
fi

# ═══════════════════════════════════════════════════════════════════════════
# Get turn number
# ═══════════════════════════════════════════════════════════════════════════
TURN_FILE="$STATE_DIR/turn_${SESSION_ID}.txt"
TURN_NUMBER=1
if [ -f "$TURN_FILE" ]; then
  TURN_NUMBER=$(cat "$TURN_FILE" 2>/dev/null || echo "0")
  TURN_NUMBER=$((TURN_NUMBER + 1))
fi
echo "$TURN_NUMBER" > "$TURN_FILE"

# ═══════════════════════════════════════════════════════════════════════════
# Capture turn to ekkOS L2
# ═══════════════════════════════════════════════════════════════════════════
# Only capture if we have a query to pair with
if [ -n "$LAST_QUERY" ]; then
  # Truncate for API limits
  QUERY_TRUNCATED="${LAST_QUERY:0:10000}"
  RESPONSE_TRUNCATED="${RESPONSE_TEXT:0:50000}"

  CAPTURE_PAYLOAD=$(jq -n \
    --arg session_id "cursor-agent-$SESSION_ID" \
    --arg user_id "${USER_ID:-system}" \
    --arg user_query "$QUERY_TRUNCATED" \
    --arg assistant_response "$RESPONSE_TRUNCATED" \
    --argjson turn_number "$TURN_NUMBER" \
    '{
      session_id: $session_id,
      user_id: $user_id,
      user_query: $user_query,
      assistant_response: $assistant_response,
      metadata: {
        source: "cursor-agent",
        turn_number: $turn_number,
        agent_mode: true
      }
    }' 2>/dev/null || echo '{}')

  # Fire and forget - don't block agent
  curl -s -X POST "$MEMORY_API_URL/api/v1/capture" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$CAPTURE_PAYLOAD" \
    --connect-timeout 2 \
    --max-time 3 >/dev/null 2>&1 &

  # Clear last query
  rm -f "$STATE_DIR/last_query.txt" 2>/dev/null || true
fi

exit 0
