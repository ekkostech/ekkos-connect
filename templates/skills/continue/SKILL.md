---
name: continue
description: Resume session after /clear - instant restore from local cache (1ms) with Redis/Supabase fallback
allowed-tools:
  - Bash
---

# /continue

Instant session restore. NO THINKING - just execute.

## Execution

**Run this IMMEDIATELY - do not analyze, just execute:**

```bash
export EKKOS_SESSION="${ARGUMENTS:-}"
# Use session-specific temp file to avoid collision across concurrent sessions
output_file="/tmp/continue-restore-${EKKOS_SESSION:-default}.md"

# ═══════════════════════════════════════════════════════════════════════════
# TIER 0: Local cache restore (~1ms) - TRY FIRST
# ═══════════════════════════════════════════════════════════════════════════
tier0_result=$(ekkos-capture restore "$EKKOS_SESSION" --markdown 2>/dev/null)
tier0_exit=$?

if [ $tier0_exit -eq 0 ] && [ -n "$tier0_result" ] && echo "$tier0_result" | grep -q "CONTEXT RESTORED"; then
  echo "$tier0_result" > "$output_file"
  # Extract session name and stats (portable - no grep -P)
  session_name=$(echo "$tier0_result" | grep "Session:" | head -1 | sed 's/.*Session: \([^ (]*\).*/\1/')
  turns=$(echo "$tier0_result" | grep "Turns restored:" | head -1 | sed 's/.*Turns restored: \([0-9]*\).*/\1/')
  source=$(echo "$tier0_result" | grep "Source:" | head -1 | sed 's/.*Source: \([a-z]*\).*/\1/')
  echo "✓ $session_name restored ($turns turns from $source cache)"
  echo "📄 Full content: $output_file"
  exit 0
fi

# ═══════════════════════════════════════════════════════════════════════════
# TIER 1/2: API fallback (Redis ~150ms, Supabase ~500ms)
# ═══════════════════════════════════════════════════════════════════════════
python3 << 'PYTHON'
import urllib.request
import json
import os
import sys

session = os.environ.get('EKKOS_SESSION', '').strip()

# Read config
config = {}
try:
    with open(os.path.expanduser('~/.ekkos/config.json'), 'r') as f:
        config = json.load(f)
except:
    pass

auth = config.get('hookApiKey') or config.get('apiKey', '')

# Use session-specific temp file (matches bash section)
output_file = f"/tmp/continue-restore-{session or 'default'}.md"

url = "https://api.ekkos.dev/api/v1/working/restore"
if session:
    url += f"?session={session}&full=true"

req = urllib.request.Request(url, headers={"Authorization": f"Bearer {auth}"})

try:
    with urllib.request.urlopen(req, timeout=15) as response:
        data = json.loads(response.read().decode('utf-8'))

        if data.get('mode') == 'full_restore' and 'turns' in data:
            turns = data['turns']
            session_name = data.get('session_name', session or 'unknown')

            # Build system-reminder format matching local restore
            MAX_SIZE = 60000  # ~15k tokens
            output_lines = [
                '<system-reminder>',
                'CONTEXT RESTORED (ekkOS /continue)',
                f'Session: {session_name}',
                'Source: redis',
                f'Turns restored: {len(turns)}',
                '',
                '## Recent Turns (older → newer)',
            ]

            cumulative_size = 0
            turn_count = 0

            # Process turns oldest first for narrative flow
            for turn in turns:
                turn_num = turn.get('turn_number', '?')
                user_query = turn.get('user', {}).get('query', '')
                agent_response = turn.get('agent', {}).get('response', '')
                tools = turn.get('agent', {}).get('tools_used', [])
                files = turn.get('user', {}).get('files_referenced', [])

                if not user_query and not agent_response:
                    continue

                turn_lines = [f"### Turn {turn_num}"]
                if user_query:
                    turn_lines.append(f"**User:** {user_query}")
                if agent_response:
                    if len(agent_response) > 4000:
                        agent_response = agent_response[:4000] + "\n\n[...truncated...]"
                    turn_lines.append(f"\n**Assistant:**\n{agent_response}")
                if tools:
                    turn_lines.append(f"\n*Tools: {', '.join(tools)}*")
                if files:
                    turn_lines.append(f"\n*Files: {', '.join(files[:10])}*")
                turn_lines.append("\n---\n")

                turn_content = "\n".join(turn_lines)
                turn_size = len(turn_content.encode('utf-8'))

                if cumulative_size + turn_size > MAX_SIZE:
                    break

                output_lines.extend(turn_lines)
                cumulative_size += turn_size
                turn_count += 1

            output_lines.extend([
                '',
                'INSTRUCTION: Resume seamlessly where you left off.',
                'Do not ask "what were we doing?"',
                'Start your response with: "✓ Continuing -"',
                '</system-reminder>'
            ])

            kb_size = cumulative_size / 1024
            token_est = cumulative_size // 4

            with open(output_file, 'w', encoding='utf-8') as f:
                f.write("\n".join(output_lines))

            print(f"✓ {session_name} restored ({turn_count} turns from redis, {kb_size:.1f}KB, ~{token_est} tokens)")
            print(f"📄 Full content: {output_file}")
        else:
            # Try to show available sessions if session not found
            if 'available_sessions' in data:
                sessions = data.get('available_sessions', [])
                with open(output_file, 'w', encoding='utf-8') as f:
                    f.write(f"Session '{session}' not found\n\n")
                    f.write("Available sessions:\n")
                    for s in sessions[:10]:
                        f.write(f"- {s}\n")
                print(f"Session '{session}' not found")
                print(f"📄 Available sessions: {output_file}")
                sys.exit(1)
            else:
                markdown = data.get('markdown', '')
                if markdown:
                    with open(output_file, 'w', encoding='utf-8') as f:
                        f.write(markdown)
                    print("✓ Session restored (fallback mode)")
                    print(f"📄 Full content: {output_file}")
                else:
                    print("Error: No session data available")
                    sys.exit(1)
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
PYTHON
```

**Then immediately read the output file (path shown in console output) using the Read tool to display the full content to the user. Do not just echo the bash output.**
