#!/bin/bash
# Post-response hook: Validates and enforces ekkOS footer format
# Runs AFTER assistant response, checks footer compliance

RESPONSE_FILE="$1"
HOOK_ENV="$2"

# Exit if no response file
if [[ ! -f "$RESPONSE_FILE" ]]; then
  exit 0
fi

# Parse metadata from hook environment
SESSION_ID=$(echo "$HOOK_ENV" | jq -r '.sessionId // "unknown"')
TURN=$(echo "$HOOK_ENV" | jq -r '.turn // 0')
CONTEXT_PERCENT=$(echo "$HOOK_ENV" | jq -r '.contextUsagePercent // 0')
MODEL=$(echo "$HOOK_ENV" | jq -r '.model // "Claude Code (Opus 4.5)"')

# Convert session UUID to word-based name
convert_uuid_to_name() {
  local uuid="$1"

  # Word lists (same as MCP)
  local ADJECTIVES=("cosmic" "turbo" "mega" "hyper" "quantum" "atomic" "stellar" "epic"
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
    "kooky" "loopy" "moody" "noisy")

  local NOUNS=("penguin" "panda" "otter" "narwhal" "alpaca" "llama" "badger" "walrus"
    "waffle" "pickle" "noodle" "pretzel" "muffin" "taco" "nugget" "biscuit"
    "rocket" "comet" "nebula" "quasar" "meteor" "photon" "pulsar" "nova"
    "ninja" "pirate" "wizard" "robot" "yeti" "phoenix" "sphinx" "kraken"
    "thunder" "blizzard" "tornado" "avalanche" "mango" "kiwi" "banana" "coconut"
    "donut" "espresso" "falafel" "gyro" "hummus" "icecream" "jambon" "kebab"
    "latte" "mocha" "nachos" "olive" "pasta" "quinoa" "ramen" "sushi"
    "tamale" "udon" "velvet" "wasabi" "xmas" "yogurt" "ziti" "anchor"
    "beacon" "canyon" "drifter" "echo" "falcon" "glacier" "harbor" "island"
    "jetpack" "kayak" "lagoon" "meadow" "orbit" "parrot" "quest"
    "rapids" "summit" "tunnel" "umbrella" "volcano" "whisper" "xylophone" "yacht"
    "zephyr" "acorn" "bobcat" "cactus" "dolphin" "eagle" "ferret" "gopher"
    "hedgehog" "iguana" "jackal" "koala")

  # Extract first 8 hex chars
  local hex="${uuid:0:8}"
  hex="${hex//-/}"

  # Convert to number
  local num=$((16#$hex))

  # Calculate indices
  local adj_idx=$((num % 100))
  local noun_idx=$(((num / 100) % 100))

  echo "${ADJECTIVES[$adj_idx]}-${NOUNS[$noun_idx]}"
}

SESSION_NAME=$(convert_uuid_to_name "$SESSION_ID")
TIMESTAMP=$(date "+%Y-%m-%d %I:%M %p %Z")

# Required footer format
REQUIRED_FOOTER="---
$MODEL · $SESSION_NAME · Turn $TURN · ${CONTEXT_PERCENT}% · 🧠 **ekkOS_™** · 📅 $TIMESTAMP"

# Check if response has correct footer
RESPONSE_CONTENT=$(cat "$RESPONSE_FILE")
LAST_LINE=$(echo "$RESPONSE_CONTENT" | tail -1)

# Check if footer exists and is correct
if [[ "$LAST_LINE" == *"ekkOS"* ]] && [[ "$LAST_LINE" == *"Turn"* ]]; then
  # Footer exists - validate format
  if [[ "$LAST_LINE" == *"Turn $TURN"* ]] && [[ "$LAST_LINE" == *"${CONTEXT_PERCENT}%"* ]] && [[ "$LAST_LINE" == *"$SESSION_NAME"* ]]; then
    # Footer is correct
    exit 0
  else
    # Footer exists but is malformed - replace it
    RESPONSE_WITHOUT_FOOTER=$(echo "$RESPONSE_CONTENT" | head -n -2)  # Remove last 2 lines (--- and footer)
    echo "$RESPONSE_WITHOUT_FOOTER" > "$RESPONSE_FILE"
    echo "" >> "$RESPONSE_FILE"
    echo "$REQUIRED_FOOTER" >> "$RESPONSE_FILE"
  fi
else
  # Footer missing - append it
  echo "" >> "$RESPONSE_FILE"
  echo "$REQUIRED_FOOTER" >> "$RESPONSE_FILE"
fi

exit 0
