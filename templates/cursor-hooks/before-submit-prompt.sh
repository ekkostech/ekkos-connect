#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# ekkOS_ Hook: BeforeSubmitPrompt (Cursor) - RETRIEVE + INJECT
#
# ARCHITECTURE: Dumb Hook, Smart Backend
# ═══════════════════════════════════════════════════════════════════════════
# This hook runs BEFORE the prompt is sent to the AI.
# It retrieves patterns and injects them into context.
# ═══════════════════════════════════════════════════════════════════════════

# Read JSON input from stdin
INPUT=$(cat)

# Extract prompt text
PROMPT_TEXT=$(echo "$INPUT" | jq -r '.prompt // .text // ""')

# Skip if empty
if [ -z "$PROMPT_TEXT" ] || [ "$PROMPT_TEXT" = "null" ]; then
  echo '{"continue": true}'
  exit 0
fi

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

# 2. Then try environment variable
if [ -z "$AUTH_TOKEN" ]; then
  AUTH_TOKEN="${SUPABASE_SERVICE_ROLE_KEY:-}"
fi

# Skip if no auth
if [ -z "$AUTH_TOKEN" ]; then
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
  '{
    query: $query,
    user_id: $user_id,
    session_id: "cursor-hook",
    max_per_layer: 5,
    include_layers: ["working", "episodic", "semantic", "patterns", "procedural", "collective", "codebase", "directives"],
    metadata: { source: "cursor-hook" }
  }')

API_RESPONSE=$(curl -s -X POST "$MEMORY_API_URL/api/v1/context/retrieve" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD" \
  --connect-timeout 3 \
  --max-time 5 2>/dev/null || echo '{"error":"timeout"}')

# Extract pattern count
PATTERN_COUNT=$(echo "$API_RESPONSE" | jq '.layers.patterns // [] | length' 2>/dev/null || echo "0")

# ═══════════════════════════════════════════════════════════════════════════
# [ekkOS_INJECT] Build user message with patterns
# ═══════════════════════════════════════════════════════════════════════════
if [ "$PATTERN_COUNT" -gt 0 ]; then
  # Get formatted context
  FORMATTED=$(echo "$API_RESPONSE" | jq -r '.formatted_context // ""' 2>/dev/null)

  if [ -n "$FORMATTED" ] && [ "$FORMATTED" != "null" ]; then
    MESSAGE="━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧠 ekkOS_Retrieving
✓ $PATTERN_COUNT patterns loaded from memory
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$FORMATTED"
  else
    MESSAGE="🧠 ekkOS: $PATTERN_COUNT patterns found"
  fi

  echo "{\"continue\": true, \"user_message\": $(echo "$MESSAGE" | jq -R -s .)}" | jq -c .
else
  echo '{"continue": true}'
fi

exit 0
