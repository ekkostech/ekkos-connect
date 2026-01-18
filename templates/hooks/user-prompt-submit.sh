#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# ekkOS_ Hook: UserPromptSubmit - SEAMLESS CONTEXT CONTINUITY
# ═══════════════════════════════════════════════════════════════════════════
# ZERO USER ACTION NEEDED:
# 1. Tracks turn number and context size
# 2. Detects when compaction happened (context dropped from high to low)
# 3. AUTO-INJECTS restored context - user just keeps working
# ═══════════════════════════════════════════════════════════════════════════

set +e

# ═══════════════════════════════════════════════════════════════════════════
# SESSION NAME GENERATION (must be defined early - used by ekkos-capture)
# Format: adj-noun-verb (e.g., "cosmic-penguin-runs")
# 100 × 100 × 100 = 1,000,000 combinations
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

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$(dirname "$SCRIPT_DIR")")"

INPUT=$(cat)
USER_QUERY=$(echo "$INPUT" | jq -r '.query // .message // .prompt // ""')
RAW_SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')
TRANSCRIPT_PATH=$(echo "$INPUT" | jq -r '.transcript_path // ""')

[ -z "$USER_QUERY" ] || [ "$USER_QUERY" = "null" ] && exit 0

# Fallback: read session_id from saved state if not in INPUT
if [ "$RAW_SESSION_ID" = "unknown" ] || [ "$RAW_SESSION_ID" = "null" ] || [ -z "$RAW_SESSION_ID" ]; then
  STATE_FILE="$HOME/.claude/state/current-session.json"
  if [ -f "$STATE_FILE" ]; then
    RAW_SESSION_ID=$(jq -r '.session_id // "unknown"' "$STATE_FILE" 2>/dev/null || echo "unknown")
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════
# INTELLIGENT TOOL ROUTER: Multi-trigger skill detection
# Detects ALL applicable skills/tools and injects as system reminder
# ═══════════════════════════════════════════════════════════════════════════
SKILL_REMINDERS=()
QUERY_LOWER=$(echo "$USER_QUERY" | tr '[:upper:]' '[:lower:]')

# ─────────────────────────────────────────────────────────────────────────────
# MANDATORY TRIGGERS (Always check ekkOS first)
# ─────────────────────────────────────────────────────────────────────────────

# Memory First - Debug/Error/Problem solving
if echo "$QUERY_LOWER" | grep -qE '(how do i|debug|error|bug|fix|not working|broken|fails|issue|problem|wrong|crash)'; then
  SKILL_REMINDERS+=("🔧 SKILL REQUIRED: Call Skill(skill: \"ekkOS_Memory_First\") FIRST before debugging")
fi

# ─────────────────────────────────────────────────────────────────────────────
# RECALL TRIGGERS (Time-based memory)
# ─────────────────────────────────────────────────────────────────────────────
if echo "$QUERY_LOWER" | grep -qE '(yesterday|last week|last month|remember when|what did we|where did we leave|before|earlier|previous|ago)'; then
  SKILL_REMINDERS+=("📅 SKILL REQUIRED: Call Skill(skill: \"ekkOS_Deep_Recall\") for time-based memory")
fi

# ─────────────────────────────────────────────────────────────────────────────
# DIRECTIVE TRIGGERS (User preferences)
# ─────────────────────────────────────────────────────────────────────────────
if echo "$QUERY_LOWER" | grep -qE '(always |never |i prefer|i like |dont |don.t |avoid |remember that |from now on)'; then
  SKILL_REMINDERS+=("⚙️ SKILL REQUIRED: Call Skill(skill: \"ekkOS_Preferences\") to capture directive")
fi

# ─────────────────────────────────────────────────────────────────────────────
# SAFETY TRIGGERS (Destructive actions)
# ─────────────────────────────────────────────────────────────────────────────
if echo "$QUERY_LOWER" | grep -qE '(delete|drop |rm -rf|deploy|push.*main|push.*master|production|migrate|rollback)'; then
  SKILL_REMINDERS+=("⚠️ SAFETY REQUIRED: Call ekkOS_Conflict before this destructive action")
fi

# ─────────────────────────────────────────────────────────────────────────────
# SCHEMA TRIGGERS (Database operations)
# ─────────────────────────────────────────────────────────────────────────────
if echo "$QUERY_LOWER" | grep -qE '(sql|query|supabase|prisma|database|table|column|select |insert |update |where )'; then
  SKILL_REMINDERS+=("🗄️ SCHEMA REQUIRED: Call ekkOS_GetSchema for correct field names")
fi

# ─────────────────────────────────────────────────────────────────────────────
# SECRET TRIGGERS (API keys, credentials)
# ─────────────────────────────────────────────────────────────────────────────
if echo "$QUERY_LOWER" | grep -qE '(api key|token|password|credential|secret|my.*key|store.*key)'; then
  SKILL_REMINDERS+=("🔐 SECRETS: Use ekkOS_StoreSecret to securely save credentials")
fi

# ─────────────────────────────────────────────────────────────────────────────
# PLAN TRIGGERS (Complex multi-step tasks)
# ─────────────────────────────────────────────────────────────────────────────
if echo "$QUERY_LOWER" | grep -qE '(implement|build|create.*feature|refactor|migrate|set up|architecture)'; then
  SKILL_REMINDERS+=("📋 PLAN REQUIRED: Call ekkOS_Plan for complex multi-step tasks")
fi

# ─────────────────────────────────────────────────────────────────────────────
# LEARN TRIGGERS (User expressing success/failure)
# ─────────────────────────────────────────────────────────────────────────────
if echo "$QUERY_LOWER" | grep -qE '(that worked|thanks|perfect|great|awesome|nailed it|solved|fixed it)'; then
  SKILL_REMINDERS+=("🎯 LEARN: Consider calling ekkOS_Forge to capture this solution as a pattern")
fi

# ─────────────────────────────────────────────────────────────────────────────
# CODEBASE TRIGGERS (Project-specific code search)
# ─────────────────────────────────────────────────────────────────────────────
if echo "$QUERY_LOWER" | grep -qE '(where is|find.*file|search.*code|in this project|in the codebase)'; then
  SKILL_REMINDERS+=("🔍 CODEBASE: Use ekkOS_Codebase for project-specific code search")
fi

# Combine skill reminders (only take first 3 to avoid noise)
SKILL_REMINDER=""
REMINDER_COUNT=${#SKILL_REMINDERS[@]}
if [ "$REMINDER_COUNT" -gt 0 ]; then
  # Take up to 3 most relevant reminders
  MAX_REMINDERS=3
  [ "$REMINDER_COUNT" -lt "$MAX_REMINDERS" ] && MAX_REMINDERS="$REMINDER_COUNT"
  for i in $(seq 0 $((MAX_REMINDERS - 1))); do
    [ -n "$SKILL_REMINDER" ] && SKILL_REMINDER="$SKILL_REMINDER
"
    SKILL_REMINDER="$SKILL_REMINDER${SKILL_REMINDERS[$i]}"
  done
fi

# ═══════════════════════════════════════════════════════════════════════════
# Load auth
# ═══════════════════════════════════════════════════════════════════════════
EKKOS_CONFIG="$HOME/.ekkos/config.json"
AUTH_TOKEN=""
if [ -f "$EKKOS_CONFIG" ]; then
  AUTH_TOKEN=$(jq -r '.hookApiKey // .apiKey // ""' "$EKKOS_CONFIG" 2>/dev/null || echo "")
fi
[ -z "$AUTH_TOKEN" ] && AUTH_TOKEN=$(grep -E "^SUPABASE_SECRET_KEY=" "$PROJECT_ROOT/.env.local" 2>/dev/null | cut -d'=' -f2- | tr -d '"' | tr -d "'" || echo "")

MEMORY_API_URL="https://mcp.ekkos.dev"

# ═══════════════════════════════════════════════════════════════════════════
# Session ID - NEW ID per conversation (not persisted 24h anymore)
# Each Claude Code session gets unique ID for proper Time Machine grouping
# ═══════════════════════════════════════════════════════════════════════════
STATE_DIR="$PROJECT_ROOT/.claude/state"
mkdir -p "$STATE_DIR" 2>/dev/null || true
SESSION_FILE="$STATE_DIR/current-session.json"

# Use Claude's RAW_SESSION_ID exclusively
SESSION_ID="$RAW_SESSION_ID"

# Skip if no valid session ID from Claude
if [ -z "$SESSION_ID" ] || [ "$SESSION_ID" = "unknown" ] || [ "$SESSION_ID" = "null" ]; then
  exit 0
fi

# Save for other hooks to reference (but don't reuse across conversations)
echo "{\"session_id\": \"$SESSION_ID\", \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" > "$SESSION_FILE"

# ═══════════════════════════════════════════════════════════════════════════
# Turn counter - PROJECT-LOCAL storage
# ═══════════════════════════════════════════════════════════════════════════
PROJECT_SESSION_DIR="$STATE_DIR/sessions"
mkdir -p "$PROJECT_SESSION_DIR" 2>/dev/null || true
TURN_COUNTER_FILE="$PROJECT_SESSION_DIR/${SESSION_ID}.turn"

# Count actual user messages in transcript for accurate turn number
TURN_NUMBER=1
if [ -n "$TRANSCRIPT_PATH" ] && [ -f "$TRANSCRIPT_PATH" ]; then
  # Count user message entries in JSONL transcript
  TURN_NUMBER=$(grep -c '"type":"user"' "$TRANSCRIPT_PATH" 2>/dev/null || echo "1")
  [ "$TURN_NUMBER" -eq 0 ] && TURN_NUMBER=1
fi

# PRESERVE HISTORY: Don't overwrite if saved count is higher (after /clear)
SAVED_TURN_COUNT=0
[ -f "$TURN_COUNTER_FILE" ] && SAVED_TURN_COUNT=$(cat "$TURN_COUNTER_FILE" 2>/dev/null || echo "0")
TRANSCRIPT_TURN_COUNT=$TURN_NUMBER  # Save for post-clear detection
POST_CLEAR_DETECTED=false
if [ "$SAVED_TURN_COUNT" -gt "$TURN_NUMBER" ]; then
  # Post-clear: INCREMENT from saved count (not just copy it)
  TURN_NUMBER=$((SAVED_TURN_COUNT + 1))
  POST_CLEAR_DETECTED=true
fi
echo "$TURN_NUMBER" > "$TURN_COUNTER_FILE"

# ═══════════════════════════════════════════════════════════════════════════
# 🧠 WORKING MEMORY: Fast capture each turn (async, non-blocking)
# ═══════════════════════════════════════════════════════════════════════════
MEMORY_API_URL="https://mcp.ekkos.dev"
if [ -f "$HOME/.ekkos/config.json" ]; then
  CAPTURE_TOKEN=$(jq -r '.hookApiKey // .apiKey // ""' "$HOME/.ekkos/config.json" 2>/dev/null || echo "")
  if [ -n "$CAPTURE_TOKEN" ] && [ "$CAPTURE_TOKEN" != "null" ]; then
    # Async capture to Redis/Supabase - doesn't block hook execution
    (curl -s -X POST "$MEMORY_API_URL/api/v1/working/fast-capture" \
      -H "Authorization: Bearer $CAPTURE_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"session_id\":\"$RAW_SESSION_ID\",\"turn\":$TURN_NUMBER,\"query\":$(echo "$USER_QUERY" | jq -Rs .)}" \
      >/dev/null 2>&1) &
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════
# 💾 LOCAL CACHE: Tier 0 capture for instant /continue (async, non-blocking)
# ═══════════════════════════════════════════════════════════════════════════
if command -v ekkos-capture &>/dev/null; then
  # Generate session name if not already set
  if [ -z "$SESSION_NAME" ] || [ "$SESSION_NAME" = "unknown-session-starts" ]; then
    SESSION_NAME=$(uuid_to_words "$RAW_SESSION_ID" 2>/dev/null || echo "unknown-session")
  fi
  # Async local capture - writes to ~/.ekkos/cache/sessions/<uuid>.jsonl
  (ekkos-capture user "$RAW_SESSION_ID" "$SESSION_NAME" "$TURN_NUMBER" "$USER_QUERY" "$PROJECT_ROOT" \
    >/dev/null 2>&1) &
fi

# ═══════════════════════════════════════════════════════════════════════════
# 📥 GOLDEN LOOP: CAPTURE PHASE - Track turn start
# ═══════════════════════════════════════════════════════════════════════════
GOLDEN_LOOP_FILE="$PROJECT_ROOT/.ekkos/golden-loop-current.json"
mkdir -p "$PROJECT_ROOT/.ekkos" 2>/dev/null || true

# Write current phase to file (extension watches this for real-time updates)
jq -n \
  --arg phase "capture" \
  --argjson turn "$TURN_NUMBER" \
  --arg session "$SESSION_ID" \
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
# 🔍 GOLDEN LOOP: RETRIEVE PHASE - Auto-retrieve patterns from ekkOS
# ═══════════════════════════════════════════════════════════════════════════
EKKOS_API_KEY=""
if [ -f "$HOME/.ekkos/.hookApiKey" ]; then
  EKKOS_API_KEY=$(cat "$HOME/.ekkos/.hookApiKey" 2>/dev/null || echo "")
elif [ -f "$HOME/.ekkos/config.json" ]; then
  EKKOS_API_KEY=$(jq -r '.hookApiKey // ""' "$HOME/.ekkos/config.json" 2>/dev/null || echo "")
fi

RETRIEVED_PATTERNS=""
PATTERN_COUNT=0
RETRIEVED_DIRECTIVES=""
DIRECTIVE_COUNT=0

# ═══════════════════════════════════════════════════════════════════════════
# 📦 DIRECTIVE CACHE: Local cache to avoid API calls every turn
# Only fetch from API if:
#   1. Cache doesn't exist
#   2. Cache is >1 hour old
#   3. Directive-related trigger detected in query
# ═══════════════════════════════════════════════════════════════════════════
DIRECTIVE_CACHE_DIR="$HOME/.ekkos/cache"
DIRECTIVE_CACHE_FILE="$DIRECTIVE_CACHE_DIR/directives.json"
DIRECTIVE_CACHE_TTL=3600  # 1 hour in seconds
mkdir -p "$DIRECTIVE_CACHE_DIR" 2>/dev/null || true

# Check if we need to refresh directive cache
DIRECTIVE_CACHE_VALID=false
DIRECTIVE_TRIGGER_DETECTED=false

# Smart detection: Check if query mentions directive-related keywords
if echo "$QUERY_LOWER" | grep -qE '(always |never |i prefer|i like |dont |don.t |avoid |remember that |from now on|directive|preference)'; then
  DIRECTIVE_TRIGGER_DETECTED=true
fi

if [ -f "$DIRECTIVE_CACHE_FILE" ]; then
  CACHE_TIMESTAMP=$(jq -r '.cached_at // 0' "$DIRECTIVE_CACHE_FILE" 2>/dev/null || echo "0")
  CURRENT_TIMESTAMP=$(date +%s)
  CACHE_AGE=$((CURRENT_TIMESTAMP - CACHE_TIMESTAMP))

  # Cache is valid if <1 hour old AND no directive trigger detected
  if [ "$CACHE_AGE" -lt "$DIRECTIVE_CACHE_TTL" ] && [ "$DIRECTIVE_TRIGGER_DETECTED" = "false" ]; then
    DIRECTIVE_CACHE_VALID=true
  fi
fi

# Decide whether to inject directives this turn
# SMART INJECTION: Only on Turn 1, post-clear, or directive trigger
SHOULD_INJECT_DIRECTIVES=false
if [ "$TURN_NUMBER" -eq 1 ] || [ "$POST_CLEAR_DETECTED" = "true" ] || [ "$DIRECTIVE_TRIGGER_DETECTED" = "true" ]; then
  SHOULD_INJECT_DIRECTIVES=true
fi

if [ -n "$EKKOS_API_KEY" ] && [ -n "$USER_QUERY" ]; then
  # Update phase to RETRIEVE
  jq -n \
    --arg phase "retrieve" \
    --argjson turn "$TURN_NUMBER" \
    --arg session "$SESSION_ID" \
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
  # PATTERN RETRIEVAL: Always search patterns (they're query-specific)
  # DIRECTIVE RETRIEVAL: Only if cache is invalid or trigger detected
  # ═══════════════════════════════════════════════════════════════════════════

  # Build sources array - always include patterns, conditionally include directives
  if [ "$DIRECTIVE_CACHE_VALID" = "true" ]; then
    SEARCH_SOURCES='["patterns"]'
  else
    SEARCH_SOURCES='["patterns", "directives"]'
  fi

  # Call ekkOS MCP gateway
  SEARCH_RESPONSE=$(curl -s -X POST "https://api.ekkos.dev/api/v1/mcp/call" \
    -H "Authorization: Bearer $EKKOS_API_KEY" \
    -H "Content-Type: application/json" \
    --max-time 2 \
    -d "{\"tool\": \"ekkOS_Search\", \"arguments\": {\"query\": $(echo "$USER_QUERY" | jq -Rs .), \"limit\": 5, \"sources\": $SEARCH_SOURCES}}" 2>/dev/null || echo '{"result": {"results": {"patterns": [], "directives": []}}}')

  # Count patterns retrieved (MCP response: .result.results.patterns)
  PATTERN_COUNT=$(echo "$SEARCH_RESPONSE" | jq -r '.result.results.patterns | length' 2>/dev/null || echo "0")

  # Update golden loop with retrieved count
  if [ "$PATTERN_COUNT" -gt 0 ]; then
    jq -n \
      --arg phase "inject" \
      --argjson turn "$TURN_NUMBER" \
      --arg session "$SESSION_ID" \
      --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
      --argjson retrieved "$PATTERN_COUNT" \
      '{
        phase: $phase,
        turn: $turn,
        session: $session,
        timestamp: $timestamp,
        stats: {
          retrieved: $retrieved,
          applied: 0,
          forged: 0
        }
      }' > "$GOLDEN_LOOP_FILE" 2>/dev/null || true

    # Format patterns for injection (MCP response: .result.results.patterns)
    RETRIEVED_PATTERNS=$(echo "$SEARCH_RESPONSE" | jq -r '
      .result.results.patterns[]? |
      "**\(.title)**\n\(.problem // .guidance // "")\n\n## Solution\n\(.solution // .content // "")\n\nSuccess Rate: \((.success_rate // 0) * 100)%\nApplied: \(.applied_count // 0) times\n"
    ' 2>/dev/null || echo "")
  fi

  # ═══════════════════════════════════════════════════════════════════════════
  # DIRECTIVE HANDLING: Use cache if valid, otherwise process from response
  # ═══════════════════════════════════════════════════════════════════════════
  if [ "$DIRECTIVE_CACHE_VALID" = "true" ]; then
    # Load directives from cache
    DIRECTIVE_COUNT=$(jq -r '.count // 0' "$DIRECTIVE_CACHE_FILE" 2>/dev/null || echo "0")
    RETRIEVED_DIRECTIVES=$(jq -r '.formatted // ""' "$DIRECTIVE_CACHE_FILE" 2>/dev/null || echo "")
  else
    # Extract and format DIRECTIVES from API response
    DIRECTIVE_COUNT=$(echo "$SEARCH_RESPONSE" | jq -r '.result.results.directives | length' 2>/dev/null || echo "0")

    if [ "$DIRECTIVE_COUNT" -gt 0 ]; then
      # Group directives by type for clean display
      MUST_DIRECTIVES=$(echo "$SEARCH_RESPONSE" | jq -r '.result.results.directives[] | select(.type == "MUST") | "  • \(.rule)"' 2>/dev/null || echo "")
      NEVER_DIRECTIVES=$(echo "$SEARCH_RESPONSE" | jq -r '.result.results.directives[] | select(.type == "NEVER") | "  • \(.rule)"' 2>/dev/null || echo "")
      PREFER_DIRECTIVES=$(echo "$SEARCH_RESPONSE" | jq -r '.result.results.directives[] | select(.type == "PREFER") | "  • \(.rule)"' 2>/dev/null || echo "")
      AVOID_DIRECTIVES=$(echo "$SEARCH_RESPONSE" | jq -r '.result.results.directives[] | select(.type == "AVOID") | "  • \(.rule)"' 2>/dev/null || echo "")

      # Build directive section
      if [ -n "$MUST_DIRECTIVES" ] || [ -n "$NEVER_DIRECTIVES" ] || [ -n "$PREFER_DIRECTIVES" ] || [ -n "$AVOID_DIRECTIVES" ]; then
        RETRIEVED_DIRECTIVES="🔴 USER DIRECTIVES (FOLLOW THESE):"
        [ -n "$MUST_DIRECTIVES" ] && RETRIEVED_DIRECTIVES="$RETRIEVED_DIRECTIVES

MUST:
$MUST_DIRECTIVES"
        [ -n "$NEVER_DIRECTIVES" ] && RETRIEVED_DIRECTIVES="$RETRIEVED_DIRECTIVES

NEVER:
$NEVER_DIRECTIVES"
        [ -n "$PREFER_DIRECTIVES" ] && RETRIEVED_DIRECTIVES="$RETRIEVED_DIRECTIVES

PREFER:
$PREFER_DIRECTIVES"
        [ -n "$AVOID_DIRECTIVES" ] && RETRIEVED_DIRECTIVES="$RETRIEVED_DIRECTIVES

AVOID:
$AVOID_DIRECTIVES"
      fi

      # Save to cache for future turns
      jq -n \
        --argjson count "$DIRECTIVE_COUNT" \
        --arg formatted "$RETRIEVED_DIRECTIVES" \
        --argjson cached_at "$(date +%s)" \
        '{
          count: $count,
          formatted: $formatted,
          cached_at: $cached_at
        }' > "$DIRECTIVE_CACHE_FILE" 2>/dev/null || true
    fi
  fi
fi

# Context tracking removed - Claude Code handles its own context management

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

CURRENT_TIME=$(date "+%Y-%m-%d %I:%M:%S %p %Z")

# Generate session name (arrays and uuid_to_words defined at top of file)
SESSION_NAME=""
if [ -n "$SESSION_ID" ] && [ "$SESSION_ID" != "unknown" ] && [ "$SESSION_ID" != "null" ]; then
  SESSION_NAME=$(uuid_to_words "$SESSION_ID")
fi

# ═══════════════════════════════════════════════════════════════════════════
# "/continue" COMMAND: Delegated to Skill system (DO NOT INTERCEPT)
# ═══════════════════════════════════════════════════════════════════════════
# REMOVED: Hook used to intercept /continue and do simple restoration
# NOW: Let /continue Skill handle it - supports session names + intelligent narrative
#
# Why this changed:
# - Hook was ignoring session name argument (always used "current")
# - Hook couldn't provide intelligent narrative briefing
# - Skill system now has proper name→UUID resolution in API
#
# OLD BEHAVIOR (removed):
# - Hook caught /continue → API call with "current" → exit
# NEW BEHAVIOR:
# - /continue groovy-cactus → Skill system → API with session name → intelligent briefing
# ═══════════════════════════════════════════════════════════════════════════

# Note: Session name is shown in status line for easy reference:
# Example: "🧠 ekkOS Memory | Turn 42 | groovy-cactus | 2026-01-12 09:40 AM EST"

# ═══════════════════════════════════════════════════════════════════════════
# AUTO-RESTORE REMOVED: Manual /continue only (saves 79% token burn!)
# ═══════════════════════════════════════════════════════════════════════════
# WHY REMOVED:
# - Auto-restore burns 5,000 tokens per turn (250K tokens over 50 turns)
# - Manual /continue: 2,000 tokens once + clean slate (52K total = 79% savings!)
# - Manual /continue is 10x more powerful (Bash + multi-source + narrative)
# - User has control (can choose session, can skip if starting fresh)
# - Explicit > implicit (user knows exactly what's happening)
#
# OLD BEHAVIOR (removed):
# - Compaction detection → auto-inject 10 turns
# - Post-clear detection → auto-inject 10 turns
# NEW BEHAVIOR:
# - User types: /continue groovy-cactus
# - Skill runs with full Bash power + intelligent narrative
# ═══════════════════════════════════════════════════════════════════════════

# Simple status line - no context warnings, Claude handles its own context
echo -e "${CYAN}${BOLD}🧠 ekkOS Memory${RESET} ${DIM}| Turn ${TURN_NUMBER} | ${SESSION_NAME} | ${CURRENT_TIME}${RESET}"

# Output skill reminder if detected
if [ -n "$SKILL_REMINDER" ]; then
  echo ""
  echo -e "${MAGENTA}${BOLD}$SKILL_REMINDER${RESET}"
fi

# 💉 GOLDEN LOOP: INJECT PHASE - Inject directives FIRST (highest priority)
# SMART INJECTION: Only on Turn 1, post-clear, or directive trigger
if [ "$SHOULD_INJECT_DIRECTIVES" = "true" ] && [ -n "$RETRIEVED_DIRECTIVES" ] && [ "$DIRECTIVE_COUNT" -gt 0 ]; then
  echo ""
  echo "<system-reminder>"
  echo -e "$RETRIEVED_DIRECTIVES"
  echo "</system-reminder>"
fi

# 💉 GOLDEN LOOP: INJECT PHASE - Inject retrieved patterns into context
if [ -n "$RETRIEVED_PATTERNS" ] && [ "$PATTERN_COUNT" -gt 0 ]; then
  echo ""
  echo "<system-reminder>"
  echo "🔍 RETRIEVED PATTERNS FROM ekkOS MEMORY ($PATTERN_COUNT patterns found)"
  echo ""
  echo -e "$RETRIEVED_PATTERNS"
  echo ""
  echo "These patterns were automatically retrieved based on your query. Review and apply relevant solutions."
  echo "</system-reminder>"
  echo ""
  echo "🔴 MANDATORY PATTERN ACKNOWLEDGMENT (PatternGuard):"
  echo "You MUST acknowledge ALL $PATTERN_COUNT patterns above - either SELECT or SKIP each one."
  echo ""
  echo "For patterns you USE:"
  echo "[ekkOS_SELECT]"
  echo "- id: <pattern_id>"
  echo "  reason: <1-line why using>"
  echo "  confidence: <0.0-1.0>"
  echo "[/ekkOS_SELECT]"
  echo ""
  echo "For patterns NOT relevant:"
  echo "[ekkOS_SKIP]"
  echo "- id: <pattern_id>"
  echo "  reason: <1-line why not relevant>"
  echo "[/ekkOS_SKIP]"
  echo ""
  echo "⚡ AUTOMATIC APPLICATION: When pattern matches your task, APPLY IT immediately without asking."
  echo "Track outcome after: ekkOS_Outcome({success: true/false})"
  echo ""
  echo "100% coverage required. This is how the system learns what works."
fi

# Inject footer format reminder (helps Claude remember session name)
if [ -n "$SESSION_NAME" ] && [ "$SESSION_NAME" != "unknown-session" ]; then
  echo ""
  echo "<footer-format>End responses with: Claude Code ({Model}) · 🧠 **ekkOS_™** · Turn ${TURN_NUMBER} · ${SESSION_NAME} · 📅 ${CURRENT_TIME}</footer-format>"
fi

exit 0
