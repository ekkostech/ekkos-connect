#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# ekkOS_ Hook: Stop (Cursor Agent Mode)
#
# Fires when agent iteration completes. Can:
# 1. Clear Time Machine consumed flag (allow new requests)
# 2. Capture session summary
# 3. Optionally submit follow-up message
# ═══════════════════════════════════════════════════════════════════════════

set +e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
STATE_DIR="$PROJECT_ROOT/.cursor/state"

# Read JSON input
INPUT=$(cat)

# Extract status
STATUS=$(echo "$INPUT" | jq -r '.status // "unknown"' 2>/dev/null || echo "unknown")
LOOP_COUNT=$(echo "$INPUT" | jq -r '.loop_count // 0' 2>/dev/null || echo "0")

# ═══════════════════════════════════════════════════════════════════════════
# Clear Time Machine flag on session end (allow new requests next session)
# ═══════════════════════════════════════════════════════════════════════════
if [ "$STATUS" = "completed" ] || [ "$STATUS" = "aborted" ]; then
  rm -f "$STATE_DIR/time-machine-consumed.flag" 2>/dev/null || true
fi

# ═══════════════════════════════════════════════════════════════════════════
# Optional: Load auth for session summary
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

# ═══════════════════════════════════════════════════════════════════════════
# Log session end (fire and forget)
# ═══════════════════════════════════════════════════════════════════════════
if [ -n "$AUTH_TOKEN" ]; then
  SESSION_ID=""
  if [ -f "$STATE_DIR/current_session_id.txt" ]; then
    SESSION_ID=$(cat "$STATE_DIR/current_session_id.txt" 2>/dev/null || echo "")
  fi

  TURN_COUNT=0
  TURN_FILE="$STATE_DIR/turn_${SESSION_ID}.txt"
  if [ -f "$TURN_FILE" ]; then
    TURN_COUNT=$(cat "$TURN_FILE" 2>/dev/null || echo "0")
  fi

  # Could capture session end event here
  # For now, just clean up

  # Clean up turn counter for next session
  # (commented out - might want to persist across agent runs)
  # rm -f "$TURN_FILE" 2>/dev/null || true
fi

# ═══════════════════════════════════════════════════════════════════════════
# Return empty response (no follow-up)
# ═══════════════════════════════════════════════════════════════════════════
echo '{}'

exit 0
