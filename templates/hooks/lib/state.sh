#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# ekkOS™ Hook State Management Library (Portable)
# Shared state functions for coordinating between hooks
# ═══════════════════════════════════════════════════════════════════════════

# Get project root (where .claude directory lives)
get_project_root() {
  local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  echo "$(dirname "$(dirname "$script_dir")")"
}

PROJECT_ROOT=$(get_project_root)
STATE_DIR="$PROJECT_ROOT/.claude/state"

# Ensure state directory exists
mkdir -p "$STATE_DIR"

# ═══════════════════════════════════════════════════════════════════════════
# State File Management
# ═══════════════════════════════════════════════════════════════════════════

# Save patterns for session
save_patterns() {
  local session_id="$1"
  local patterns="$2"
  local model_used="$3"

  local state_file="$STATE_DIR/patterns-${session_id}.json"

  jq -n \
    --argjson patterns "$patterns" \
    --arg model "$model_used" \
    --arg timestamp "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
    '{
      patterns: $patterns,
      model_used: $model,
      saved_at: $timestamp
    }' > "$state_file"
}

# Load patterns for session
load_patterns() {
  local session_id="$1"
  local state_file="$STATE_DIR/patterns-${session_id}.json"

  if [ -f "$state_file" ]; then
    cat "$state_file"
  else
    echo '{}'
  fi
}

# Clear patterns for session (after capture)
clear_patterns() {
  local session_id="$1"
  rm -f "$STATE_DIR/patterns-${session_id}.json"
}

# ═══════════════════════════════════════════════════════════════════════════
# Capture Deduplication
# ═══════════════════════════════════════════════════════════════════════════

# Generate hash for conversation turn
generate_turn_hash() {
  local user_query="$1"
  local assistant_response="$2"

  echo "${user_query}${assistant_response}" | md5sum | cut -d' ' -f1 2>/dev/null || \
    echo "${user_query}${assistant_response}" | md5 2>/dev/null
}

# Check if turn was already captured
was_turn_captured() {
  local session_id="$1"
  local turn_hash="$2"

  local capture_log="$STATE_DIR/captures-${session_id}.log"

  if [ -f "$capture_log" ]; then
    grep -q "^${turn_hash}$" "$capture_log"
    return $?
  fi

  return 1 # Not captured
}

# Mark turn as captured
mark_turn_captured() {
  local session_id="$1"
  local turn_hash="$2"

  local capture_log="$STATE_DIR/captures-${session_id}.log"

  echo "$turn_hash" >> "$capture_log"

  # Keep only last 100 hashes
  if [ $(wc -l < "$capture_log" 2>/dev/null || echo 0) -gt 100 ]; then
    tail -100 "$capture_log" > "${capture_log}.tmp"
    mv "${capture_log}.tmp" "$capture_log"
  fi
}

# ═══════════════════════════════════════════════════════════════════════════
# Hook Coordination
# ═══════════════════════════════════════════════════════════════════════════

# Lock for preventing race conditions
acquire_lock() {
  local session_id="$1"
  local lock_file="$STATE_DIR/lock-${session_id}.lock"
  local timeout=5
  local waited=0

  while [ -f "$lock_file" ] && [ $waited -lt $timeout ]; do
    sleep 0.1
    waited=$((waited + 1))
  done

  if [ -f "$lock_file" ]; then
    # Stale lock (older than 10 seconds)
    local lock_age=$(($(date +%s) - $(stat -f %m "$lock_file" 2>/dev/null || stat -c %Y "$lock_file" 2>/dev/null || echo 0)))
    if [ $lock_age -gt 10 ]; then
      rm -f "$lock_file"
    else
      return 1 # Failed to acquire
    fi
  fi

  # Acquire lock
  echo $$ > "$lock_file"
  return 0
}

# Release lock
release_lock() {
  local session_id="$1"
  local lock_file="$STATE_DIR/lock-${session_id}.lock"

  if [ -f "$lock_file" ] && [ "$(cat "$lock_file")" = "$$" ]; then
    rm -f "$lock_file"
  fi
}

# ═══════════════════════════════════════════════════════════════════════════
# Cleanup
# ═══════════════════════════════════════════════════════════════════════════

# Clean up old state files
cleanup_old_state() {
  # Remove files older than 24 hours
  find "$STATE_DIR" -name "*.json" -mtime +1 -delete 2>/dev/null || true
  find "$STATE_DIR" -name "*.log" -mtime +1 -delete 2>/dev/null || true
  find "$STATE_DIR" -name "*.lock" -mtime +1 -delete 2>/dev/null || true
}

# Cleanup on exit
trap cleanup_old_state EXIT
