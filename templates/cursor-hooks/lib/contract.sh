#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════
# ekkOS_ Turn Contract Library
#
# Shared functions for Golden Loop compliance enforcement.
# Used by BOTH Claude Code (.claude/) and Cursor (.cursor/) hooks.
#
# TURN CONTRACT: Evidence that retrieval occurred before answering.
# This is the SINGLE SOURCE OF TRUTH for compliance auditing.
# ═══════════════════════════════════════════════════════════════════════════

# Get contract directory based on environment
get_contract_dir() {
  local source="${1:-claude-code}"
  local project_root="${2:-$PROJECT_ROOT}"

  if [ "$source" = "cursor" ]; then
    echo "$project_root/.cursor/state/ekkos"
  else
    echo "$project_root/.claude/state/ekkos"
  fi
}

# Generate stable hash of user prompt (for deduplication)
generate_query_hash() {
  local query="$1"
  # Use md5 on macOS, md5sum on Linux
  if command -v md5 >/dev/null 2>&1; then
    echo -n "$query" | md5 | cut -c1-16
  elif command -v md5sum >/dev/null 2>&1; then
    echo -n "$query" | md5sum | cut -c1-16
  else
    # Fallback: simple hash using cksum
    echo -n "$query" | cksum | cut -d' ' -f1
  fi
}

# Write turn contract at RETRIEVAL time
# This is the EVIDENCE that retrieval happened before answering
write_turn_contract() {
  local session_id="$1"
  local retrieval_ok="$2"
  local retrieval_source="$3"
  local pattern_ids="$4"      # Comma-separated list
  local directive_ids="$5"    # Comma-separated list
  local query_hash="$6"
  local project_root="${7:-$PROJECT_ROOT}"

  local contract_dir
  contract_dir=$(get_contract_dir "$retrieval_source" "$project_root")
  mkdir -p "$contract_dir" 2>/dev/null || return 1

  local contract_file="$contract_dir/turn-contract-${session_id}.json"
  local timestamp
  timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)

  # Convert comma-separated IDs to JSON array
  local pattern_array
  local directive_array
  if [ -n "$pattern_ids" ]; then
    pattern_array=$(echo "$pattern_ids" | tr ',' '\n' | grep -v '^$' | jq -R . | jq -s .)
  else
    pattern_array="[]"
  fi
  if [ -n "$directive_ids" ]; then
    directive_array=$(echo "$directive_ids" | tr ',' '\n' | grep -v '^$' | jq -R . | jq -s .)
  else
    directive_array="[]"
  fi

  # Write contract
  cat > "$contract_file" << EOF
{
  "session_id": "$session_id",
  "retrieval_ok": $retrieval_ok,
  "retrieval_source": "$retrieval_source",
  "retrieved_pattern_ids": $pattern_array,
  "retrieved_directive_ids": $directive_array,
  "timestamp": "$timestamp",
  "query_hash": "$query_hash",
  "ekkos_strict": ${EKKOS_STRICT:-0}
}
EOF

  return 0
}

# Read turn contract
read_turn_contract() {
  local session_id="$1"
  local retrieval_source="$2"
  local project_root="${3:-$PROJECT_ROOT}"

  local contract_dir
  contract_dir=$(get_contract_dir "$retrieval_source" "$project_root")
  local contract_file="$contract_dir/turn-contract-${session_id}.json"

  if [ -f "$contract_file" ]; then
    cat "$contract_file"
    return 0
  else
    return 1
  fi
}

# Extract field from contract JSON
get_contract_field() {
  local contract_json="$1"
  local field="$2"

  echo "$contract_json" | jq -r ".$field // \"\"" 2>/dev/null
}

# Get array field as comma-separated string
get_contract_array() {
  local contract_json="$1"
  local field="$2"

  echo "$contract_json" | jq -r ".$field // [] | join(\",\")" 2>/dev/null
}

# Cleanup turn contract (only after successful capture)
cleanup_turn_contract() {
  local session_id="$1"
  local retrieval_source="$2"
  local project_root="${3:-$PROJECT_ROOT}"

  local contract_dir
  contract_dir=$(get_contract_dir "$retrieval_source" "$project_root")
  local contract_file="$contract_dir/turn-contract-${session_id}.json"

  rm -f "$contract_file" 2>/dev/null
}

# Check if strict mode is enabled
is_strict_mode() {
  [ "${EKKOS_STRICT:-0}" = "1" ]
}

# Generate strict mode blocker message for Claude Code
get_strict_blocker_message() {
  cat << 'EOF'
════════════════════════════════════════════════════════════════════════════
⛔ EKKOS_STRICT MODE: RETRIEVAL FAILED — DO NOT ANSWER

ekkOS memory retrieval failed or was not authenticated.
In STRICT mode, you MUST NOT answer technical questions without memory context.

ACTION REQUIRED:
1. Check if ekkOS is connected: Run `ekkOS: Connect` in VS Code
2. Verify auth token exists: ~/.ekkos/config.json
3. Retry the request after connecting

DO NOT proceed with answering. The Golden Loop requires retrieval FIRST.
════════════════════════════════════════════════════════════════════════════
EOF
}

# Validate PatternGuard coverage (returns 0-100)
calculate_pattern_guard_coverage() {
  local assistant_response="$1"
  local pattern_ids="$2"  # Comma-separated

  # Count total patterns
  local total_count
  total_count=$(echo "$pattern_ids" | tr ',' '\n' | grep -c '.' || echo 0)

  if [ "$total_count" -eq 0 ]; then
    echo "100"  # No patterns = 100% coverage by definition
    return 0
  fi

  # Extract acknowledged IDs from [ekkOS_SELECT] and [ekkOS_SKIP] blocks
  local acknowledged_count=0

  # Check SELECT block
  local select_block
  select_block=$(echo "$assistant_response" | grep -ozP '\[ekkOS_SELECT\][\s\S]*?\[/ekkOS_SELECT\]' 2>/dev/null | tr '\0' '\n' || true)
  if [ -n "$select_block" ]; then
    local select_count
    select_count=$(echo "$select_block" | grep -oE 'id:\s*[a-f0-9-]+' | wc -l | tr -d ' ')
    acknowledged_count=$((acknowledged_count + select_count))
  fi

  # Check SKIP block
  local skip_block
  skip_block=$(echo "$assistant_response" | grep -ozP '\[ekkOS_SKIP\][\s\S]*?\[/ekkOS_SKIP\]' 2>/dev/null | tr '\0' '\n' || true)
  if [ -n "$skip_block" ]; then
    local skip_count
    skip_count=$(echo "$skip_block" | grep -oE 'id:\s*[a-f0-9-]+' | wc -l | tr -d ' ')
    acknowledged_count=$((acknowledged_count + skip_count))
  fi

  # Legacy: Check for [ekkOS_APPLY] markers (fallback)
  if [ "$acknowledged_count" -eq 0 ]; then
    local apply_count
    apply_count=$(echo "$assistant_response" | grep -c '\[ekkOS_APPLY\]' || echo 0)
    acknowledged_count=$apply_count
  fi

  # Calculate coverage percentage
  local coverage
  coverage=$((acknowledged_count * 100 / total_count))

  # Cap at 100%
  if [ "$coverage" -gt 100 ]; then
    coverage=100
  fi

  echo "$coverage"
}

# Check for ekkOS footer presence
check_footer_present() {
  local assistant_response="$1"

  # Look for the mandatory footer format:
  # 🧠 **ekkOS_™** · 📅 YYYY-MM-DD
  # OR
  # {IDE} ({Model}) · 🧠 **ekkOS_™** · 📅 {Timestamp}

  if echo "$assistant_response" | grep -qE '🧠.*ekkOS.*📅.*[0-9]{4}-[0-9]{2}-[0-9]{2}'; then
    echo "true"
    return 0
  else
    echo "false"
    return 1
  fi
}

# Build compliance metadata for capture
build_compliance_metadata() {
  local retrieval_ok="$1"
  local pattern_guard_coverage="$2"
  local footer_present="$3"
  local ekkos_strict="$4"
  local retrieved_count="$5"

  local pattern_guard_required="false"
  if [ "$retrieved_count" -gt 0 ]; then
    pattern_guard_required="true"
  fi

  cat << EOF
{
  "retrieval_ok": $retrieval_ok,
  "pattern_guard_required": $pattern_guard_required,
  "pattern_guard_coverage_pct": $pattern_guard_coverage,
  "footer_present": $footer_present,
  "ekkos_strict": $ekkos_strict,
  "retrieved_count": $retrieved_count,
  "compliance_version": "1.0"
}
EOF
}

# Determine if turn is compliant
is_turn_compliant() {
  local retrieval_ok="$1"
  local pattern_guard_coverage="$2"
  local footer_present="$3"
  local pattern_count="$4"

  # Retrieval must have succeeded
  if [ "$retrieval_ok" != "true" ]; then
    echo "false"
    return 1
  fi

  # If patterns were retrieved, PatternGuard must be 100%
  if [ "$pattern_count" -gt 0 ] && [ "$pattern_guard_coverage" -lt 100 ]; then
    echo "false"
    return 1
  fi

  # Footer must be present
  if [ "$footer_present" != "true" ]; then
    echo "false"
    return 1
  fi

  echo "true"
  return 0
}

# Generate violation reason
get_violation_reason() {
  local retrieval_ok="$1"
  local pattern_guard_coverage="$2"
  local footer_present="$3"
  local pattern_count="$4"

  local reasons=""

  if [ "$retrieval_ok" != "true" ]; then
    reasons="retrieval_failed"
  fi

  if [ "$pattern_count" -gt 0 ] && [ "$pattern_guard_coverage" -lt 100 ]; then
    if [ -n "$reasons" ]; then
      reasons="$reasons,pattern_guard_incomplete"
    else
      reasons="pattern_guard_incomplete"
    fi
  fi

  if [ "$footer_present" != "true" ]; then
    if [ -n "$reasons" ]; then
      reasons="$reasons,footer_missing"
    else
      reasons="footer_missing"
    fi
  fi

  if [ -z "$reasons" ]; then
    reasons="none"
  fi

  echo "$reasons"
}
