# ekkOS Templates

Complete templates for the ekkOS memory system. Use `install-ekkos.sh` to install everything.

## 📦 What's Included

### 🪝 Hooks (4 files)

Shell scripts that run during the Claude Code session lifecycle to enable the **Golden Loop 5-Phase Flow**.

**Location**: `~/.claude/hooks/`

| Hook | Purpose | Golden Loop Phase |
|------|---------|-------------------|
| `session-start.sh` | Initialize tracking on session start | Setup |
| `user-prompt-submit.sh` | Capture user context at turn start | **1. CAPTURE** |
| `stop.sh` | Detect patterns, track outcomes at turn end | **3. RETRIEVE**, **4. INJECT**, **5. MEASURE** |
| `assistant-response.sh` | Process agent responses | **2. LEARN** (implicit) |

**Features**:
- Real-time Golden Loop tracking
- Automatic pattern detection and injection
- Turn-by-turn memory capture to Redis
- Session name generation and management
- Working memory preservation across `/clear`

### 📚 Skills (12 skills)

User-invocable commands that leverage ekkOS memory.

**Location**: `~/.claude/skills/`

| Skill | Command | Purpose |
|-------|---------|---------|
| `continue` | `/continue` | Restore context after `/clear` from Redis (20 turns, <10ms) |
| `permissions` | `/permissions` | Manage proactive tool execution permissions |
| `ekkOS_Memory_First` | Auto | Search memory before debugging/solving problems |
| `ekkOS_Learn` | Auto | Capture solutions as patterns after fixing bugs |
| `ekkOS_Deep_Recall` | Auto | Time-based recall ("yesterday", "last week") |
| `ekkOS_Preferences` | Auto | Capture user directives ("always", "never") |
| `ekkOS_Safety` | Auto | Pre-flight safety checks before destructive ops |
| `ekkOS_Schema` | Auto | Database field awareness (Supabase/Prisma) |
| `ekkOS_Vault` | Auto | Encrypted secrets management (API keys, tokens) |
| `ekkOS_Summary` | Auto | Session activity summary |
| `ekkOS_Reflect` | Auto | Response quality analysis |
| `ekkOS_Plan_Assist` | Auto | Structured task planning |

**Skill Triggers**: Skills activate automatically based on user language patterns (e.g., "yesterday" → Deep Recall).

### 🤖 Agents (4 agents)

Specialized agents with built-in 5-Phase Flow for specific tasks.

**Location**: `~/.claude/agents/` (Markdown files with YAML frontmatter)

| Agent | Triggers | Purpose |
|-------|----------|---------|
| `debug-detective` | error, bug, broken, failing | Systematic debugging with pattern memory |
| `code-reviewer` | review, PR, check code | PR reviews enforcing team patterns |
| `git-companion` | git, commit, branch, merge | Git workflow assistance |
| `railway-manager` | railway, deploy, workers, pm2, queue | Railway/PM2 infrastructure management |

**Agent Format** (Markdown with YAML frontmatter):
```markdown
---
name: agent-name
description: "When to use this agent. Include 'proactively' for auto-trigger."
tools: Read, Write, Bash, mcp__ekkos-memory__ekkOS_Search
model: sonnet
color: blue
---

# Agent Title

System prompt content goes here...
```

**Agent Features**:
- Full 5-Phase Flow enforcement
- PatternGuard (SELECT/SKIP acknowledgment)
- Automatic memory retrieval before action
- Outcome tracking and pattern forging

### 📖 Documentation Templates

Additional templates for Cursor and other environments:

- `cursor-rules/` - Cursor-specific ekkOS rules
- `cursor-hooks/` - Cursor-compatible hooks
- `claude-plugins-admin/` - Admin agent proposals
- `claude-plugins/` - User-facing plugin proposals

## 🚀 Installation

### Quick Install (Recommended)

```bash
cd extensions/ekkos-connect
./install-ekkos.sh
```

This installs:
- ✅ All 4 hooks with Golden Loop tracking
- ✅ All 12 skills
- ✅ All 3 agents
- ✅ hooks.json configuration
- ✅ Verifies API connectivity

### Manual Install

#### 1. Install Hooks

```bash
cp templates/hooks/*.sh ~/.claude/hooks/
cp -r templates/hooks/lib ~/.claude/hooks/
chmod +x ~/.claude/hooks/*.sh
```

#### 2. Install Skills

```bash
mkdir -p ~/.claude/skills
cp -r templates/skills/* ~/.claude/skills/
```

#### 3. Install Agents

```bash
mkdir -p ~/.claude/claude-plugins/agents
cp templates/claude-plugins/agents/*.json ~/.claude/claude-plugins/agents/
```

#### 4. Configure hooks.json

```bash
cat > ~/.claude/hooks/hooks.json << 'EOF'
{
  "hooks": {
    "session-start": {
      "command": "~/.claude/hooks/session-start.sh",
      "enabled": true
    },
    "user-prompt-submit": {
      "command": "~/.claude/hooks/user-prompt-submit.sh",
      "enabled": true
    },
    "stop": {
      "command": "~/.claude/hooks/stop.sh",
      "enabled": true
    }
  }
}
EOF
```

## 🔄 The Golden Loop (5-Phase Flow)

The hooks and agents implement a continuous learning loop:

```
┌─────────────────────────────────────────────────────────┐
│                    THE GOLDEN LOOP                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. CAPTURE  → Log context (user-prompt-submit.sh)     │
│       ↓                                                 │
│  2. LEARN    → Agent processes with tools               │
│       ↓                                                 │
│  3. RETRIEVE → Search memory for patterns (stop.sh)     │
│       ↓                                                 │
│  4. INJECT   → Apply patterns to solution               │
│       ↓                                                 │
│  5. MEASURE  → Track outcomes, forge new patterns       │
│       ↓                                                 │
│       └──────────── (back to CAPTURE) ─────────────────┘│
│                                                         │
│  Result: Agent gets SMARTER with every turn             │
└─────────────────────────────────────────────────────────┘
```

### How It Works

**Turn N starts**:
1. `user-prompt-submit.sh` runs → **CAPTURE** user context
2. Agent receives prompt → **LEARN** (processes with tools)
3. Agent response completes → `stop.sh` runs
4. `stop.sh` detects ekkOS_Search calls → **RETRIEVE** confirmed
5. `stop.sh` detects [ekkOS_SELECT] markers → **INJECT** confirmed
6. `stop.sh` detects ekkOS_Forge calls → **MEASURE** confirmed
7. All phases logged to working memory (Redis)
8. VS Code extension displays real-time phase status

**Turn N+1 starts** → Repeat with improved patterns!

## 📊 PatternGuard (SELECT/SKIP)

All agents and memory-aware responses must acknowledge retrieved patterns:

```markdown
[ekkOS_SELECT]
- id: pattern-abc123
  reason: Matches this error type exactly
  confidence: 0.95
[/ekkOS_SELECT]

[ekkOS_SKIP]
- id: pattern-xyz789
  reason: Different framework, not applicable
[/ekkOS_SKIP]
```

**Why?** This provides:
- 100% pattern coverage (no ignored patterns)
- Feedback loop for pattern quality
- Audit trail of decision-making

## 🔐 Permissions System

Skills can request permissions for proactive execution:

```bash
# View current permissions
/permissions

# Grant auto-search before answering
/permissions grant search:auto_before_answer

# Revoke auto-forge on bug fix
/permissions revoke forge:auto_on_fix

# Reset to safe defaults
/permissions reset
```

## 🧪 Testing the Installation

After installing, start a new Claude Code session and try:

```bash
# 1. Test /continue skill
/continue

# 2. Test permissions
/permissions list

# 3. Trigger Debug Detective agent
# (Just describe an error and it should activate)

# 4. Check Golden Loop tracking
# Open VS Code sidebar → ekkOS Connect
# Should show real-time phase tracking
```

## 📁 Directory Structure

```
templates/
├── hooks/                      # Shell hooks for Claude Code
│   ├── user-prompt-submit.sh   # CAPTURE phase
│   ├── stop.sh                 # RETRIEVE/INJECT/MEASURE
│   ├── session-start.sh        # Initialize
│   ├── assistant-response.sh   # LEARN phase
│   └── lib/                    # Shared utilities
│       ├── contract.sh         # Pattern contract parsing
│       └── state.sh            # State management
│
├── skills/                     # User-invocable skills
│   ├── continue/               # Context restoration
│   ├── permissions/            # Permission management
│   ├── ekkOS_Memory_First/     # Search-first debugging
│   ├── ekkOS_Learn/            # Pattern forging
│   ├── ekkOS_Deep_Recall/      # Time-based recall
│   ├── ekkOS_Preferences/      # Directive capture
│   ├── ekkOS_Safety/           # Safety checks
│   ├── ekkOS_Schema/           # DB field awareness
│   ├── ekkOS_Vault/            # Secrets management
│   ├── ekkOS_Summary/          # Activity reports
│   ├── ekkOS_Reflect/          # Quality analysis
│   └── ekkOS_Plan_Assist/      # Task planning
│
├── claude-plugins/agents/      # Specialized agents
│   ├── debug-detective.json    # Systematic debugger
│   ├── code-reviewer.json      # PR reviewer
│   ├── git-companion.json      # Git workflow helper
│   └── railway-manager.json    # Railway/PM2 infrastructure
│
├── cursor-rules/               # Cursor-specific
│   └── ekkos-memory.md
│
└── cursor-hooks/               # Cursor-compatible hooks
    ├── before-submit-prompt.sh
    └── after-agent-response.sh
```

## 🔧 Updating Templates

To update your installed templates with the latest version:

```bash
# 1. Pull latest changes
cd /path/to/EKKOS
git pull

# 2. Re-run install script
cd extensions/ekkos-connect
./install-ekkos.sh
```

The install script will overwrite existing files with the latest versions.

## ⚡ Performance

- **Hooks**: <50ms overhead per turn
- **Redis working memory**: <10ms retrieval
- **Pattern injection**: Real-time (no user-visible delay)
- **Sidebar updates**: Event-driven (no polling)

## 🐛 Troubleshooting

### Hooks not running

```bash
# Check hooks are executable
ls -la ~/.claude/hooks/*.sh

# Check hooks.json exists
cat ~/.claude/hooks/hooks.json

# Test hook manually
~/.claude/hooks/session-start.sh
```

### Skills not appearing

```bash
# Check skills directory
ls -la ~/.claude/skills/

# Each skill should have SKILL.md or Skill.md
ls ~/.claude/skills/*/SKILL.md
```

### Golden Loop not tracking

```bash
# Check hook output
# Hooks should emit: [ekkOS_GL_PHASE:X] markers

# Verify Redis connectivity
curl -s "https://api.ekkos.dev/health"

# Check API key
jq '.apiKey' ~/.ekkos/config.json
```

## 📚 Documentation

- **Docs**: https://docs.ekkos.dev
- **Golden Loop**: See `docs/GOLDEN_LOOP_ORCHESTRATION.md`
- **Permissions**: See `docs/PERMISSIONS_SYSTEM.md`
- **Architecture**: See `docs/PERMISSION_5_PHASE_FLOW.md`

## 🤝 Contributing

Template improvements welcome! Submit PRs to:
- Fix bugs in hooks
- Add new skills
- Create new agents
- Improve documentation

## 📜 License

MIT - ekkOS Technologies Inc.

---

**Version**: 2.11.0
**Last Updated**: 2026-01-13
