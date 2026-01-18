#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# ekkOS_ Hook: Stop - FULL CONTEXT CAPTURE
# ═══════════════════════════════════════════════════════════════════════════
# Captures FULL turn content to L2 (episodic memory):
# - Full user query
# - Full assistant response (no truncation)
# - Complete file changes with edit content (old_string → new_string)
# ═══════════════════════════════════════════════════════════════════════════

set +e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"
STATE_DIR="$PROJECT_ROOT/.claude/state"

INPUT=$(cat)

RAW_SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // ""')
MODEL_USED=$(echo "$INPUT" | jq -r '.model // "claude-sonnet-4-5"')

# DEBUG: Log hook input (full INPUT for debugging)
echo "[ekkOS DEBUG] $(date -u +%H:%M:%S) stop.sh: session=$RAW_SESSION_ID, transcript_path=$TRANSCRIPT_PATH" >> "$HOME/.ekkos/capture-debug.log" 2>/dev/null
echo "[ekkOS DEBUG] $(date -u +%H:%M:%S) stop.sh: transcript exists=$([ -f "$TRANSCRIPT_PATH" ] && echo 'yes' || echo 'no')" >> "$HOME/.ekkos/capture-debug.log" 2>/dev/null
echo "[ekkOS DEBUG] INPUT keys: $(echo "$INPUT" | jq -r 'keys | join(",")')" >> "$HOME/.ekkos/capture-debug.log" 2>/dev/null

# ═══════════════════════════════════════════════════════════════════════════
# Session ID - Try Claude's input first, fallback to state file
# ═══════════════════════════════════════════════════════════════════════════
SESSION_ID="$RAW_SESSION_ID"

# Fallback: Read from state file if input doesn't have valid session_id
if [ -z "$SESSION_ID" ] || [ "$SESSION_ID" = "unknown" ] || [ "$SESSION_ID" = "null" ]; then
  STATE_FILE="$HOME/.claude/state/current-session.json"
  if [ -f "$STATE_FILE" ]; then
    SESSION_ID=$(jq -r '.session_id // ""' "$STATE_FILE" 2>/dev/null || echo "")
  fi
fi

# Skip if still no valid session ID
if [ -z "$SESSION_ID" ] || [ "$SESSION_ID" = "unknown" ] || [ "$SESSION_ID" = "null" ]; then
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
# WORD-BASED SESSION NAMES: Convert UUID to memorable 3-word name
# Format: adj-noun-verb (e.g., "cosmic-penguin-runs")
# 100 × 100 × 100 = 1,000,000 combinations (vs 10,000 with 2-word)
# Matches server-side session-names.ts algorithm
# ═══════════════════════════════════════════════════════════════════════════
ADJECTIVES=(
  "cosmic" "turbo" "mega" "hyper" "quantum" "atomic" "stellar" "epic"
  "mighty" "groovy" "zippy" "snappy" "jazzy" "funky" "zesty" "peppy"
  "spicy" "crispy" "fluffy" "sparkly" "chunky" "bouncy" "bubbly" "sassy"
  "slick" "sleek" "bold" "nifty" "perky" "plucky" "witty" "nimble"
  "dapper" "fancy" "quirky" "punchy" "swift" "brave" "clever" "dandy"
  "eager" "fiery" "golden" "hasty" "icy" "jolly" "keen" "lively"
  "merry" "noble" "odd" "plush" "quick" "royal" "silly" "tidy"
  "ultra" "vivid" "wacky" "zany" "alpha" "beta" "cyber" "delta"
  "electric" "foggy" "giga" "hazy" "ionic" "jumpy" "kinky" "lunar"
  "magic" "nerdy" "omega" "pixel" "quaint" "retro" "solar" "techno"
  "unified" "viral" "wonky" "xerox" "yappy" "zen" "agile" "binary"
  "chrome" "disco" "elastic" "fizzy" "glossy" "humble" "itchy" "jiffy"
  "kooky" "loopy" "moody" "noisy"
)
NOUNS=(
  "penguin" "panda" "otter" "narwhal" "alpaca" "llama" "badger" "walrus"
  "waffle" "pickle" "noodle" "pretzel" "muffin" "taco" "nugget" "biscuit"
  "rocket" "comet" "nebula" "quasar" "meteor" "photon" "pulsar" "nova"
  "ninja" "pirate" "wizard" "robot" "yeti" "phoenix" "sphinx" "kraken"
  "thunder" "blizzard" "tornado" "avalanche" "mango" "kiwi" "banana" "coconut"
  "donut" "espresso" "falafel" "gyro" "hummus" "icecream" "jambon" "kebab"
  "latte" "mocha" "nachos" "olive" "pasta" "quinoa" "ramen" "sushi"
  "tamale" "udon" "velvet" "wasabi" "xmas" "yogurt" "ziti" "anchor"
  "beacon" "canyon" "drifter" "echo" "falcon" "glacier" "harbor" "island"
  "jetpack" "kayak" "lagoon" "meadow" "nebula" "orbit" "parrot" "quest"
  "rapids" "summit" "tunnel" "umbrella" "volcano" "whisper" "xylophone" "yacht"
  "zephyr" "acorn" "bobcat" "cactus" "dolphin" "eagle" "ferret" "gopher"
  "hedgehog" "iguana" "jackal" "koala"
)
VERBS=(
  "runs" "jumps" "flies" "swims" "dives" "soars" "glides" "dashes"
  "zooms" "zips" "spins" "twirls" "bounces" "floats" "drifts" "sails"
  "climbs" "leaps" "hops" "skips" "rolls" "slides" "surfs" "rides"
  "builds" "creates" "forges" "shapes" "crafts" "designs" "codes" "types"
  "thinks" "dreams" "learns" "grows" "blooms" "shines" "glows" "sparks"
  "sings" "hums" "calls" "beeps" "clicks" "taps" "pings" "chimes"
  "wins" "leads" "helps" "saves" "guards" "shields" "heals" "fixes"
  "starts" "begins" "launches" "ignites" "blazes" "flares" "bursts" "pops"
  "waves" "nods" "winks" "grins" "smiles" "laughs" "cheers" "claps"
  "seeks" "finds" "spots" "tracks" "hunts" "chases" "catches" "grabs"
  "pushes" "pulls" "lifts" "throws" "kicks" "punts" "bats" "swings"
  "reads" "writes" "draws" "paints" "sculpts" "carves" "molds" "weaves"
  "cooks" "bakes" "grills" "fries"
)

# Convert UUID to 3-word name deterministically
uuid_to_words() {
  local uuid="$1"
  local hex="${uuid//-/}"
  hex="${hex:0:12}"

  if [[ ! "$hex" =~ ^[0-9a-fA-F]+$ ]]; then
    echo "unknown-session-starts"
    return
  fi

  local adj_seed=$((16#${hex:0:4}))
  local noun_seed=$((16#${hex:4:4}))
  local verb_seed=$((16#${hex:8:4}))

  local adj_idx=$((adj_seed % ${#ADJECTIVES[@]}))
  local noun_idx=$((noun_seed % ${#NOUNS[@]}))
  local verb_idx=$((verb_seed % ${#VERBS[@]}))

  echo "${ADJECTIVES[$adj_idx]}-${NOUNS[$noun_idx]}-${VERBS[$verb_idx]}"
}

# Generate session name from UUID
SESSION_NAME=""
if [ -n "$SESSION_ID" ] && [ "$SESSION_ID" != "unknown" ] && [ "$SESSION_ID" != "null" ]; then
  SESSION_NAME=$(uuid_to_words "$SESSION_ID")
fi

# ═══════════════════════════════════════════════════════════════════════════
# Get turn number from local counter
# ═══════════════════════════════════════════════════════════════════════════
PROJECT_SESSION_DIR="$STATE_DIR/sessions"
TURN_COUNTER_FILE="$PROJECT_SESSION_DIR/${SESSION_ID}.turn"
TURN_NUMBER=1
[ -f "$TURN_COUNTER_FILE" ] && TURN_NUMBER=$(cat "$TURN_COUNTER_FILE" 2>/dev/null || echo "1")

# ═══════════════════════════════════════════════════════════════════════════
# AUTO-CLEAR DETECTION (EARLY): Must run BEFORE any early exits
# If context >= 92%, write flag for ekkos run wrapper immediately
# ═══════════════════════════════════════════════════════════════════════════
if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
  MAX_TOKENS=200000

  # Calculate context percentage
  if stat -f%z "$TRANSCRIPT_PATH" >/dev/null 2>&1; then
    FILE_SIZE=$(stat -f%z "$TRANSCRIPT_PATH")
  else
    FILE_SIZE=$(stat -c%s "$TRANSCRIPT_PATH" 2>/dev/null || echo "0")
  fi
  ROUGH_TOKENS=$((FILE_SIZE / 4))
  TOKEN_PERCENT=$((ROUGH_TOKENS * 100 / MAX_TOKENS))

  # More accurate in high-context scenarios
  if [ "$TOKEN_PERCENT" -gt 50 ]; then
    WORD_COUNT=$(wc -w < "$TRANSCRIPT_PATH" 2>/dev/null | tr -d ' ' || echo "0")
    TOKEN_PERCENT=$((WORD_COUNT * 13 / 10 * 100 / MAX_TOKENS))
  fi

  # If context >= 92%, write flag file for ekkos run wrapper
  if [ "$TOKEN_PERCENT" -ge 92 ]; then
    AUTO_CLEAR_FLAG="$HOME/.ekkos/auto-clear.flag"
    TIMESTAMP_EPOCH=$(date +%s)
    echo "${TOKEN_PERCENT}:${SESSION_NAME}:${TIMESTAMP_EPOCH}" > "$AUTO_CLEAR_FLAG"
    echo "[ekkOS] Context at ${TOKEN_PERCENT}% - auto-clear flag written (session: $SESSION_NAME)" >> "$HOME/.ekkos/capture-debug.log" 2>/dev/null
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════
# Check for interruption - skip capture if request was interrupted
# ═══════════════════════════════════════════════════════════════════════════
IS_INTERRUPTED=$(echo "$INPUT" | jq -r '.interrupted // false' 2>/dev/null || echo "false")
STOP_REASON=$(echo "$INPUT" | jq -r '.stop_reason // ""' 2>/dev/null || echo "")

# Skip capture for interrupted/cancelled requests
if [ "$IS_INTERRUPTED" = "true" ] || [ "$STOP_REASON" = "user_cancelled" ] || [ "$STOP_REASON" = "interrupted" ]; then
  exit 0
fi

# ═══════════════════════════════════════════════════════════════════════════
# Extract conversation from transcript
# ═══════════════════════════════════════════════════════════════════════════
LAST_USER=""
LAST_ASSISTANT=""
FILE_CHANGES="[]"

if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
  # Extract user messages:
  # Content can be STRING or ARRAY of {type: "text", text: "..."} objects
  # Filter out system prefixes (<) and tool_results
  LAST_USER=$(cat "$TRANSCRIPT_PATH" | jq -r '
    select(.type == "user")
    | .message.content
    | if type == "string" then
        if startswith("<") then empty else . end
      elif type == "array" then
        .[] | select(.type == "text") | .text | select(startswith("<") | not)
      else empty end
  ' 2>/dev/null | tail -1 || echo "")

  # DEBUG: Show what we extracted
  echo "[ekkOS DEBUG] LAST_USER length=${#LAST_USER}, first 50: '${LAST_USER:0:50}'" >> "$HOME/.ekkos/capture-debug.log" 2>/dev/null

  # Log if empty (but don't exit - we still want to try extracting assistant response)
  if [ -z "$LAST_USER" ]; then
    echo "[ekkOS] Turn $TURN_NUMBER: LAST_USER empty, will try to get assistant response anyway (session: $SESSION_NAME)" >> "$HOME/.ekkos/capture-debug.log" 2>/dev/null
    echo "[ekkOS DEBUG] Transcript line count: $(wc -l < "$TRANSCRIPT_PATH" 2>/dev/null || echo 0)" >> "$HOME/.ekkos/capture-debug.log" 2>/dev/null
    # Don't exit - continue to extract assistant response for local cache
  fi
  if [[ "$LAST_USER" == *"[Request interrupted"* ]] || \
     [[ "$LAST_USER" == *"interrupted by user"* ]]; then
    echo "[ekkOS] Turn $TURN_NUMBER skipped: interruption marker (session: $SESSION_NAME)" >> "$HOME/.ekkos/capture-debug.log" 2>/dev/null
    exit 0
  fi

  # Get timestamp of last valid user message (handles both string and array content)
  LAST_USER_TIME=$(cat "$TRANSCRIPT_PATH" | jq -r '
    select(.type == "user")
    | select(
        (.message.content | type == "string" and (startswith("<") | not)) or
        (.message.content | type == "array" and any(.[]; .type == "text" and (.text | startswith("<") | not)))
      )
    | .timestamp
  ' 2>/dev/null | tail -1 || echo "")

  if [ -n "$LAST_USER_TIME" ]; then
    # Get assistant response after user message - FULL CONTENT including tool calls
    # Captures: text blocks, tool_use (with name + input), and extended_thinking
    LAST_ASSISTANT=$(cat "$TRANSCRIPT_PATH" | jq -rs --arg time "$LAST_USER_TIME" '
      [.[] | select(.type == "assistant" and .timestamp > $time)] | last |
      .message.content |
      if type == "string" then .
      elif type == "array" then
        [.[] |
          if .type == "text" then .text
          elif .type == "tool_use" then
            "\n[TOOL: " + .name + "]\n" +
            (if .name == "Bash" then "$ " + (.input.command // "") + "\n"
             elif .name == "Read" then "Reading: " + (.input.file_path // "") + "\n"
             elif .name == "Write" then "Writing: " + (.input.file_path // "") + "\n"
             elif .name == "Edit" then "Editing: " + (.input.file_path // "") + "\n"
             elif .name == "Grep" then "Searching: " + (.input.pattern // "") + "\n"
             elif .name == "Glob" then "Finding: " + (.input.pattern // "") + "\n"
             elif .name == "WebFetch" then "Fetching: " + (.input.url // "") + "\n"
             elif .name == "Task" then "Agent: " + (.input.subagent_type // "") + " - " + (.input.description // "") + "\n"
             else (.input | tostring | .[0:500]) + "\n"
             end)
          elif .type == "thinking" then "\n[THINKING]\n" + (.thinking // .text // "") + "\n[/THINKING]\n"
          else empty
          end
        ] | join("")
      else empty end
    ' 2>/dev/null || echo "")

    # Also capture tool_results that follow this assistant message
    TOOL_RESULTS=$(cat "$TRANSCRIPT_PATH" | jq -rs --arg time "$LAST_USER_TIME" '
      [.[] | select(.timestamp > $time)] |
      # Get tool results between last assistant and next user message
      [.[] | select(.type == "tool_result" or (.type == "user" and (.message.content | type == "array") and (.message.content | any(.type == "tool_result"))))] |
      .[0:10] |  # Limit to first 10 tool results
      [.[] |
        if .type == "tool_result" then
          "\n[RESULT: " + (.tool_use_id // "unknown")[0:8] + "]\n" +
          (if (.content | type == "string") then (.content | .[0:2000])
           elif (.content | type == "array") then ([.content[] | select(.type == "text") | .text] | join("\n") | .[0:2000])
           else ""
           end) + "\n"
        elif .type == "user" then
          ([.message.content[] | select(.type == "tool_result") |
            "\n[RESULT: " + (.tool_use_id // "unknown")[0:8] + "]\n" +
            (if (.content | type == "string") then (.content | .[0:2000])
             elif (.content | type == "array") then ([.content[] | select(.type == "text") | .text] | join("\n") | .[0:2000])
             else ""
             end) + "\n"
          ] | join(""))
        else ""
        end
      ] | join("")
    ' 2>/dev/null || echo "")

    # Combine assistant response with tool results
    if [ -n "$TOOL_RESULTS" ]; then
      LAST_ASSISTANT="${LAST_ASSISTANT}${TOOL_RESULTS}"
    fi
  fi

  # Fallback: get last assistant message if timestamp method fails
  if [ -z "$LAST_ASSISTANT" ]; then
    LAST_ASSISTANT=$(cat "$TRANSCRIPT_PATH" | jq -rs '
      [.[] | select(.type == "assistant")] | last |
      .message.content |
      if type == "string" then .
      elif type == "array" then
        [.[] |
          if .type == "text" then .text
          elif .type == "tool_use" then
            "\n[TOOL: " + .name + "]\n" +
            (if .name == "Bash" then "$ " + (.input.command // "") + "\n"
             elif .name == "Read" then "Reading: " + (.input.file_path // "") + "\n"
             elif .name == "Write" then "Writing: " + (.input.file_path // "") + "\n"
             elif .name == "Edit" then "Editing: " + (.input.file_path // "") + "\n"
             else (.input | tostring | .[0:500]) + "\n"
             end)
          elif .type == "thinking" then "\n[THINKING]\n" + (.thinking // .text // "") + "\n[/THINKING]\n"
          else empty
          end
        ] | join("")
      else empty end
    ' 2>/dev/null || echo "")
  fi

  # Extract file changes WITH FULL EDIT CONTENT for perfect context restoration
  # Includes old_string/new_string for edits, content for writes
  FILE_CHANGES=$(cat "$TRANSCRIPT_PATH" | jq -s '
    [.[] | select(.type == "assistant") | .message.content[]? | select(.type == "tool_use") |
      select(.name == "Edit" or .name == "Write" or .name == "Read") |
      {
        tool: .name,
        path: (.input.file_path // .input.path),
        action: (if .name == "Edit" then "edit" elif .name == "Write" then "write" else "read" end),
        # Full edit details for context restoration
        old_string: (if .name == "Edit" then (.input.old_string // null) else null end),
        new_string: (if .name == "Edit" then (.input.new_string // null) else null end),
        # Write content (truncated to 2000 chars to avoid massive payloads)
        content: (if .name == "Write" then (.input.content[:2000] // null) else null end),
        replace_all: (if .name == "Edit" then (.input.replace_all // false) else null end)
      }
    ] | map(select(.path != null))
  ' 2>/dev/null || echo "[]")
fi

# ═══════════════════════════════════════════════════════════════════════════
# Capture to L2 (episodic memory) - SYNCHRONOUS for reliability
# Background was causing missed captures when Claude Code exits fast
# ═══════════════════════════════════════════════════════════════════════════
if [ -z "$LAST_ASSISTANT" ]; then
  echo "[ekkOS] Turn $TURN_NUMBER skipped: LAST_ASSISTANT empty (session: $SESSION_NAME)" >> "$HOME/.ekkos/capture-debug.log" 2>/dev/null
fi

if [ -n "$LAST_USER" ] && [ -n "$LAST_ASSISTANT" ]; then
  PAYLOAD_FILE=$(mktemp /tmp/ekkos-capture.XXXXXX.json)
  TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  jq -n \
    --arg user_query "$LAST_USER" \
    --arg assistant_response "$LAST_ASSISTANT" \
    --arg session_id "$SESSION_ID" \
    --arg user_id "${USER_ID:-system}" \
    --arg model_used "$MODEL_USED" \
    --arg captured_at "$TIMESTAMP" \
    --argjson file_changes "${FILE_CHANGES:-[]}" \
    '{
      user_query: $user_query,
      assistant_response: $assistant_response,
      session_id: $session_id,
      user_id: $user_id,
      file_changes: $file_changes,
      metadata: {
        source: "claude-code",
        model_used: $model_used,
        captured_at: $captured_at,
        file_changes: $file_changes,
        minimal_hook: true
      }
    }' > "$PAYLOAD_FILE" 2>/dev/null

  if jq empty "$PAYLOAD_FILE" 2>/dev/null; then
    # Retry with backoff for L2 episodic capture
    for RETRY in 1 2 3; do
      CAPTURE_RESULT=$(curl -s -w "\n%{http_code}" -X POST "$MEMORY_API_URL/api/v1/memory/capture" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        -d "@$PAYLOAD_FILE" \
        --connect-timeout 3 \
        --max-time 5 2>/dev/null || echo -e "\n000")

      HTTP_CODE=$(echo "$CAPTURE_RESULT" | tail -1)

      if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
        break
      fi
      [ $RETRY -lt 3 ] && sleep 0.5
    done

    if [ "$HTTP_CODE" != "200" ] && [ "$HTTP_CODE" != "201" ]; then
      echo "[ekkOS] L2 capture failed after 3 attempts: HTTP $HTTP_CODE" >&2
      mkdir -p "$HOME/.ekkos/wal" 2>/dev/null
      cp "$PAYLOAD_FILE" "$HOME/.ekkos/wal/l2-$(date +%s)-$$.json" 2>/dev/null
    fi
  fi

  rm -f "$PAYLOAD_FILE" 2>/dev/null
fi

# ═══════════════════════════════════════════════════════════════════════════
# REDIS WORKING MEMORY: Store verbatim turn in multi-session hot cache
# 5 sessions × 20 turns = 100 turns total for instant context restoration
# ═══════════════════════════════════════════════════════════════════════════
if [ -n "$LAST_USER" ] && [ -n "$LAST_ASSISTANT" ] && [ -n "$SESSION_NAME" ]; then
  REDIS_PAYLOAD_FILE=$(mktemp /tmp/ekkos-redis.XXXXXX.json)

  # ═══════════════════════════════════════════════════════════════════════════
  # SECRET SCRUBBING: Detect and store secrets, replace with references
  # Patterns: API keys, tokens, passwords → stored in L11 Secrets vault
  # Source: GitHub secret scanning patterns + community lists
  # ═══════════════════════════════════════════════════════════════════════════
  store_secret() {
    local service="$1"
    local secret="$2"
    local type="$3"
    curl -s -X POST "$MEMORY_API_URL/api/v1/secrets" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"service\":\"$service\",\"value\":\"$secret\",\"type\":\"$type\"}" \
      --connect-timeout 1 --max-time 2 >/dev/null 2>&1 &
  }

  scrub_secrets() {
    local text="$1"
    local scrubbed="$text"

    # ─────────────────────────────────────────────────────────────────────────
    # OpenAI (sk-..., sk-proj-...)
    # ─────────────────────────────────────────────────────────────────────────
    while [[ "$scrubbed" =~ (sk-proj-[a-zA-Z0-9_-]{20,}) ]]; do
      local secret="${BASH_REMATCH[1]}"
      local hash=$(echo -n "$secret" | md5 | cut -c1-8)
      store_secret "openai_proj_$hash" "$secret" "api_key"
      scrubbed="${scrubbed//$secret/[SECRET:openai_proj_$hash:api_key]}"
    done
    while [[ "$scrubbed" =~ (sk-[a-zA-Z0-9]{20,}) ]]; do
      local secret="${BASH_REMATCH[1]}"
      local hash=$(echo -n "$secret" | md5 | cut -c1-8)
      store_secret "openai_$hash" "$secret" "api_key"
      scrubbed="${scrubbed//$secret/[SECRET:openai_$hash:api_key]}"
    done

    # ─────────────────────────────────────────────────────────────────────────
    # Anthropic (sk-ant-...)
    # ─────────────────────────────────────────────────────────────────────────
    while [[ "$scrubbed" =~ (sk-ant-[a-zA-Z0-9_-]{20,}) ]]; do
      local secret="${BASH_REMATCH[1]}"
      local hash=$(echo -n "$secret" | md5 | cut -c1-8)
      store_secret "anthropic_$hash" "$secret" "api_key"
      scrubbed="${scrubbed//$secret/[SECRET:anthropic_$hash:api_key]}"
    done

    # ─────────────────────────────────────────────────────────────────────────
    # GitHub (ghp_, gho_, ghu_, ghs_, ghr_)
    # ─────────────────────────────────────────────────────────────────────────
    while [[ "$scrubbed" =~ (ghp_[a-zA-Z0-9]{36}) ]]; do
      local secret="${BASH_REMATCH[1]}"
      local hash=$(echo -n "$secret" | md5 | cut -c1-8)
      store_secret "github_pat_$hash" "$secret" "token"
      scrubbed="${scrubbed//$secret/[SECRET:github_pat_$hash:token]}"
    done
    while [[ "$scrubbed" =~ (gho_[a-zA-Z0-9]{36}) ]]; do
      local secret="${BASH_REMATCH[1]}"
      local hash=$(echo -n "$secret" | md5 | cut -c1-8)
      store_secret "github_oauth_$hash" "$secret" "token"
      scrubbed="${scrubbed//$secret/[SECRET:github_oauth_$hash:token]}"
    done
    while [[ "$scrubbed" =~ (ghu_[a-zA-Z0-9]{36}) ]]; do
      local secret="${BASH_REMATCH[1]}"
      local hash=$(echo -n "$secret" | md5 | cut -c1-8)
      store_secret "github_user_$hash" "$secret" "token"
      scrubbed="${scrubbed//$secret/[SECRET:github_user_$hash:token]}"
    done
    while [[ "$scrubbed" =~ (ghs_[a-zA-Z0-9]{36}) ]]; do
      local secret="${BASH_REMATCH[1]}"
      local hash=$(echo -n "$secret" | md5 | cut -c1-8)
      store_secret "github_app_$hash" "$secret" "token"
      scrubbed="${scrubbed//$secret/[SECRET:github_app_$hash:token]}"
    done
    while [[ "$scrubbed" =~ (ghr_[a-zA-Z0-9]{36}) ]]; do
      local secret="${BASH_REMATCH[1]}"
      local hash=$(echo -n "$secret" | md5 | cut -c1-8)
      store_secret "github_refresh_$hash" "$secret" "token"
      scrubbed="${scrubbed//$secret/[SECRET:github_refresh_$hash:token]}"
    done

    # ─────────────────────────────────────────────────────────────────────────
    # GitLab (glpat-...)
    # ─────────────────────────────────────────────────────────────────────────
    while [[ "$scrubbed" =~ (glpat-[a-zA-Z0-9_-]{20,}) ]]; do
      local secret="${BASH_REMATCH[1]}"
      local hash=$(echo -n "$secret" | md5 | cut -c1-8)
      store_secret "gitlab_$hash" "$secret" "token"
      scrubbed="${scrubbed//$secret/[SECRET:gitlab_$hash:token]}"
    done

    # ─────────────────────────────────────────────────────────────────────────
    # AWS (AKIA...)
    # ─────────────────────────────────────────────────────────────────────────
    while [[ "$scrubbed" =~ (AKIA[A-Z0-9]{16}) ]]; do
      local secret="${BASH_REMATCH[1]}"
      local hash=$(echo -n "$secret" | md5 | cut -c1-8)
      store_secret "aws_$hash" "$secret" "api_key"
      scrubbed="${scrubbed//$secret/[SECRET:aws_$hash:api_key]}"
    done

    # ─────────────────────────────────────────────────────────────────────────
    # Stripe (sk_live_, sk_test_, pk_live_, pk_test_)
    # ─────────────────────────────────────────────────────────────────────────
    while [[ "$scrubbed" =~ (sk_live_[a-zA-Z0-9]{24,}) ]]; do
      local secret="${BASH_REMATCH[1]}"
      local hash=$(echo -n "$secret" | md5 | cut -c1-8)
      store_secret "stripe_live_$hash" "$secret" "api_key"
      scrubbed="${scrubbed//$secret/[SECRET:stripe_live_$hash:api_key]}"
    done
    while [[ "$scrubbed" =~ (sk_test_[a-zA-Z0-9]{24,}) ]]; do
      local secret="${BASH_REMATCH[1]}"
      local hash=$(echo -n "$secret" | md5 | cut -c1-8)
      store_secret "stripe_test_$hash" "$secret" "api_key"
      scrubbed="${scrubbed//$secret/[SECRET:stripe_test_$hash:api_key]}"
    done
    while [[ "$scrubbed" =~ (rk_live_[a-zA-Z0-9]{24,}) ]]; do
      local secret="${BASH_REMATCH[1]}"
      local hash=$(echo -n "$secret" | md5 | cut -c1-8)
      store_secret "stripe_restricted_$hash" "$secret" "api_key"
      scrubbed="${scrubbed//$secret/[SECRET:stripe_restricted_$hash:api_key]}"
    done

    # ─────────────────────────────────────────────────────────────────────────
    # Slack (xoxb-, xoxp-, xoxa-, xoxs-)
    # ─────────────────────────────────────────────────────────────────────────
    while [[ "$scrubbed" =~ (xoxb-[0-9a-zA-Z-]{24,}) ]]; do
      local secret="${BASH_REMATCH[1]}"
      local hash=$(echo -n "$secret" | md5 | cut -c1-8)
      store_secret "slack_bot_$hash" "$secret" "token"
      scrubbed="${scrubbed//$secret/[SECRET:slack_bot_$hash:token]}"
    done
    while [[ "$scrubbed" =~ (xoxp-[0-9a-zA-Z-]{24,}) ]]; do
      local secret="${BASH_REMATCH[1]}"
      local hash=$(echo -n "$secret" | md5 | cut -c1-8)
      store_secret "slack_user_$hash" "$secret" "token"
      scrubbed="${scrubbed//$secret/[SECRET:slack_user_$hash:token]}"
    done

    # ─────────────────────────────────────────────────────────────────────────
    # Google (AIza...)
    # ─────────────────────────────────────────────────────────────────────────
    while [[ "$scrubbed" =~ (AIza[0-9A-Za-z_-]{35}) ]]; do
      local secret="${BASH_REMATCH[1]}"
      local hash=$(echo -n "$secret" | md5 | cut -c1-8)
      store_secret "google_$hash" "$secret" "api_key"
      scrubbed="${scrubbed//$secret/[SECRET:google_$hash:api_key]}"
    done

    # ─────────────────────────────────────────────────────────────────────────
    # Twilio (SK...)
    # ─────────────────────────────────────────────────────────────────────────
    while [[ "$scrubbed" =~ (SK[0-9a-fA-F]{32}) ]]; do
      local secret="${BASH_REMATCH[1]}"
      local hash=$(echo -n "$secret" | md5 | cut -c1-8)
      store_secret "twilio_$hash" "$secret" "api_key"
      scrubbed="${scrubbed//$secret/[SECRET:twilio_$hash:api_key]}"
    done

    # ─────────────────────────────────────────────────────────────────────────
    # SendGrid (SG....)
    # ─────────────────────────────────────────────────────────────────────────
    while [[ "$scrubbed" =~ (SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}) ]]; do
      local secret="${BASH_REMATCH[1]}"
      local hash=$(echo -n "$secret" | md5 | cut -c1-8)
      store_secret "sendgrid_$hash" "$secret" "api_key"
      scrubbed="${scrubbed//$secret/[SECRET:sendgrid_$hash:api_key]}"
    done

    # ─────────────────────────────────────────────────────────────────────────
    # Mailgun (key-...)
    # ─────────────────────────────────────────────────────────────────────────
    while [[ "$scrubbed" =~ (key-[0-9a-zA-Z]{32}) ]]; do
      local secret="${BASH_REMATCH[1]}"
      local hash=$(echo -n "$secret" | md5 | cut -c1-8)
      store_secret "mailgun_$hash" "$secret" "api_key"
      scrubbed="${scrubbed//$secret/[SECRET:mailgun_$hash:api_key]}"
    done

    # ─────────────────────────────────────────────────────────────────────────
    # DigitalOcean (dop_v1_...)
    # ─────────────────────────────────────────────────────────────────────────
    while [[ "$scrubbed" =~ (dop_v1_[a-z0-9]{64}) ]]; do
      local secret="${BASH_REMATCH[1]}"
      local hash=$(echo -n "$secret" | md5 | cut -c1-8)
      store_secret "digitalocean_$hash" "$secret" "token"
      scrubbed="${scrubbed//$secret/[SECRET:digitalocean_$hash:token]}"
    done

    # ─────────────────────────────────────────────────────────────────────────
    # Shopify (shpat_...)
    # ─────────────────────────────────────────────────────────────────────────
    while [[ "$scrubbed" =~ (shpat_[0-9a-fA-F]{32}) ]]; do
      local secret="${BASH_REMATCH[1]}"
      local hash=$(echo -n "$secret" | md5 | cut -c1-8)
      store_secret "shopify_$hash" "$secret" "token"
      scrubbed="${scrubbed//$secret/[SECRET:shopify_$hash:token]}"
    done

    # ─────────────────────────────────────────────────────────────────────────
    # npm (npm_...)
    # ─────────────────────────────────────────────────────────────────────────
    while [[ "$scrubbed" =~ (npm_[a-zA-Z0-9]{36}) ]]; do
      local secret="${BASH_REMATCH[1]}"
      local hash=$(echo -n "$secret" | md5 | cut -c1-8)
      store_secret "npm_$hash" "$secret" "token"
      scrubbed="${scrubbed//$secret/[SECRET:npm_$hash:token]}"
    done

    # ─────────────────────────────────────────────────────────────────────────
    # PyPI (pypi-...)
    # ─────────────────────────────────────────────────────────────────────────
    while [[ "$scrubbed" =~ (pypi-[A-Za-z0-9_-]{50,}) ]]; do
      local secret="${BASH_REMATCH[1]}"
      local hash=$(echo -n "$secret" | md5 | cut -c1-8)
      store_secret "pypi_$hash" "$secret" "token"
      scrubbed="${scrubbed//$secret/[SECRET:pypi_$hash:token]}"
    done

    # ─────────────────────────────────────────────────────────────────────────
    # Supabase (sbp_...)
    # ─────────────────────────────────────────────────────────────────────────
    while [[ "$scrubbed" =~ (sbp_[a-zA-Z0-9]{40,}) ]]; do
      local secret="${BASH_REMATCH[1]}"
      local hash=$(echo -n "$secret" | md5 | cut -c1-8)
      store_secret "supabase_$hash" "$secret" "api_key"
      scrubbed="${scrubbed//$secret/[SECRET:supabase_$hash:api_key]}"
    done

    # ─────────────────────────────────────────────────────────────────────────
    # Discord Bot Token
    # ─────────────────────────────────────────────────────────────────────────
    while [[ "$scrubbed" =~ ([MN][A-Za-z0-9]{23,}\.[A-Za-z0-9_-]{6}\.[A-Za-z0-9_-]{27}) ]]; do
      local secret="${BASH_REMATCH[1]}"
      local hash=$(echo -n "$secret" | md5 | cut -c1-8)
      store_secret "discord_$hash" "$secret" "token"
      scrubbed="${scrubbed//$secret/[SECRET:discord_$hash:token]}"
    done

    # ─────────────────────────────────────────────────────────────────────────
    # Vercel (vercel_...)
    # ─────────────────────────────────────────────────────────────────────────
    while [[ "$scrubbed" =~ (vercel_[a-zA-Z0-9]{24,}) ]]; do
      local secret="${BASH_REMATCH[1]}"
      local hash=$(echo -n "$secret" | md5 | cut -c1-8)
      store_secret "vercel_$hash" "$secret" "token"
      scrubbed="${scrubbed//$secret/[SECRET:vercel_$hash:token]}"
    done

    # ─────────────────────────────────────────────────────────────────────────
    # Heroku (heroku_...)
    # ─────────────────────────────────────────────────────────────────────────
    while [[ "$scrubbed" =~ (heroku_[a-zA-Z0-9_-]{30,}) ]]; do
      local secret="${BASH_REMATCH[1]}"
      local hash=$(echo -n "$secret" | md5 | cut -c1-8)
      store_secret "heroku_$hash" "$secret" "api_key"
      scrubbed="${scrubbed//$secret/[SECRET:heroku_$hash:api_key]}"
    done

    # ─────────────────────────────────────────────────────────────────────────
    # Datadog (dd...)
    # ─────────────────────────────────────────────────────────────────────────
    while [[ "$scrubbed" =~ (ddapi_[a-zA-Z0-9]{32,}) ]]; do
      local secret="${BASH_REMATCH[1]}"
      local hash=$(echo -n "$secret" | md5 | cut -c1-8)
      store_secret "datadog_$hash" "$secret" "api_key"
      scrubbed="${scrubbed//$secret/[SECRET:datadog_$hash:api_key]}"
    done

    echo "$scrubbed"
  }

  # Scrub user query and assistant response
  SCRUBBED_USER=$(scrub_secrets "$LAST_USER")
  SCRUBBED_ASSISTANT=$(scrub_secrets "$LAST_ASSISTANT")

  # Extract tools used from assistant response (simple grep for tool names)
  TOOLS_USED=$(echo "$SCRUBBED_ASSISTANT" | grep -oE '\[TOOL: [^\]]+\]' | sed 's/\[TOOL: //g; s/\]//g' | sort -u | jq -R -s -c 'split("\n") | map(select(. != ""))')
  [ -z "$TOOLS_USED" ] && TOOLS_USED="[]"

  # Extract files referenced from file changes
  FILES_REFERENCED=$(echo "$FILE_CHANGES" | jq -c '[.[].path] | unique // []' 2>/dev/null || echo "[]")

  # Build edits array from file changes (write and edit actions only)
  EDITS=$(echo "$FILE_CHANGES" | jq -c '[.[] | select(.action == "edit" or .action == "write") | {file_path: .path, action: .action, diff: (if .old_string then ("old: " + (.old_string | .[0:200]) + "\nnew: " + (.new_string | .[0:200])) else (.content | .[0:500]) end)}]' 2>/dev/null || echo "[]")

  # ═══════════════════════════════════════════════════════════════════════════
  # ACCURATE TOKEN TRACKING: Extract REAL token counts from Anthropic API response
  # This gives us exact context usage instead of rough estimation
  # ═══════════════════════════════════════════════════════════════════════════
  TOTAL_CONTEXT_TOKENS=0
  INPUT_TOKENS=0
  OUTPUT_TOKENS=0

  if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
    # Get the last assistant message with usage data (macOS compatible)
    # tac doesn't exist on macOS, use grep | tail instead
    LAST_USAGE=$(grep '"usage"' "$TRANSCRIPT_PATH" 2>/dev/null | tail -1)

    if [ -n "$LAST_USAGE" ]; then
      # Extract token counts from Anthropic API usage object
      INPUT_TOKENS=$(echo "$LAST_USAGE" | jq -r '
        (.message.usage.input_tokens // 0) +
        (.message.usage.cache_creation_input_tokens // 0) +
        (.message.usage.cache_read_input_tokens // 0)
      ' 2>/dev/null || echo "0")

      OUTPUT_TOKENS=$(echo "$LAST_USAGE" | jq -r '.message.usage.output_tokens // 0' 2>/dev/null || echo "0")

      # Total context = input + output
      TOTAL_CONTEXT_TOKENS=$((INPUT_TOKENS + OUTPUT_TOKENS))
    fi
  fi

  jq -n \
    --arg session_name "$SESSION_NAME" \
    --argjson turn_number "$TURN_NUMBER" \
    --arg user_query "$SCRUBBED_USER" \
    --arg agent_response "$SCRUBBED_ASSISTANT" \
    --arg model "$MODEL_USED" \
    --argjson tools_used "$TOOLS_USED" \
    --argjson files_referenced "$FILES_REFERENCED" \
    --argjson edits "$EDITS" \
    --argjson total_context_tokens "$TOTAL_CONTEXT_TOKENS" \
    --argjson input_tokens "$INPUT_TOKENS" \
    --argjson output_tokens "$OUTPUT_TOKENS" \
    '{
      session_name: $session_name,
      turn_number: $turn_number,
      user_query: $user_query,
      agent_response: $agent_response,
      model: $model,
      tools_used: $tools_used,
      files_referenced: $files_referenced,
      edits: $edits,
      patterns_used: [],
      total_context_tokens: $total_context_tokens,
      input_tokens: $input_tokens,
      output_tokens: $output_tokens
    }' > "$REDIS_PAYLOAD_FILE" 2>/dev/null

  if jq empty "$REDIS_PAYLOAD_FILE" 2>/dev/null; then
    # Retry with backoff for Redis working memory (critical for /continue)
    MAX_RETRIES=3
    RETRY=0
    REDIS_SUCCESS=false

    while [ $RETRY -lt $MAX_RETRIES ] && [ "$REDIS_SUCCESS" = "false" ]; do
      REDIS_RESULT=$(curl -s -w "\n%{http_code}" -X POST "$MEMORY_API_URL/api/v1/working/turn" \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -H "Content-Type: application/json" \
        -d "@$REDIS_PAYLOAD_FILE" \
        --connect-timeout 3 \
        --max-time 5 2>/dev/null || echo -e "\n000")

      REDIS_HTTP_CODE=$(echo "$REDIS_RESULT" | tail -1)

      if [ "$REDIS_HTTP_CODE" = "200" ] || [ "$REDIS_HTTP_CODE" = "201" ]; then
        REDIS_SUCCESS=true
      else
        RETRY=$((RETRY + 1))
        [ $RETRY -lt $MAX_RETRIES ] && sleep 0.3
      fi
    done

    # Log final failure with context
    if [ "$REDIS_SUCCESS" = "false" ]; then
      echo "[ekkOS] Redis capture failed after $MAX_RETRIES attempts: HTTP $REDIS_HTTP_CODE (session: $SESSION_NAME, turn: $TURN_NUMBER)" >&2
      # Write-ahead log for recovery
      WAL_DIR="$HOME/.ekkos/wal"
      mkdir -p "$WAL_DIR" 2>/dev/null
      cp "$REDIS_PAYLOAD_FILE" "$WAL_DIR/redis-$(date +%s)-$$.json" 2>/dev/null
    else
      # ═══════════════════════════════════════════════════════════════════════════
      # 🎯 ACK: Update local cache ACK cursor after successful Redis flush
      # This enables safe pruning of turns that are backed up to Redis
      # ═══════════════════════════════════════════════════════════════════════════
      if command -v ekkos-capture &>/dev/null && [ -n "$SESSION_ID" ]; then
        (ekkos-capture ack "$SESSION_ID" "$TURN_NUMBER" >/dev/null 2>&1) &
      fi
    fi
  fi

  rm -f "$REDIS_PAYLOAD_FILE" 2>/dev/null

  # ═════════════════════════════════════════════════════════════════════════
  # ⚡ FAST CAPTURE: Structured context for instant /continue (parallel)
  # Lightweight extraction - no LLM, pure parsing for ~1-2k token restoration
  # ═════════════════════════════════════════════════════════════════════════

  # Extract user intent patterns (no LLM needed)
  USER_DECISION=""
  USER_CORRECTION=""
  USER_PREFERENCE=""

  # Decision patterns: yes/no/ok/go ahead/use X instead
  USER_DECISION=$(echo "$SCRUBBED_USER" | grep -oiE "^(yes|no|ok|do it|go ahead|approved|confirmed|use .{1,30} instead)" | head -1 || echo "")

  # Correction patterns
  USER_CORRECTION=$(echo "$SCRUBBED_USER" | grep -oiE "(actually|no,? I meant|not that|wrong|instead)" | head -1 || echo "")

  # Preference patterns
  USER_PREFERENCE=$(echo "$SCRUBBED_USER" | grep -oiE "(always|never|I prefer|don.t|avoid) .{1,50}" | head -1 || echo "")

  # Extract errors from assistant response
  ERRORS_FOUND=$(echo "$SCRUBBED_ASSISTANT" | grep -oiE "(error|failed|cannot|exception|not found).{0,80}" | head -3 | jq -R -s -c 'split("\n") | map(select(. != ""))' || echo "[]")
  [ -z "$ERRORS_FOUND" ] && ERRORS_FOUND="[]"

  # Get git status (fast, local only)
  GIT_CHANGED=$(git diff --name-only 2>/dev/null | head -10 | jq -R -s -c 'split("\n") | map(select(. != ""))' || echo "[]")
  GIT_STAT=$(git diff --stat 2>/dev/null | tail -1 | tr -d '\n' || echo "")

  # Extract commands from Bash tool calls (first 50 chars each)
  COMMANDS_RUN=$(echo "$SCRUBBED_ASSISTANT" | grep -oE '\$ [^\n]{1,50}' | head -5 | sed 's/^\$ //' | jq -R -s -c 'split("\n") | map(select(. != ""))' || echo "[]")
  [ -z "$COMMANDS_RUN" ] && COMMANDS_RUN="[]"

  # Build fast-capture payload
  FAST_PAYLOAD=$(jq -n \
    --arg session_name "$SESSION_NAME" \
    --argjson turn_number "$TURN_NUMBER" \
    --arg user_intent "${SCRUBBED_USER:0:200}" \
    --arg user_decision "$USER_DECISION" \
    --arg user_correction "$USER_CORRECTION" \
    --arg user_preference "$USER_PREFERENCE" \
    --argjson tools_used "$TOOLS_USED" \
    --argjson files_modified "$FILES_REFERENCED" \
    --argjson commands_run "$COMMANDS_RUN" \
    --argjson errors "$ERRORS_FOUND" \
    --argjson git_files_changed "$GIT_CHANGED" \
    --arg git_diff_stat "$GIT_STAT" \
    --arg outcome "success" \
    '{
      session_name: $session_name,
      turn_number: $turn_number,
      user_intent: $user_intent,
      user_decision: (if $user_decision == "" then null else $user_decision end),
      user_correction: (if $user_correction == "" then null else $user_correction end),
      user_preference: (if $user_preference == "" then null else $user_preference end),
      tools_used: $tools_used,
      files_modified: $files_modified,
      commands_run: $commands_run,
      errors: $errors,
      git_files_changed: $git_files_changed,
      git_diff_stat: (if $git_diff_stat == "" then null else $git_diff_stat end),
      outcome: $outcome
    }' 2>/dev/null)

  # Fire fast-capture in background (non-blocking, <20ms)
  if [ -n "$FAST_PAYLOAD" ]; then
    curl -s -X POST "$MEMORY_API_URL/api/v1/working/fast-capture" \
      -H "Authorization: Bearer $AUTH_TOKEN" \
      -H "Content-Type: application/json" \
      -d "$FAST_PAYLOAD" \
      --connect-timeout 1 \
      --max-time 2 >/dev/null 2>&1 &
  fi

  # ═══════════════════════════════════════════════════════════════════════════
  # 💾 LOCAL CACHE: Tier 0 - Update turn with assistant response
  # Updates the turn created by user-prompt-submit hook with the response
  # ═══════════════════════════════════════════════════════════════════════════
  if command -v ekkos-capture &>/dev/null && [ -n "$SESSION_ID" ]; then
    # Escape response for shell (use base64 for safety with complex content)
    RESPONSE_B64=$(echo "$SCRUBBED_ASSISTANT" | base64 2>/dev/null || echo "")
    if [ -n "$RESPONSE_B64" ]; then
      # Decode and pass to capture command (handles newlines and special chars)
      DECODED_RESPONSE=$(echo "$RESPONSE_B64" | base64 -d 2>/dev/null || echo "")
      if [ -n "$DECODED_RESPONSE" ]; then
        (ekkos-capture response "$SESSION_ID" "$TURN_NUMBER" "$DECODED_RESPONSE" "$TOOLS_USED" "$FILES_REFERENCED" \
          >/dev/null 2>&1) &
      fi
    fi
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════
# 💾 FALLBACK LOCAL CACHE UPDATE: Even if L2/Redis capture was skipped
# This ensures local cache gets updated with assistant response for /continue
# ═══════════════════════════════════════════════════════════════════════════
if [ -n "$LAST_ASSISTANT" ] && command -v ekkos-capture &>/dev/null && [ -n "$SESSION_ID" ]; then
  # Only run if we didn't already update (check if inside the main block or not)
  # This handles the case where LAST_USER was empty but LAST_ASSISTANT is available
  if [ -z "$LAST_USER" ]; then
    echo "[ekkOS DEBUG] Fallback local cache update: LAST_ASSISTANT available, updating turn $TURN_NUMBER" >> "$HOME/.ekkos/capture-debug.log" 2>/dev/null
    RESPONSE_B64=$(echo "$LAST_ASSISTANT" | base64 2>/dev/null || echo "")
    if [ -n "$RESPONSE_B64" ]; then
      DECODED_RESPONSE=$(echo "$RESPONSE_B64" | base64 -d 2>/dev/null || echo "")
      if [ -n "$DECODED_RESPONSE" ]; then
        TOOLS_USED=$(echo "$LAST_ASSISTANT" | grep -oE '\[TOOL: [^\]]+\]' | sed 's/\[TOOL: //g; s/\]//g' | sort -u | jq -R -s -c 'split("\n") | map(select(. != ""))' 2>/dev/null || echo "[]")
        FILES_REFERENCED="[]"
        (ekkos-capture response "$SESSION_ID" "$TURN_NUMBER" "$DECODED_RESPONSE" "$TOOLS_USED" "$FILES_REFERENCED" \
          >/dev/null 2>&1) &
        echo "[ekkOS] Turn $TURN_NUMBER: Local cache updated via fallback (session: $SESSION_NAME)" >> "$HOME/.ekkos/capture-debug.log" 2>/dev/null
      fi
    fi
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════
# 🔄 GOLDEN LOOP: DETECT PHASES FROM RESPONSE
# ═══════════════════════════════════════════════════════════════════════════
GOLDEN_LOOP_FILE="$PROJECT_ROOT/.ekkos/golden-loop-current.json"

if [ -n "$LAST_ASSISTANT" ] && [ -f "$GOLDEN_LOOP_FILE" ]; then
  # Detect phases from agent response
  RETRIEVED=0
  APPLIED=0
  FORGED=0

  # 🔍 RETRIEVE: Count ekkOS_Search calls (MCP tool invocations)
  RETRIEVED=$(echo "$LAST_ASSISTANT" | grep -c "mcp__ekkos-memory__ekkOS_Search" 2>/dev/null || echo "0")
  [ "$RETRIEVED" -eq 0 ] && RETRIEVED=$(echo "$LAST_ASSISTANT" | grep -c "ekkOS_Search" 2>/dev/null || echo "0")

  # 💉 INJECT: Count [ekkOS_SELECT] pattern acknowledgments
  APPLIED=$(echo "$LAST_ASSISTANT" | grep -c "\[ekkOS_SELECT\]" 2>/dev/null || echo "0")

  # 📊 MEASURE: Count ekkOS_Forge calls (pattern creation)
  FORGED=$(echo "$LAST_ASSISTANT" | grep -c "mcp__ekkos-memory__ekkOS_Forge" 2>/dev/null || echo "0")
  [ "$FORGED" -eq 0 ] && FORGED=$(echo "$LAST_ASSISTANT" | grep -c "ekkOS_Forge" 2>/dev/null || echo "0")

  # Determine current phase based on what's happening
  CURRENT_PHASE="complete"
  if [ "$FORGED" -gt 0 ]; then
    CURRENT_PHASE="measure"
  elif [ "$APPLIED" -gt 0 ]; then
    CURRENT_PHASE="inject"
  elif [ "$RETRIEVED" -gt 0 ]; then
    CURRENT_PHASE="retrieve"
  fi

  # Update Golden Loop file with detected stats
  jq -n \
    --arg phase "$CURRENT_PHASE" \
    --argjson turn "$TURN_NUMBER" \
    --arg session "$SESSION_NAME" \
    --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    --argjson retrieved "$RETRIEVED" \
    --argjson applied "$APPLIED" \
    --argjson forged "$FORGED" \
    '{
      phase: $phase,
      turn: $turn,
      session: $session,
      timestamp: $timestamp,
      stats: {
        retrieved: $retrieved,
        applied: $applied,
        forged: $forged
      }
    }' > "$GOLDEN_LOOP_FILE" 2>/dev/null || true
fi

# ═══════════════════════════════════════════════════════════════════════════
# Update local .ekkos/current-focus.md (if exists) - SILENT
# ═══════════════════════════════════════════════════════════════════════════
EKKOS_LOCAL_DIR="$PROJECT_ROOT/.ekkos"
if [ -d "$EKKOS_LOCAL_DIR" ] && [ -n "$LAST_USER" ]; then
  FOCUS_FILE="$EKKOS_LOCAL_DIR/current-focus.md"
  TASK_SUMMARY="${LAST_USER:0:100}"
  [ ${#LAST_USER} -gt 100 ] && TASK_SUMMARY="${TASK_SUMMARY}..."

  cat > "$FOCUS_FILE" << EOF
---
last_updated: $(date -u +%Y-%m-%dT%H:%M:%SZ)
session_id: ${SESSION_ID}
---

# Current Focus
${TASK_SUMMARY}
EOF
fi

exit 0
