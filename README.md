![ekkOS_ Connect Banner](https://raw.githubusercontent.com/ekkostech/ekkos-connect/main/ekkos_connect_banner.png)

# ekkOS_ Connect

This repository contains the **official VS Code/Cursor extension** for ekkOS_ — the persistent memory layer for AI coding assistants.

> **Note:** Forks or mirrors of this repository may be outdated. For the most current version, install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=ekkos.ekkos-connect).

---

## Endless Context CLI — `ekkos run`

**The killer feature:** A Claude Code wrapper that gives you **endless context** with near-zero loss.

```bash
# Install and run
npx @ekkos/cli run
```

**What happens:**
1. Launches Claude Code in a smart PTY wrapper
2. Monitors context usage in real-time
3. When context fills up → **auto-clears** and **auto-continues**
4. Your conversation continues seamlessly — you barely notice

**No more "sorry, I lost context."** The CLI handles everything automatically.

### Human-Readable Session IDs

Every session gets a memorable 3-word name like `groovy-koala-saves` or `velvet-monk-skips`:

- **Deterministic** — Same session always gets the same name
- **Trackable** — Appears in Claude's footer: `· Turn 47 · groovy-koala-saves ·`
- **Resumable** — `/continue groovy-koala-saves` picks up where you left off

### Time Machine — View Full Sessions

Every turn is stored and viewable on the **ekkOS_ Platform**:

**[platform.ekkos.dev/time-machine](https://platform.ekkos.dev/time-machine)**

- Browse all your sessions by name or date
- View full conversation history turn-by-turn
- See patterns applied, files touched, decisions made
- Export sessions for reference or debugging
- **Live Mode** — Watch sessions update in real-time

> Your AI conversations are now **auditable, searchable, and permanent**.

---

## Early Access - Free Beta

You're early! This extension and [ekkos.dev](https://ekkos.dev) are in **free beta**.

| What to expect               |                                                   |
| ---------------------------- | ------------------------------------------------- |
| Free during beta             | No credit card needed                             |
| Frequent updates             | New features weekly                               |
| Your feedback matters        | Join us on [Discord](https://discord.gg/vePAuEYp) |

**Found an issue?** [Report it](https://github.com/ekkostech/ekkos-connect/issues)

---

## What This Extension Does

One-click setup for ekkOS_ memory across all AI IDEs:

- **One-click OAuth** — Connect to your ekkOS_ account instantly
- **Auto MCP Deploy** — Automatically configures all supported IDEs:
  - Cursor (`~/.cursor/mcp.json`)
  - Claude Code CLI (`~/.claude/settings.json`)
  - Claude Desktop App
  - Windsurf (`~/.codeium/windsurf/mcp_config.json`)
  - VS Code (Continue extension)
  - OpenAI Codex CLI
- **Cross-Platform** — macOS, Linux, and Windows
- **Health Check** — Test MCP connectivity with one click
- **AI Instructions** — Deploy `.claude.md` and `.cursorrules` to your project
- **Status Bar** — Always know your connection status
- **Setup Wizard** — Windows-optimized one-button setup with auto-fix
- **System Check** — 3-gate preflight diagnostics (Claude, PTY, MCP)

---

## New in v2.12.18

### Windows Preflight System

The extension now includes a comprehensive Windows setup wizard that ensures all prerequisites are met before enabling auto-continue features:

| Gate | What It Checks |
|------|---------------|
| **Interactive Claude** | Claude Code installed and responds to commands |
| **PTY (Terminal)** | ConPTY support via node-pty for TUI mode |
| **MCP Configuration** | ekkOS_ MCP server registered and running |

### CLI Doctor Command

The companion CLI includes diagnostic tools:

```bash
# Run 3-gate diagnostics
npx @ekkos/cli doctor

# Machine-readable output (for automation)
npx @ekkos/cli doctor --json

# Attempt auto-fixes for safe issues
npx @ekkos/cli doctor --fix
```

### Auto-Continue Improvements

- **Session State Fix**: Uses `observedSessionThisRun` pattern to prevent stale session restoration
- **Cache Fallback**: Falls back to most recent session from local cache when no session observed
- **Hard Fail on Windows**: Clear error messages with remediation steps when PTY unavailable

---

## What This Extension Does NOT Document

This extension intentionally does not describe:
- Internal system architecture
- How memory is processed server-side
- Infrastructure or backend topology

---

## Getting Started

1. Click the ekkOS_ icon in the activity bar
2. Click "Connect Account"
3. Sign in with your ekkOS_ account
4. MCP config is automatically deployed to all detected IDEs

---

## Commands

| Command | Description |
|---------|-------------|
| `ekkOS_: Connect Account` | Start OAuth flow |
| `ekkOS_: Disconnect Account` | Remove local credentials |
| `ekkOS_: Deploy MCP Config` | Deploy MCP config to all IDEs |
| `ekkOS_: Deploy AI Instructions` | Add `.claude.md` and `.cursorrules` to project |
| `ekkOS_: Open Dashboard` | Open platform.ekkos.dev |
| `ekkOS_: Setup Wizard (Recommended)` | One-button setup with auto-fix for Windows |
| `ekkOS_: Run System Check` | Preflight diagnostics (Claude, PTY, MCP) |

---

## Configuration

| Setting               | Default                      | Description                |
| --------------------- | ---------------------------- | -------------------------- |
| `ekkos.apiUrl`        | `https://mcp.ekkos.dev`      | ekkOS_ API URL              |
| `ekkos.platformUrl`   | `https://platform.ekkos.dev` | Platform URL               |
| `ekkos.autoDeployMcp` | `true`                       | Auto-deploy MCP after auth |
| `ekkos.showStatusBar` | `true`                       | Show status bar item       |

---

## Requirements

- VS Code 1.80.0+ (or Cursor/Windsurf)
- Node.js 18+ (for MCP server)
- Claude Code CLI (for `ekkos run` auto-continue features)

---

## Windows Setup

Windows users should run the **Setup Wizard** for best results:

1. Open Command Palette (`Ctrl+Shift+P`)
2. Run `ekkOS_: Setup Wizard (Recommended)`
3. The wizard will:
   - Check Claude Code installation
   - Verify PTY support (required for auto-continue)
   - Configure MCP server
   - Auto-fix issues or show one-click terminal commands

**CLI Diagnostics:**
```bash
# Check system prerequisites
npx @ekkos/cli doctor

# Auto-fix safe issues
npx @ekkos/cli doctor --fix

# Run Claude with auto-continue
npx @ekkos/cli run
```

---

## Endless Context & Session Management

### How "Endless Context" Works

ekkOS_ creates the **illusion of endless context** through:

1. **Lossless Verbatim Storage** — Every turn is captured to L2 (episodic memory) with full fidelity
2. **Smart Background Compression** — When context approaches limits, ekkOS_ preserves and restores seamlessly
3. **Local Cache** — Session data cached at `~/.ekkos/cache/sessions/` for instant restoration

> **Note:** This is not true infinite context — it's an illusion created by ekkOS_'s memory architecture. Claude's 200k token window is still the hard limit per request, but ekkOS_ makes context loss invisible.

### Session Names

Sessions are identified by memorable 3-word slugs (e.g., `groovy-koala-saves`, `velvet-monk-skips`). These are:
- **Deterministic** — Same session UUID always produces same name
- **Human-readable** — Easy to reference and remember
- **Tracked automatically** — Appear in Claude's footer: `· Turn N · groovy-koala-saves ·`

### The `/continue` Command

When context is cleared (manually or automatically), use `/continue` to restore:

```bash
# In Claude Code:
/continue                    # Restore most recent session
/continue groovy-koala-saves # Restore specific session
```

**What gets restored:**
- Recent conversation turns (up to ~60KB / ~15k tokens)
- Active patterns and directives
- File context and goals
- Session metadata

### Auto-Continue with `ekkos run`

The CLI wrapper provides automatic context restoration:

```bash
# Launch Claude with auto-continue enabled
npx @ekkos/cli run

# With specific session
npx @ekkos/cli run --session velvet-monk-skips

# With verbose logging
npx @ekkos/cli run --verbose
```

**What `ekkos run` does:**
1. Launches Claude Code in a PTY (pseudo-terminal)
2. Monitors output for context limit warnings
3. Automatically runs `/clear` when context is high
4. Immediately runs `/continue` to restore session
5. User experiences seamless "endless" conversation

### Session State & Local Cache

Sessions are cached locally in three tiers:

| Tier | Location | Speed | Description |
|------|----------|-------|-------------|
| L0 (Local) | `~/.ekkos/cache/sessions/` | ~1ms | JSONL files with full turn data |
| L1 (Redis) | Cloud | ~150ms | 24h TTL, cross-device sync |
| L2 (Supabase) | Cloud | ~500ms | Permanent episodic storage |

**Local cache structure:**
```
~/.ekkos/cache/sessions/
├── index.json                           # Session index
├── c71a7c88-...-.jsonl                  # Turn data (JSONL)
└── c71a7c88-...-.meta.json              # Session metadata
```

### Session Selection Priority

When restoring a session, ekkOS_ uses this priority:

1. **observedSessionThisRun** — Session seen in current process (most reliable)
2. **lastSeenSessionName** — Session from TUI output (if recent, <15s)
3. **Most Recent from Cache** — From local cache index (fallback)
4. **Persisted State** — From `~/.ekkos/state.json` (last resort)

This prevents the "wrong session" bug where stale state was restored on Windows.

### Context Preservation Hooks

ekkOS_ hooks automatically capture context:

| Hook | When | What It Captures |
|------|------|------------------|
| `user-prompt-submit` | Before each turn | Query, files, turn number |
| `stop` | After each turn | Response, tools used, patterns |
| `session-start` | On new session | Session ID, project path |

**Hook location:** `~/.claude/hooks/`

---

## Recommended: Disable Auto-Compact

For best results with ekkOS_, **disable Claude Code's auto-compact** to get true "endless context":

### Option 1: Via Claude Code
```bash
# In Claude Code, run:
/config
# Then toggle "Auto-compact enabled" to OFF
```

### Option 2: Via Config File
```bash
# Edit ~/.claude.json and add:
{
  "autoCompactEnabled": false
}
```

### Why Disable Auto-Compact?

| With Auto-Compact | With ekkOS_ (No Auto-Compact) |
|-------------------|------------------------------|
| ~155k usable context | Full 200k context |
| Context vanishes at 90% | ekkOS_ preserves everything |
| Re-explain after compact | Seamless recall via memory |
| Tokens wasted on compaction | Tokens saved for your work |

**ekkOS_ remembers** what auto-compact forgets. With auto-compact disabled:
- Use full 200k token window
- ekkOS_ captures every turn to L2 (episodic memory)
- Recall any turn: `ekkOS_Recall({session_id: "...", from_turn: 30, to_turn: 47})`
- Never lose context again

---

## Troubleshooting

**MCP not loading?**
1. Check Node.js version: `node --version` (must be 18+)
2. Verify config file exists at the correct path
3. Test manually: `EKKOS_API_KEY=xxx npx @ekkos/mcp-server`
4. Restart your IDE completely

**Config file locations:**

| IDE | macOS/Linux | Windows |
|-----|-------------|---------|
| Claude Code | `~/.claude/settings.json` | `%USERPROFILE%\.claude\settings.json` |
| Cursor | `~/.cursor/mcp.json` | `%USERPROFILE%\.cursor\mcp.json` |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` | `%USERPROFILE%\.codeium\windsurf\mcp_config.json` |

---

## Links

- **Documentation:** [docs.ekkos.dev](https://docs.ekkos.dev)
- **Issues:** [GitHub Issues](https://github.com/ekkostech/ekkos-connect/issues)
- **Discord:** [discord.gg/vePAuEYp](https://discord.gg/vePAuEYp)

---

## License & Trademarks

**ekkOS_** and the ekkOS_ logo are trademarks of ekkOS Technologies Inc.

This extension is provided under the MIT license. Unauthorized reproduction or distribution of ekkOS_ trademarks or branding assets is prohibited.

For licensing inquiries: [ekkos.dev](https://ekkos.dev)
