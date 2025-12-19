# Changelog - ekkOS Connect

## [2.3.16] - 2025-12-19

### Golden Loop Enforcement

**Hook Templates Upgraded with Full Compliance Enforcement:**

All hook templates now include production-grade Golden Loop enforcement:

- **Turn Contracts**: JSON evidence files prove retrieval occurred before answering
- **PatternGuard**: 100% pattern acknowledgment required via `[ekkOS_SELECT]`/`[ekkOS_SKIP]`
- **STRICT Mode**: `EKKOS_STRICT=1` environment variable blocks turns if retrieval fails
- **Footer Validation**: Checks for mandatory `🧠 **ekkOS_™** · 📅` footer
- **Auto-Forge Violations**: Compliance failures recorded as anti-patterns
- **3-Judge Evaluation**: Triggers consensus evaluation on turn completion

**Files Updated:**
- `templates/hooks/user-prompt-submit.sh` - Full contract support for Claude Code
- `templates/hooks/stop.sh` - Compliance validation for Claude Code
- `templates/hooks/lib/contract.sh` - NEW: Turn contract library
- `templates/cursor-hooks/before-submit-prompt.sh` - Full enforcement for Cursor
- `templates/cursor-hooks/lib/contract.sh` - NEW: Contract library for Cursor
- `templates/windsurf-hooks/before-submit-prompt.sh` - Full enforcement for Windsurf
- `templates/windsurf-hooks/lib/contract.sh` - NEW: Contract library for Windsurf

### Template Cleanup

**Removed Duplicate Rules:**
- Deleted `templates/cursor-rules/` directory (was duplicating `templates/rules/`)
- Extension now only installs modular `.mdc` files for Cursor:
  - `00-hooks-contract.mdc` - Hook automation contract
  - `30-ekkos-core.mdc` - Golden Loop + 28 MCP tools
  - `31-ekkos-messages.mdc` - Message branding templates

**Benefits:**
- Easier debugging with modular files
- No more content duplication
- Clear separation of concerns
- Better maintainability for support

---

## [2.0.5] - 2025-12-16

### MCP Server Package Fix

**Critical Fix:**
- Changed MCP server package from `@ekkos/mcp-server@2` to `@ekkos/mcp-server@latest`
- This ensures users always get the latest stable version
- Fixes "failed" MCP connection status in Claude Code

**Affected Configs:**
- JSON config for Cursor, Claude Code, Claude Desktop, Windsurf
- TOML config for OpenAI Codex
- Diagnostic panel test command

---

## [2.0.4] - 2025-12-16

### UI Improvements

**Logo Redesign:**
- Centered brain logo above text on connect screen
- Changed logo color to white for better visibility

**AI Agent Status Accuracy:**
- Changed misleading "Connected" status to "Configured"
- More accurate representation - we can verify config exists, not that IDE is actively using it
- New checkmark icon (✓) instead of filled circle (●)

**Error Message Improvements:**
- 404 errors now say "Route not found - try updating the extension" (not API key issue)
- 401/403 errors correctly indicate authentication problems
- Generic errors no longer incorrectly blame API key

---

## [2.0.3] - 2025-12-15

### UI Improvements

**Status Bar:**
- Renamed from "ekkOS" to "ekkOS_"
- Shows scope indicator: `ekkOS_ [●]` (Both), `ekkOS_ [P]` (Personal), `ekkOS_ [C]` (Collective)
- Clicking always opens sidebar (no longer toggles scope directly)

**Scope Switcher in Sidebar:**
- New "Pattern Scope" section with visual radio buttons
- Switch between Both/Personal/Collective without leaving sidebar
- Instant visual feedback on selection

### Native Windows Support

**Node.js Hooks for Windows Users Without Git Bash:**

The extension now automatically detects if bash is available on Windows. If not, it deploys Node.js hooks that work natively without requiring Git Bash or WSL.

**What's New:**
- Auto-detects bash availability on Windows using `where bash`
- Deploys Node.js hooks (`*.js`) when bash isn't found
- Shell hooks (`*.sh`) still deployed for macOS/Linux and Windows with bash
- `.claude/settings.json` automatically configured with correct hook commands

**Node.js Hooks Features:**
- Uses only built-in Node.js modules (https, fs, crypto)
- Zero dependencies - no npm install required
- Full feature parity with shell hooks
- Works on Windows, macOS, and Linux

**11-Layer Architecture (Fixed Ordering):**
| # | Layer | Purpose |
|---|-------|---------|
| 1 | Working | Current session state |
| 2 | Episodic | Past conversations |
| 3 | Semantic | Embeddings/knowledge |
| 4 | Patterns | Proven solutions |
| 5 | Procedural | Step-by-step guides |
| 6 | Collective | Cross-project wisdom |
| 7 | Meta | Pattern effectiveness |
| 8 | Codebase | Project-specific |
| 9 | Directives | User preferences |
| 10 | Conflict Resolution | Auto-resolves contradictions |
| 11 | Secrets | Encrypted credentials |

---

## [2.0.2] - 2025-12-15

### Universal Rules & Hooks

**Now deploys rules for ALL major AI IDEs:**

| IDE | Rules Location | Format |
|-----|---------------|--------|
| Cursor | `.cursor/rules/ekkos-memory.md` | YAML frontmatter + markdown |
| Claude Code | `CLAUDE.md` + `.claude/hooks/` | Markdown + shell hooks |
| Windsurf | `.windsurf/rules/ekkos-memory.md` | YAML frontmatter + markdown |

**Bug Fixes:**
- Fixed Claude Code MCP config path (now uses `~/.claude/claude_desktop_config.json`)
- Updated memory architecture to 11 layers (added Secrets layer)

**Cross-Platform Support:**
- macOS/Linux: Full support with shell hooks
- Windows: Hooks configured to use `bash` (requires Git Bash or WSL)
- chmod only applied on Unix-like systems
- Platform-appropriate warnings shown during setup

**IDE Detection:**
- Extension now detects current IDE (Cursor, Windsurf, Claude Code, VS Code)
- Only deploys rules/hooks relevant to the detected IDE
- Cleaner project setup without unnecessary files

**Templates Updated:**
- All templates now reference 11-layer architecture including Secrets
- Cursor rules use new `.md` format with `alwaysApply: true`
- Windsurf rules use `trigger: always_on` for automatic activation

---

## [2.0.1] - 2025-12-15

### Improvements

**Credentials Display**
- Added credentials section showing API Key and User ID
- Copy button for one-click clipboard copy
- Reveal/hide toggle for security
- Shows active API endpoint (mcp.ekkos.dev)

**Version Badge**
- Version number now displayed in sidebar header
- Shows on both connected and welcome screens

**MCP Configuration**
- Standardized to command-based (stdio) config for all IDEs
- More reliable than SSE transport
- Updated Codex TOML config to use command-based format
- Extension deploys `@ekkos/mcp-server@2` for all IDEs

**Settings**
- Added `ekkos.apiUrl` setting for custom API endpoint
- Added `ekkos.platformUrl` setting for custom platform URL

---

## [2.0.0] - 2025-12-13

### 🚀 Major Feature: Automatic Pattern Injection via Chat Participant

**The portable solution is here!** No more relying on AI compliance or gateway proxies.

#### What's New

**@ekkos Chat Participant** - Truly automatic pattern injection in VS Code/Cursor:

- Type `@ekkos` in Cursor chat to activate memory-enhanced responses
- Patterns automatically retrieved and injected into every request
- Works with Cursor subscription (no gateway proxy needed)
- **Participant auto-detection:** Automatically activates for technical questions

#### How It Works

```
User: "@ekkos How do I handle auth errors?"
       ↓
Extension intercepts request
       ↓
Retrieves patterns from ekkOS API
       ↓
Injects into language model context
       ↓
AI responds with patterns already in context
```

#### Benefits

✅ **Truly Portable** - Works identically in VS Code, Cursor, Codium  
✅ **Fully Automatic** - No manual tool calls required  
✅ **No Gateway Needed** - Uses Cursor subscription, not your API credits  
✅ **Transparent** - User sees which patterns were loaded  
✅ **Model Agnostic** - Works with any model Cursor supports

#### Migration Guide

**Before (MCP Tools - manual):**

```
User: "Fix this bug"
AI: Must manually call search_memory tool
```

**Now (Chat Participant - automatic):**

```
User: "@ekkos Fix this bug"
Extension: Auto-retrieves patterns
AI: Gets patterns in context automatically
```

**For Default Behavior:**
Enable participant detection (already configured) and the extension will auto-activate for:

- Technical questions
- Debugging requests
- Architectural guidance
- Requests to remember/recall information

### Technical Details

- **API Used:** VS Code Chat Participant API (VS Code 1.90+)
- **Participant ID:** `ekkos-connect.memory`
- **Invocation:** `@ekkos` or auto-detection
- **Integration:** `/api/v1/context/retrieve` endpoint
- **Response:** Streams patterns + AI response

### Breaking Changes

None - fully backward compatible. MCP tools still work. Gateway proxy still works.

---

## [1.9.0] - Previous Release

- One-click MCP configuration
- Multi-IDE support (Cursor, Claude Code, Windsurf, VS Code)
- Real-time activity feed
- Connection wizard improvements
