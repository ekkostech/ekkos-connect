#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# ekkOS_ Hook: UserPromptSubmit (Claude Code) - CAPTURE + RETRIEVE + INJECT
#
# ARCHITECTURE: Dumb Hook, Smart Backend
# ═══════════════════════════════════════════════════════════════════════════
# This hook does THREE things:
# 1. CAPTURE the PREVIOUS exchange (user query + assistant response) - FIRST
# 2. RETRIEVE patterns for the NEW query - SECOND
# 3. INJECT patterns into context for the AI to use - THIRD
#
# This ensures every turn is captured and patterns are always available.
# ═══════════════════════════════════════════════════════════════════════════

# Don't use set -e - we want graceful degradation
set +e

# Get project root (calculate BEFORE sourcing state.sh)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

# Load shared state management (with error handling)
if [ -f "$SCRIPT_DIR/lib/state.sh" ]; then
  # Override PROJECT_ROOT in state.sh by setting it before sourcing
  export PROJECT_ROOT
  source "$SCRIPT_DIR/lib/state.sh" 2>/dev/null || {
    # Fallback if state.sh fails
    :;
  }
  # Ensure PROJECT_ROOT is correct (state.sh might have changed it)
  PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
else
  # No state.sh - define minimal fallback functions
  :;
fi

# Define fallback functions (in case state.sh didn't define them)
if ! command -v save_patterns >/dev/null 2>&1; then
  save_patterns() { :; }
fi
if ! command -v acquire_lock >/dev/null 2>&1; then
  acquire_lock() { return 0; }
fi
if ! command -v release_lock >/dev/null 2>&1; then
  release_lock() { :; }
fi
if ! command -v generate_turn_hash >/dev/null 2>&1; then
  generate_turn_hash() { echo "$(date +%s)"; }
fi
if ! command -v was_turn_captured >/dev/null 2>&1; then
  was_turn_captured() { return 1; }
fi
if ! command -v mark_turn_captured >/dev/null 2>&1; then
  mark_turn_captured() { :; }
fi

# Read JSON input
INPUT=$(cat)
USER_QUERY=$(echo "$INPUT" | jq -r '.query // .message // .prompt // ""')
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')
MODEL_INFO=$(echo "$INPUT" | jq -r '.model // "claude-sonnet-4-5"')
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // ""')

# Skip if empty
if [ -z "$USER_QUERY" ] || [ "$USER_QUERY" = "null" ]; then
  exit 0
fi

# ═══════════════════════════════════════════════════════════════════════════
# Load auth token - PORTABLE: Check 3 sources in priority order
# ═══════════════════════════════════════════════════════════════════════════
EKKOS_CONFIG="$HOME/.ekkos/config.json"
AUTH_TOKEN=""

# 1. First try ~/.ekkos/config.json (set by VS Code extension - most portable)
USER_ID=""
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

# Cloud API - ALWAYS use production (portable!)
MEMORY_API_URL="https://mcp.ekkos.dev"

# ═══════════════════════════════════════════════════════════════════════════
# ANSI Color Codes for Terminal Styling
# ═══════════════════════════════════════════════════════════════════════════
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
MAGENTA='\033[0;35m'
BLUE='\033[0;34m'
WHITE='\033[1;37m'
DIM='\033[2m'
BOLD='\033[1m'
RESET='\033[0m'

# Visual header
echo ""
echo -e "${CYAN}${BOLD}🧠 ekkOS Memory${RESET}"

# ═══════════════════════════════════════════════════════════════════════════
# [ekkOS_CAPTURE] Capture the PREVIOUS exchange before processing new one
# ═══════════════════════════════════════════════════════════════════════════

# Acquire lock to prevent race conditions
if acquire_lock "$SESSION_ID"; then
  if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
    # Extract last user query and assistant response from transcript
    # Get the second-to-last user message (the previous one, not current)
    PREV_USER=$(cat "$TRANSCRIPT_PATH" | jq -s '
      [.[] | select(.type == "human")] |
      if length > 1 then .[-2].message else null end
    ' 2>/dev/null | jq -r 'if . then . else "" end' 2>/dev/null || echo "")

    # Get the last assistant response (which responded to PREV_USER)
    PREV_ASSISTANT=$(cat "$TRANSCRIPT_PATH" | jq -s '
      [.[] | select(.type == "assistant")] |
      if length > 0 then .[-1].message.content | if type == "array" then map(select(.type == "text").text) | join(" ") else . end else null end
    ' 2>/dev/null | jq -r 'if . then . else "" end' 2>/dev/null || echo "")

    # Capture if we have both and haven't already captured this exact exchange
    if [ -n "$PREV_USER" ] && [ -n "$PREV_ASSISTANT" ] && [ "$PREV_USER" != "null" ] && [ "$PREV_ASSISTANT" != "null" ]; then
      PREV_HASH=$(generate_turn_hash "$PREV_USER" "$PREV_ASSISTANT")

      if ! was_turn_captured "$SESSION_ID" "$PREV_HASH"; then
      # Capture in background (don't slow down the hook)
      (
        CAPTURE_PAYLOAD=$(jq -n \
          --arg user "$PREV_USER" \
          --arg assistant "$PREV_ASSISTANT" \
          --arg session "claude-code-$SESSION_ID" \
          --arg model "$MODEL_INFO" \
          '{
            user_query: $user,
            assistant_response: $assistant,
            session_id: $session,
            metadata: {
              source: "claude-code-hook",
              model_used: $model,
              captured_at: (now | todate)
            }
          }')

        curl -s -X POST "$MEMORY_API_URL/api/v1/memory/capture" \
          -H "Authorization: Bearer $AUTH_TOKEN" \
          -H "Content-Type: application/json" \
          -d "$CAPTURE_PAYLOAD" \
          --connect-timeout 3 \
          --max-time 5 >/dev/null 2>&1 || true

        mark_turn_captured "$SESSION_ID" "$PREV_HASH"
      ) &

      echo -e "${CYAN}   💾 Capture${RESET} ${DIM}saving previous turn${RESET}"
      fi
    fi
  fi

  release_lock "$SESSION_ID"
fi

# ═══════════════════════════════════════════════════════════════════════════
# [ekkOS_RETRIEVE] Single API call - backend handles ALL the work
# ═══════════════════════════════════════════════════════════════════════════
# CRITICAL: Use very short timeouts to avoid blocking Claude
# If gateway is slow, skip retrieval and continue (graceful degradation)
echo -e "${MAGENTA}   🔍 Retrieve${RESET} ${DIM}searching memory substrate...${RESET}"

# Skip retrieval if no auth token (don't block)
if [ -z "$AUTH_TOKEN" ]; then
  echo -e "${DIM}   ⚠️  Retrieve${RESET} ${DIM}skipped (no auth)${RESET}"
  API_RESPONSE='{"error":"no_auth","formatted_context":"","layers":{"patterns":[],"directives":[]}}'
else
  # Include user_id in payload if available (from ekkos-connect login)
  JSON_PAYLOAD=$(jq -n \
    --arg query "$USER_QUERY" \
    --arg session "claude-code-$SESSION_ID" \
    --arg model "$MODEL_INFO" \
    --arg user_id "${USER_ID:-system}" \
    '{
      query: $query,
      user_id: $user_id,
      session_id: $session,
      max_per_layer: 5,
      include_layers: ["working", "episodic", "semantic", "patterns", "procedural", "collective", "codebase", "directives"],
      metadata: {
        source: "claude-code",
        model_used: $model
      }
    }' 2>/dev/null || echo '{}')

  # Make API call with VERY short timeout (0.5s connect, 0.8s total) - don't block Claude
  # If gateway is slow, return empty results immediately (graceful degradation)
  API_RESPONSE=$(curl -s -X POST "$MEMORY_API_URL/api/v1/context/retrieve" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$JSON_PAYLOAD" \
    --connect-timeout 1 \
    --max-time 1 2>/dev/null || echo '{"error":"timeout","formatted_context":"","layers":{"patterns":[],"directives":[]}}')
  
  # If we got a timeout or error, use empty results immediately
  if ! echo "$API_RESPONSE" | jq -e '.layers' >/dev/null 2>&1; then
    API_RESPONSE='{"error":"timeout","formatted_context":"","layers":{"patterns":[],"directives":[]}}'
  fi
fi

# Extract counts for summary (all 8 queryable layers)
PATTERN_COUNT=$(echo "$API_RESPONSE" | jq '.layers.patterns // [] | length' 2>/dev/null || echo "0")
DIRECTIVE_COUNT=$(echo "$API_RESPONSE" | jq '.layers.directives // [] | length' 2>/dev/null || echo "0")
EPISODIC_COUNT=$(echo "$API_RESPONSE" | jq '.layers.episodic // [] | length' 2>/dev/null || echo "0")
PROCEDURAL_COUNT=$(echo "$API_RESPONSE" | jq '.layers.procedural // [] | length' 2>/dev/null || echo "0")
CODEBASE_COUNT=$(echo "$API_RESPONSE" | jq '.layers.codebase // [] | length' 2>/dev/null || echo "0")
TOTAL_COUNT=$((PATTERN_COUNT + DIRECTIVE_COUNT + EPISODIC_COUNT + PROCEDURAL_COUNT + CODEBASE_COUNT))

# ═══════════════════════════════════════════════════════════════════════════
# [ekkOS_INJECT] Output the formatted context from backend
# ═══════════════════════════════════════════════════════════════════════════
if [ "$TOTAL_COUNT" -gt 0 ]; then
  echo -e "${GREEN}   ✨ Inject${RESET}  ${GREEN}${TOTAL_COUNT}${RESET} ${DIM}memories loaded (${PATTERN_COUNT} patterns, ${DIRECTIVE_COUNT} directives)${RESET}"
  echo ""

  # Output the pre-formatted context from backend
  FORMATTED=$(echo "$API_RESPONSE" | jq -r '.formatted_context // ""' 2>/dev/null)

  if [ -n "$FORMATTED" ] && [ "$FORMATTED" != "null" ]; then
    echo "$FORMATTED"
  else
    # Fallback: structured output with actionable markers

    # Patterns - the core proven solutions
    if [ "$PATTERN_COUNT" -gt 0 ]; then
      echo "## Pattern Memory (Layer 4) - Directive Compliant"
      echo "Proven solutions:"
      echo "$API_RESPONSE" | jq -r '.layers.patterns[:5][] | "\(.title // "Untitled")\n   Problem: \(.problem // "N/A" | .[0:200])\n   Solution: \(.solution // "N/A" | .[0:300])\n   Success Rate: \(.success_rate // 0)%\n"' 2>/dev/null || true
    fi

    # Directives - user preferences that override patterns
    if [ "$DIRECTIVE_COUNT" -gt 0 ]; then
      echo "## Directive Memory (Layer 9) - HIGHEST PRIORITY"
      echo "User rules that MUST be followed:"
      echo "$API_RESPONSE" | jq -r '.layers.directives[:5][] | "   [\(.type // "PREFER")] \(.rule // .content // "No rule")"' 2>/dev/null || true
      echo ""
    fi

    # Procedural - step-by-step workflows
    if [ "$PROCEDURAL_COUNT" -gt 0 ]; then
      echo "## Procedural Memory (Layer 5)"
      echo "Multi-step workflows:"
      echo "$API_RESPONSE" | jq -r '.layers.procedural[:3][] | "   • \(.title // .name // "Workflow")"' 2>/dev/null || true
      echo ""
    fi

    # Episodic - similar past conversations
    if [ "$EPISODIC_COUNT" -gt 0 ]; then
      echo "## Episodic Memory (Layer 2)"
      echo "Similar past conversations:"
      echo "$API_RESPONSE" | jq -r '.layers.episodic[:3][] | "   • \(.query_preview // .problem // "Previous session" | .[0:100])..."' 2>/dev/null || true
      echo ""
    fi

    # Codebase - project-specific patterns
    if [ "$CODEBASE_COUNT" -gt 0 ]; then
      echo "## Codebase Memory (Layer 8)"
      echo "Project-specific knowledge:"
      echo "$API_RESPONSE" | jq -r '.layers.codebase[:3][] | "   • \(.file_path // .title // "Code pattern")"' 2>/dev/null || true
      echo ""
    fi
  fi
else
  echo -e "${DIM}   📭 Inject${RESET}  ${DIM}no matching patterns found${RESET}"
  echo ""
fi

# Save patterns for stop.sh (to include in capture) - non-blocking
PATTERNS=$(echo "$API_RESPONSE" | jq '.layers.patterns // []' 2>/dev/null || echo "[]")
save_patterns "$SESSION_ID" "$PATTERNS" "$MODEL_INFO" 2>/dev/null || true

# CRITICAL: Always exit successfully (don't block Claude even if gateway fails)
# The gateway is a "nice to have" - Claude should work without it
exit 0
