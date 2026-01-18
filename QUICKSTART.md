# 🚀 ekkOS Quick Start

Get the full ekkOS memory experience in under 5 minutes.

## Prerequisites

1. **Sign up at https://ekkos.dev**
   - Get your API key
   - Creates `~/.ekkos/config.json`

2. **Install dependencies** (macOS):
   ```bash
   brew install jq curl
   ```

## Installation (One Command)

```bash
cd extensions/ekkos-connect
./install-ekkos.sh
```

**That's it!** You now have:
- ✅ Golden Loop 5-Phase tracking
- ✅ 12 skills (including `/continue`, `/permissions`)
- ✅ 3 specialized agents
- ✅ Real-time sidebar tracking
- ✅ Redis working memory

## Verify Installation

```bash
# Check hooks are installed
ls -la ~/.claude/hooks/*.sh

# Check skills are installed
ls ~/.claude/skills/

# Check agents are installed
ls ~/.claude/claude-plugins/agents/
```

## First Steps

### 1. Start a New Session

Open Claude Code and start a conversation. The Golden Loop is now active!

### 2. Try `/continue`

After a few turns, try clearing and restoring:

```bash
/clear
/continue
```

You should see your last 20 turns restored in <10ms from Redis.

### 3. Check Permissions

```bash
/permissions
```

This shows what ekkOS can do proactively. Grant permissions for auto-features:

```bash
/permissions grant search:auto_before_answer
/permissions grant track:auto_track_usage
```

### 4. Trigger an Agent

Just describe a bug or error:

```
"Getting TypeError: cannot read property 'name' of undefined"
```

The **Debug Detective** agent should activate automatically and use the 5-Phase Flow to fix it.

### 5. Check the Sidebar

Open the **ekkOS Connect** sidebar in VS Code to see real-time Golden Loop tracking:

```
🔄 Golden Loop Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase 1: CAPTURE    ✅
Phase 2: LEARN      ✅
Phase 3: RETRIEVE   ✅  (2 patterns found)
Phase 4: INJECT     ✅  (1 pattern applied)
Phase 5: MEASURE    ✅  (1 pattern forged)

Last Turn: 12
Patterns Used: 34
Success Rate: 91%
```

## The Golden Loop (How It Works)

Every turn, ekkOS runs through 5 phases automatically:

```
1. CAPTURE  → Hook logs your context
2. LEARN    → Claude processes your request
3. RETRIEVE → Searches memory for patterns
4. INJECT   → Applies relevant patterns to the solution
5. MEASURE  → Tracks outcomes, forges new patterns
```

**Result**: Claude gets smarter with every bug you fix, every pattern you use.

## Common Commands

```bash
# Restore context after /clear
/continue

# Manage permissions
/permissions list
/permissions grant <scope>
/permissions revoke <scope>

# (More skills auto-trigger based on your language)
```

## What's Happening Behind the Scenes?

### On Every Turn

1. **user-prompt-submit.sh** runs
   - Captures your query
   - Logs to Redis working memory
   - Emits CAPTURE phase marker

2. **Claude processes** your request
   - May call `ekkOS_Search` to find patterns
   - Applies patterns if found
   - Generates response

3. **stop.sh** runs
   - Detects if `ekkOS_Search` was called (RETRIEVE)
   - Detects `[ekkOS_SELECT]` markers (INJECT)
   - Detects `ekkOS_Forge` calls (MEASURE)
   - Updates sidebar with phase status

4. **Working memory updated**
   - Full turn saved to Redis
   - Available for `/continue` later

### On Session Start

- **session-start.sh** initializes tracking
- Generates session name (e.g., "glossy-badger")
- Creates state file

### On `/continue`

- Fetches last 20 turns from Redis (<10ms)
- Full verbatim restoration (queries, responses, diffs)
- Falls back to Supabase if not in hot cache

## Troubleshooting

### Hooks not running?

```bash
# Make sure they're executable
chmod +x ~/.claude/hooks/*.sh

# Test manually
~/.claude/hooks/session-start.sh
```

### Golden Loop not tracking?

```bash
# Check API connectivity
curl -s https://api.ekkos.dev/health

# Check your API key
jq '.apiKey' ~/.ekkos/config.json
```

### Skills not appearing?

Make sure each skill has a SKILL.md or Skill.md file:

```bash
ls ~/.claude/skills/*/SKILL.md
```

## Next Steps

1. **Read the docs**: https://docs.ekkos.dev
2. **Explore skills**: Check `~/.claude/skills/` for auto-trigger conditions
3. **Try agents**: Describe bugs, ask for PR reviews, use git commands
4. **Grant permissions**: `/permissions` to enable auto-features
5. **Check patterns**: `/patterns list` (if you have the skill installed)

## Advanced: Customize

### Create Your Own Agent

See `extensions/ekkos-connect/templates/claude-plugins/agents/debug-detective.json` as a template.

Key requirements:
- Include 5-Phase Flow in systemPrompt
- Add PatternGuard (SELECT/SKIP) enforcement
- List required tools (ekkOS_Search, ekkOS_Forge, etc.)
- Define triggers (keywords that activate the agent)

### Create Your Own Skill

See `extensions/ekkos-connect/templates/skills/continue/Skill.md` as a template.

Format:
```markdown
---
name: my-skill
description: What it does
allowed-tools:
  - Bash
  - Read
---

# /my-skill

Skill content here...
```

Place in `~/.claude/skills/my-skill/SKILL.md`

## Performance

- **Hooks**: <50ms per turn
- **Redis**: <10ms retrieval
- **Pattern injection**: Real-time (0ms user-visible)
- **Sidebar**: Event-driven updates (no polling)

## Support

- **Issues**: https://github.com/anthropics/claude-code/issues
- **Docs**: https://docs.ekkos.dev
- **Community**: Coming soon

---

**You're all set!** Start using Claude Code and watch it get smarter with every conversation. 🧠

**Version**: 2.11.0
**Last Updated**: 2026-01-13
