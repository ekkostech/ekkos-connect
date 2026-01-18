# Changelog - ekkOS Connect

## [2.12.20] - 2026-01-18

### Open VSX Publication

**Marketplace Expansion:**
- Published to Open VSX Registry for broader distribution
- Now available for VS Code, VSCodium, and Open VSX compatible editors
- Version alignment with latest features

## [2.12.18] - 2026-01-18

### Windows Preflight System - One-Button Diagnostics & Setup

**Major New Feature: Windows Setup Wizard with 3-Gate Diagnostics**

**Windows Preflight System:**
- runWindowsPreflight() - 3-gate diagnostic system (Node.js, Git Bash, MCP Config)
- Visual diagnostic results with color-coded status indicators
- Intelligent remediation suggestions for each failed check
- executeRemediation() - One-click terminal command execution from webview

**New VS Code Commands:**
- `ekkOS: Setup Wizard (Recommended)` - One-button setup flow for Windows users
- `ekkOS: Run System Check` - Manual diagnostic system check (all platforms)

**3-Gate Diagnostic Checks:**
1. **Node.js 18+** - Verifies Node.js installation and version compatibility
2. **Git Bash** - Confirms Git Bash is installed and accessible
3. **MCP Config** - Validates Claude Desktop MCP configuration exists

**User Experience:**
- Professional diagnostic panel with status icons (✓/✗/⚠)
- Interactive remediation buttons (Install Node.js, Install Git, Deploy MCP Config)
- Terminal integration for executing fix commands
- Progress notifications during remediation
- Auto-refresh after remediation completes

**Benefits:**
- Windows users can diagnose and fix setup issues in one click
- No more hunting for installation instructions
- Visual confirmation of system requirements
- Automated remediation reduces support burden
- Professional onboarding experience matching modern IDEs

**Files Modified:**
- `src/extension.ts` - Added runWindowsPreflight(), executeRemediation(), diagnostic webview
- `package.json` - Added ekkos.windowsSetupWizard and ekkos.runPreflight commands

## [2.12.12] - 2026-01-17

### Marketplace Version Sync

**Version bump for marketplace consistency:**
- MCP package already using @ekkos/mcp-server@latest
- No functional changes - version sync only
- Ensures marketplace reflects latest package dependencies

## [2.12.11] - 2026-01-17

### Critical Hook Updates for /continue Support

**Updated Hook Templates for Marketplace Distribution:**
- Updated stop.sh (56KB with local cache, secret scrubbing, fallback capture)
- Updated user-prompt-submit.sh (34KB with local cache integration)
- Updated continue skill with tiered restore

**What Changed:**
- stop.sh now includes local cache for session persistence during hook failures
- Automatic secret scrubbing before sending transcripts to API
- Fallback capture logic ensures sessions are never lost
- user-prompt-submit.sh integrated with local cache for offline resilience
- continue skill enhanced with tiered restore (local cache → API → fallback)

**Why This Matters:**
- Users installing from marketplace get fully functional /continue command
- Local cache prevents data loss during network failures
- Secret scrubbing protects sensitive information in transcripts
- Improved reliability for session restoration

**Files Modified:**
- templates/hooks/stop.sh - Local cache, secret scrubbing, fallback capture
- templates/hooks/user-prompt-submit.sh - Cache integration
- templates/skills/continue/Skill.md - Tiered restore logic

## [2.12.10] - 2026-01-16

### Bug Fixes

**Fixed Time Machine Token Count Display:**
- stop.sh now extracts accurate token counts from Anthropic API usage data in transcript
- Properly sums input_tokens + cache_creation_input_tokens + cache_read_input_tokens
- Token data sent to unified-capture endpoint for Time Machine storage
- Fixes bug where token counts showed impossibly high values (e.g., 702.8% / 1.4M tokens)

**What Was Wrong:**
- Previous implementation used flawed regex extraction from transcript text
- Counted every mention of tokens in the conversation, not just API usage data
- Resulted in wildly inaccurate numbers in Time Machine session cards

**What's Fixed:**
- Reads actual Anthropic API usage object from transcript JSON
- Uses jq to extract exact token counts from usage field
- Calculates total: input_tokens + cache_creation_input_tokens + cache_read_input_tokens
- Sends accurate data to /api/v1/unified-capture endpoint

**Files Modified:**
- templates/hooks/stop.sh - Rewritten token extraction logic using jq

## [2.12.9] - 2026-01-15

### Installation Script Improvements

**CLI Auto-Installation:**
- Added @ekkos/cli auto-installation in install-ekkos.sh
- Users now get the CLI installed automatically via npm during setup
- Enables access to ekkOS orchestration and deployment commands

**ekkOS_SWARM Integration:**
- Added ekkOS_SWARM instructions to installer summary
- Users are guided to try swarm-powered multi-agent workflows
- Installer now shows: "Try: ekkos swarm init" after successful installation

**Template Sharing:**
- Templates now shared via symlink with ekkos-cli
- Eliminates duplication between extension and CLI packages
- Single source of truth for CLAUDE.md, hooks, skills, and rules

**Benefits:**
- Streamlined installation experience
- CLI available immediately after extension setup
- Better integration between VS Code extension and CLI tools
- Reduced maintenance burden with shared templates

**Files Modified:**
- scripts/install-ekkos.sh - Added CLI installation and swarm instructions
- Version alignment with CLI package (2.12.9)

## [2.12.8] - 2026-01-14

### Context Management Improvements

**Hook Template Updates:**
- Updated context thresholds in hook templates for better memory management:
  - Critical threshold: 95% → 98% (more headroom before auto-clear)
  - Warning threshold: 85% → 90% (earlier yellow warning)
  - Caution threshold: 70% → 80% (earlier attention signal)
  - Normal threshold: 50% → 60% (refined green zone)

**Session Context Panel Fixes:**
- Fixed terminology: "Live" tab (was "Hot") for active sessions
- Fixed terminology: "History" tab for cold storage sessions
- Resolved CSP (Content Security Policy) violations in webview rendering
- Improved visual consistency across tab navigation

**Benefits:**
- More conservative context management reduces unexpected compactions
- Better visual feedback at earlier thresholds
- Clearer terminology for session state (Live vs Historical)
- More secure webview rendering without CSP warnings

**Files Modified:**
- `templates/hooks/user-prompt-submit.sh` - Updated thresholds (98%, 90%, 80%, 60%)
- `src/session-context-panel.ts` - Fixed tab labels, CSP compliance

## [2.12.7] - 2026-01-14

### 🕰️ Cold Storage History - Time Machine for Past Sessions

**Major New Feature: Browse and Restore Historical Sessions**

**History Tab in Session Context Panel:**
- New tab navigation (Hot | History) for switching between active and historical sessions
- Cold storage access via `/api/v1/context/time-machine/sessions` endpoint
- Browse all past sessions with full metadata (turn count, token usage, timestamps)
- Visual session cards showing session names, activity, and context stats
- One-click copy of `/continue {sessionName}` command from history cards

**Infinite Scroll Pagination:**
- Load More button for fetching additional historical sessions
- 10 sessions per page with smooth loading states
- Maintains session state across tab switches
- Efficient data fetching with offset-based pagination

**Enhanced User Experience:**
- Tab-based navigation with visual active state indicators
- Clickable history cards with hover effects
- Instant command copying for quick session restoration
- Professional visual design matching hot session cards
- Seamless integration with existing Session Context panel

**Benefits:**
- Never lose track of past work - all sessions preserved
- Quick restoration of any historical session via `/continue`
- Visual overview of session activity and context usage over time
- Professional time machine interface for power users
- Complements hot session tracking with complete historical access

**Files Modified:**
- `src/session-context-panel.ts` - Added History tab, time-machine API integration, tab navigation, Load More pagination

## [2.12.6] - 2026-01-13

### 🎯 UX Improvements - Clickable Context Warning

**User Experience:**
- Changed "COMPACT SOON" warning to "CLEAR SOON" (matches Claude's `/clear` command)
- Made warning clickable - copies `/clear` command to clipboard
- Added hover/active CSS effects for better interactivity
- Visual feedback when user clicks the warning (cursor pointer, transition effects)

**Benefits:**
- User can instantly execute `/clear` with one click
- Clearer terminology (CLEAR vs COMPACT)
- Better visual affordance for clickable elements
- Professional interaction design

**Files Modified:**
- `src/session-context-panel.ts` - Updated warning text, added click handler, CSS effects

## [2.12.3] - 2026-01-13

### 🎨 UI Refinements - Semantic Colours & macOS Fixes

**Visual Improvements:**
- Progress bar colour changed from blue to semantic green (transitions to yellow/orange/red as usage increases)
- Session context panel now has dark navy gradient background with ekkOS watermark for professional appearance
- Better visual hierarchy with adaptive colours indicating context health

**Platform Fixes:**
- Fixed token tracking on macOS (replaced `tac` command which doesn't exist on macOS with `grep | tail` pattern)
- Session Context panel now works reliably on all platforms

**Files Modified:**
- `src/session-context-panel.ts` - Updated progress bar colours, added gradient background with watermark, fixed macOS token parsing
- `src/components/progress-bar.ts` - Changed base colour from blue to green with semantic thresholds

## [2.12.2] - 2026-01-13

### 🎨 UI Polish - Brand Logos & Cleaner Session Cards

**Visual Improvements:**
- Replaced emojis with brand logos in Config Files section:
  - Claude Code logo (copper #D97757)
  - Cursor logo (teal #00B8D4)
  - Windsurf logo (teal #14B8A6)
  - Claude Desktop logo (copper #D97757)
- Removed blue highlight from focused session cards (user preference - cleaner look)
- Removed folder emoji from Config Files header for professional appearance

**Files Modified:**
- `src/extension.ts` - Updated Config Files section with logo references
- `src/session-context-panel.ts` - Removed focused session highlight styling

## [2.12.1] - 2026-01-13

### 🎨 IDE Logo Polish - Fixed Brand Colours and Session Name Display

**Visual Fixes:**
- Fixed IDE logos in "Other Editors" section - now showing correct brand colours:
  - Cursor: Teal (#00B8D4)
  - Windsurf: Teal (#14B8A6)
  - VS Code: Blue (#007ACC)
  - Claude Desktop: Copper (#D97757)
  - Codex: OpenAI Purple (#412991)
- Added missing logos: `claude-desktop.svg`, `codex.svg`
- Updated logoMap to include Claude Desktop and Codex entries

**Session Display Fix:**
- Fixed session names not displaying in Session Context panel
- Now shows session name (e.g., "dandy-glacier") when available
- Falls back to sessionId when sessionName is null
- Maintains consistency with working memory API expectations

**Files Modified:**
- `resources/logos/ides/cursor.svg` - Updated to teal (#00B8D4)
- `resources/logos/ides/windsurf.svg` - Updated to teal (#14B8A6)
- `resources/logos/ides/vscode.svg` - Updated to blue (#007ACC)
- `resources/logos/ides/claude-desktop.svg` - Added copper (#D97757)
- `resources/logos/ides/codex.svg` - Added purple (#412991)
- `src/extension.ts` - Updated logoMap with new entries
- `src/session-context-panel.ts` - Fixed session name fallback logic

## [2.12.0] - 2026-01-13

### 🎯 Session Context Tracker - Real-Time Token Usage Monitoring

**Major New Feature: Visual Session Context Management**

**Session Context Tracker Panel:**
- Real-time token usage monitoring for active AI chat sessions
- Multi-session support with visual session cards
- Colour-coded progress bars with smooth CSS animations
- Active/idle session states with distinct visual styling
- Adaptive polling intervals (3s active, 5s moderate, 15s idle)
- Visual flash effects when context usage increases

**Token Usage Intelligence:**
- Current tokens and max context window displayed per session
- Percentage-based progress visualization
- Threshold warnings at 80% (yellow) and 95% (red)
- Compaction prediction showing estimated turns remaining
- Session-specific stats (total turns, patterns used, directives followed)

**User Experience:**
- Session focusing (click session card to bring to foreground)
- Smart sorting (active sessions first, then by recent activity)
- Auto-refresh with configurable intervals based on usage level
- Manual refresh button for instant updates
- Full accessibility support with keyboard navigation

**Visual Design:**
- Professional colour scheme (green/yellow/red for usage levels)
- Smooth CSS transitions and animations
- Flash effect overlay when context increases
- Drop shadows and hover states for interactivity
- Responsive layout adapting to sidebar width

**New VS Code Commands:**
- `ekkOS: Show Session Context` - Opens Session Context panel
- `ekkOS: Refresh Session Context` - Force refresh all sessions
- `ekkOS: Focus Active Session` - Brings active session to foreground

**Integration:**
- Works with existing Golden Loop tracking
- Complements MCP activity feed
- Session data from working memory API
- Real-time updates via adaptive polling (no websockets needed)

**Benefits:**
- Know when compaction will trigger before it happens
- Visual awareness of context budget consumption
- Multi-session workflow support for power users
- Proactive context management instead of reactive cleanup
- Professional user experience matching modern IDE standards

**Files Added:**
- `src/session-context-panel.ts` - Main panel implementation
- `src/components/session-card.ts` - Session card component
- `src/components/progress-bar.ts` - Animated progress bar
- `src/components/styles.ts` - Shared CSS styles

## [2.10.24] - 2026-01-13

### 🧠 Multi-Session Working Memory & Enhanced Context Restoration

**Multi-Session Working Memory:**
- Session-specific working memory storage in Supabase
- Capture active goals, file changes, and patterns per session
- Pre-compaction state preservation for seamless continuation

**Enhanced /continue Skill:**
- Session picker shows recent sessions with turn counts and topics
- Footer format injection via `<footer-format>` in system-reminder
- Better narrative restoration with file tracking and decisions

**iOS Companion App Foundation:**
- Initial directives UI components
- Mobile-friendly memory access patterns

**Template Updates:**
- Updated CLAUDE.md with footer format requirements
- Enhanced hook templates for context capture

## [2.10.23] - 2026-01-12

### 🎨 Professional Logo Integration - Replace Generic Icons

**Brand Logos Everywhere:**
- Replaced all emoji/colored dots with actual brand SVG logos
- 24 high-quality logos from Simple Icons (CC0 Public Domain)
- Professional appearance across entire extension UI

**Logo Collections Added:**
- **IDEs** (5): VS Code, Cursor, Windsurf, Claude Code, generic fallback
- **Operating Systems** (3): macOS/Apple, Windows, Linux
- **Services** (5): Vercel, Supabase, Anthropic, npm, Homebrew
- **LLMs** (11): OpenAI, Google/Gemini, Meta, Mistral AI, Cohere, DeepMind, Hugging Face, xAI/Grok, Perplexity

**Where Logos Appear:**
- Welcome screen: Shows correct IDE logo (64x64) instead of emoji
- Other IDEs list: Each IDE has its brand logo (20x20)
- Platform detection: OS-specific logos in guides
- Future: Ready for LLM provider selection UI

**Visual Improvements:**
- Drop shadows on logos for depth
- Proper sizing and scaling
- Maintains aspect ratio
- Clean, professional look

**Attribution:**
- All logos properly attributed in `resources/logos/ATTRIBUTION.md`
- Source: Simple Icons (https://simpleicons.org)
- License: CC0 1.0 Universal (Public Domain)

**Package Size:**
- Added 68 KB for all logos
- Total VSIX: 688.87 KB (135 files)
- Optimized SVGs (average 1.1 KB each)

## [2.10.22] - 2026-01-12

### 🌐 Complete Platform Coverage - macOS & Linux Auto-Detect

**Platform-Specific Setup Guides for All:**
- Windows (v2.10.20-21): Already auto-detects ✅
- macOS (NEW): Auto-detects and shows platform-specific guide ✅
- Linux (NEW): Auto-detects and shows platform-specific guide ✅

**New Commands:**
- `ekkOS: macOS Setup Guide` - Comprehensive macOS setup (Homebrew, zsh, M1/M2, Node.js)
- `ekkOS: Linux Setup Guide` - Distribution-specific Linux setup (Ubuntu, Fedora, Arch)
- Both commands are platform-conditional (only show on respective OS)

**Auto-Welcome Logic (All Platforms):**
- **Windows**: "Windows requires special setup..." → [Setup Guide] [Quick Fix] [Get Started]
- **macOS**: "Check our setup guide for Homebrew, zsh, Node.js..." → [Setup Guide] [Get Started]
- **Linux**: "Check our setup guide for distribution-specific tips..." → [Setup Guide] [Get Started]

**macOS Issues Covered:**
- `claude` command not found (Homebrew symlink issues)
- zsh vs bash shell configuration (`.zshrc` vs `.bash_profile`)
- Permission issues with npm (never use sudo!)
- Node.js version requirements (18+)
- M1/M2 (ARM) vs Intel path differences (`/opt/homebrew` vs `/usr/local`)
- Gatekeeper security blocking
- Xcode Command Line Tools dependency

**Linux Issues Covered:**
- npm global install permissions (EACCES errors)
- Node.js installation (Ubuntu/Debian, Fedora/RHEL, Arch)
- Hook executable permissions (`chmod +x`)
- SELinux blocking (Fedora/RHEL)
- AppArmor blocking (Ubuntu)
- Snap-installed VS Code sandboxing
- Distribution-specific package managers

**Documentation Added:**
- docs/MACOS_SETUP_GUIDE.md (22 KB) - Complete macOS setup
- docs/LINUX_SETUP_GUIDE.md (17.4 KB) - Distribution-specific setup
- Both include validation checklists, debugging commands, troubleshooting

**Complete Coverage:**
- 3 platforms (Windows, macOS, Linux) ✅
- 3 auto-detect welcome flows ✅
- 3 comprehensive guides ✅
- 108 files packaged (665.08 KB)

## [2.10.21] - 2026-01-12

### 🎯 Integrated Windows Support - Docs Accessible from Extension

**New VS Code Commands:**
- `ekkOS: Windows Setup Guide` - Opens comprehensive Windows setup documentation
- `ekkOS: Windows Quick Fix` - Opens fast troubleshooting guide
- `ekkOS: Validate Templates` - Runs template validation with results in output panel

**Auto-Show on Windows First Run:**
- Windows users see setup guide on first install
- Helpful notification after MCP deployment
- "Setup Guide" and "Quick Fix" buttons in welcome dialog

**User Experience Improvements:**
- Documentation packaged in extension (no external links needed)
- Validation results shown in VS Code output panel
- Progress notifications during validation
- Auto-detects Git Bash availability
- Helpful error messages with "Download Git" button

**What's Packaged:**
- docs/WINDOWS_SETUP_GUIDE.md (complete Windows setup with all issues covered)
- docs/WINDOWS_QUICK_FIX.md (fast troubleshooting card)
- docs/EXTENSION_MANAGER_AGENT.md (agent specification)
- docs/EXTENSION_MANAGER_QUICKSTART.md (usage guide)
- scripts/validate-templates.sh (7 automated checks)
- scripts/pre-publish-check.sh (10 pre-publish checks)

**Benefits:**
- Windows users get immediate help
- No more hunting for documentation
- Validation built into IDE
- Platform-specific guidance

## [2.10.20] - 2026-01-12

### 🪟 Windows Compatibility Overhaul

**Comprehensive Windows Support and Documentation**

This release focuses on making ekkOS Connect work seamlessly on Windows by addressing critical platform-specific issues and providing clear setup guidance.

**New Documentation:**
- **WINDOWS_SETUP_GUIDE.md** - Complete Windows setup guide covering:
  - WSL vs Git Bash decision framework
  - MCP detection issues in Claude Code on Windows
  - Path handling (forward vs backslashes)
  - CRLF line ending management
  - Node.js hook setup for users without bash
  - Common pitfalls and solutions

- **WINDOWS_QUICK_FIX.md** - Fast troubleshooting checklist:
  - Quick diagnosis steps
  - Copy-paste solutions for common issues
  - Decision tree for shell environment selection
  - Emergency fixes for broken installations

- **EXTENSION_MANAGER_AGENT.md** - Complete agent documentation for extension releases
- **EXTENSION_MANAGER_QUICKSTART.md** - Quick reference for common extension management tasks

**Enhanced Template Validation:**
- `scripts/validate-templates.sh` now includes:
  - CRLF line ending checks for all shell scripts
  - Windows-specific path validation
  - Template consistency verification
  - Pre-publish safety checks
  - Comprehensive error reporting

**Template Fixes:**
- Fixed footer format in `templates/CLAUDE.md` to match documentation
- Corrected response format examples across all templates
- Added Windows compatibility notes to hook templates

**Critical Windows Issues Documented:**
- WSL bash detection bug in Claude Code (GitHub issue #16377)
- MCP server not detected in Windows (GitHub issue #6465)
- Git Bash vs WSL decision criteria
- CRLF handling in shell scripts
- Path normalization for cross-platform compatibility

**Package Configuration:**
- Publisher corrected: `ekkos` (was `ekkostech`)
- Version bumped to 2.10.20
- All templates validated and passing

**References:**
- Claude Code GitHub issues: #16377 (WSL detection), #6465 (MCP detection)
- Windows setup best practices documented
- Extension manager workflow established

## [2.10.19] - 2026-01-12

### 🚀 Manual /continue Only - 79% Token Savings!

All auto-restore code removed from hooks. Users now use powerful manual `/continue` skill.

**Critical Fix: Session Name Resolution**
- Fixed API bug where session names (e.g., "groovy-cactus") weren't resolved to UUIDs
- Added automatic name→UUID mapping in `ekkOS_Recall` handler
- No more silent fallbacks to wrong sessions!

**Removed Hook Interception**
- Removed `/continue` interception from `user-prompt-submit.sh` hook
- Delegated to proper Skill system for intelligent restoration
- Hook now shows session name in auto-clear message: `/continue groovy-cactus`

**Supercharged /continue Skill**
- Added Bash power: reads local state, git status, uncommitted changes
- Multi-source data fusion: local + API + patterns + directives
- Rich narrative briefing with 50+ data points:
  - Turn count & context % before /clear
  - Git branch & uncommitted files
  - File change tracking with counts
  - Pattern application history
  - Key decisions extracted
  - Active directives awareness
  - Context-aware next steps
- 10x more intelligent than old hook approach!

**Removed Auto-Restore (💰 79% Token Savings!)**
- Removed auto-restore from `user-prompt-submit.sh` hook (compaction + post-clear detection)
- Removed auto-restore from `session-start.sh` hook (>5 turns + SOURCE=clear triggers)
- Kept Time Machine feature in session-start.sh (explicit user request)
- **Why removed**: Auto-restore burned 5,000 tokens per turn (250K over 50 turns)
- **Manual /continue**: 2,000 tokens once + clean slate (52K total)
- **Result: 79% token reduction** = 198K tokens saved per 50-turn session!
- **Bonus benefits**:
  - User control (can choose session, can skip if starting fresh)
  - 10x more powerful (Bash + git + patterns + directives)
  - Multi-session support (restore any past session)
  - Explicit > implicit (user knows what's happening)

**Files Updated:**
- `templates/hooks/user-prompt-submit.sh` - Removed /continue interception, added session name to clear message
- `templates/skills/continue/Skill.md` - Enhanced with Bash scripts, multi-source data, rich narrative
- API: `apps/memory/api/v1/handlers/context.ts` - Session name→UUID resolution (deployed)

**Perfect Workflow Now:**
```bash
# Work normally (session shows as "groovy-cactus")
Turn 1, 2, 3...

# Context hits 95%
Claude types: /clear
Claude tells user: "Type '/continue groovy-cactus'"

# User restores with intelligent briefing
/continue groovy-cactus
→ Rich narrative with local + remote context
→ Ready to continue seamlessly
```

## [2.10.15] - 2026-01-12

### Changed
- Fix stop.sh response capture and skill triggers

## [2.10.4] - 2026-01-11

### Changed
- Endless Context: Auto-clear with visual restoration

## [2.6.2] - 2026-01-02

### Changed
- Updated pricing plan names: Echo→Developer, Resonance→Professional, Harmony→Team

## [2.6.1] - 2025-12-30

### Changed
- Fix GitHub OAuth callback URI handling for all IDEs

## [2.4.0] - 2025-12-20

### Changed
- Enhanced activity feed with clickable items and modal popup showing pattern details

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

[Unreleased]: https://github.com/ekkostech/ekkos-connect/compare/v2.10.15...HEAD

[2.4.0]: https://github.com/ekkostech/ekkos-connect/compare/v2.3.16...v2.4.0

[2.6.1]: https://github.com/ekkostech/ekkos-connect/compare/v2.4.0...v2.6.1

[2.6.2]: https://github.com/ekkostech/ekkos-connect/compare/v2.6.1...v2.6.2

[2.10.4]: https://github.com/ekkostech/ekkos-connect/compare/v2.10.3...v2.10.4

[2.10.15]: https://github.com/ekkostech/ekkos-connect/compare/v2.10.14...v2.10.15
