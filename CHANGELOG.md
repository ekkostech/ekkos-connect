# Changelog

All notable changes to the ekkOS Connect extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.8.5] - 2025-12-09

### Fixed
- **Windsurf MCP Config**: Fixed incorrect path - now uses `~/.codeium/windsurf/mcp_config.json` instead of `~/.windsurf/mcp.json`

## [1.8.4] - 2025-12-09

### Changed
- **New Logo**: Updated extension icon to new ekkOS_ branded logo

## [1.8.3] - 2025-12-09

### Changed
- **Branding**: Updated to "ekkOS_Connect" (with underscore) throughout extension and README
- **Public Repo**: Issues now link to https://github.com/ekkostech/ekkos-connect

## [1.8.2] - 2025-12-09

### Fixed
- **Hook Paths**: Fixed project and global hooks to use absolute paths instead of relative paths (prevents "No such file or directory" errors)

## [1.8.1] - 2025-12-09

### Fixed
- **README Version**: Updated README to reflect current version and features

## [1.8.0] - 2025-12-09

### Added
- **Open VSX Publishing**: Extension now available on Open VSX Registry for Cursor users
- **Public GitHub Repo**: Source code now available at https://github.com/ekkostech/ekkos-connect

## [1.7.5] - 2025-01-27

### Fixed
- Complete auth flow: Login now properly redirects to extension auth endpoint which creates API key and connects extension
- Added Google OAuth support on login page
- Auth callback now handles returnTo parameter for extension flows

## [1.7.4] - 2025-12-09

### Changed
- Fixed Connect Account - now opens platform login directly with Google OAuth support

## [1.7.3] - 2025-12-09

### Changed
- Added onUri activation event and uriHandler contribution for proper callback handling

## [1.7.2] - 2025-12-09

### Changed
- Fixed Claude Code MCP config - now uses command-based server instead of HTTP/SSE

## [1.7.1] - 2025-01-27

### Fixed
- Fixed incorrect API URL in activity fetching - now correctly uses MCP gateway (mcp.ekkos.dev) for all API calls, ensuring signed-in user data is retrieved properly

## [1.7.0] - 2025-12-09

### Added

- **Universal AI Gateway Branding**: Updated branding to "Universal AI Memory Gateway" throughout the extension
- **System Diagnostics Dashboard**: New comprehensive diagnostics section with:
  - Setup Score (0-100%) indicating configuration completeness
  - Circular progress visualization
  - Real-time latency monitoring for API connection
  - Global hooks status (CLAUDE.md, ~/.claude/ hooks)
  - Project hooks status (CLAUDE.md, .claude/ hooks, .cursorrules)
- **API Key Display**: Users can now see and copy their API key directly from the sidebar
- **Active Connection Monitoring**: Real-time connection status for all configured IDEs
  - Live connection verification via API ping
  - Visual status badges (Connected, Error, Not Configured, Not Installed)
  - Automatic refresh every 60 seconds
- **Run Diagnostics Button**: One-click full system diagnostic check

### Changed

- Display name updated to "ekkOS_™ - Universal AI Memory Gateway"
- Removed VS Code Continue from agent list (pending proper integration)
- IDE status now shows actual connection state instead of static "Ready"
- Enhanced polling to check both activity and connection status

### Fixed

- AbortSignal.timeout compatibility issue resolved using AbortController pattern

## [1.6.0] - 2025-12-08

### Added

- **API Key Section**: Display truncated API key with copy button
- **Connection Status Badges**: IDE-specific connection verification

## [1.3.2] - 2025-01-07

### Fixed

- **Activity API Endpoint**: Fixed stats API to use correct endpoint at `api.ekkos.dev/api/v1/memory/activity` (was incorrectly pointing to `platform.ekkos.dev`)
- **API Architecture**: Activity endpoint now correctly lives in `apps/memory` (memory substrate project) instead of `apps/web`

### Changed

- Extension now calls `https://api.ekkos.dev` for activity stats (aligned with memory substrate architecture)
- Stats sidebar now displays real-time data from the deployed API endpoint

## [1.3.1] - 2025-01-07

### Added

- **Functional Stats Sidebar**: Golden Loop stats now connect to live API endpoint
  - Retrievals count (🔍)
  - Applications count (✨)
  - Forged patterns count (🔥)
  - Success rate percentage (📈)
  - Usage stats (Memory Queries and Crystallizations with tier-based limits)
- **Activity Feed**: Real-time feed of recent memory operations
- **New Logo**: Purple gradient logo with Inter font (weight 900) and ekkOS_™ branding

### Changed

- Updated extension icon to match new brand guidelines (purple gradient)
- Stats display real data instead of placeholder "0" values

## [1.3.0] - 2025-01-07

### Added

- **Auto-Setup Feature**: Automatic detection and setup of ekkOS rules when opening new workspaces
  - Checks for `.cursor/rules/` directory on workspace open
  - One-click setup via `ekkos.setupRules` command
  - Copies portable rule templates to workspace
- **Configuration Option**: `ekkos.autoSetup` setting (default: `true`) to enable/disable auto-setup
- **Portable Rules**: Bundled rule templates in `templates/rules/`:
  - `00-hooks-contract.mdc` - Hooks integration contract
  - `30-ekkos-core.mdc` - Core ekkOS Golden Loop workflow
  - `31-ekkos-messages.mdc` - Branded stream messages

### Changed

- Extension name updated to `ekkos-connect` (was `ekkos-memory`)
- Display name: "ekkOS_™ - Memory That Learns"

## [1.2.0] - Previous Release

### Added

- Initial release with MCP configuration deployment
- Account connection and authentication
- Dashboard integration
- Status bar indicators

---

## Version History

- **1.8.5** - Fixed Windsurf MCP config path
- **1.8.4** - New ekkOS_ branded logo
- **1.8.3** - "ekkOS_Connect" branding update
- **1.8.2** - Fixed hook paths to use absolute paths
- **1.8.1** - README version sync
- **1.8.0** - Open VSX + public GitHub repo
- **1.7.0** - Universal AI Gateway with diagnostics dashboard
- **1.6.0** - API key display and connection status badges
- **1.3.2** - Fixed activity API endpoint architecture
- **1.3.1** - Functional stats sidebar with live API integration
- **1.3.0** - Auto-setup feature for portable rules
- **1.2.0** - Initial public release

