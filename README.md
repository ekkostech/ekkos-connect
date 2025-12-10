# ekkOS_Connect

One-click setup for ekkOS_ memory system across all AI IDEs.

**Version**: 1.8.5 | [Changelog](./CHANGELOG.md)

## Features

- **One-click OAuth** - Connect to your ekkOS_ account with a single click
- **Auto MCP Deploy** - Automatically deploys MCP configuration to all supported IDEs:
  - Cursor
  - Claude Code (cross-platform: macOS, Linux, Windows)
  - VS Code (Continue extension)
  - Windsurf
- **AI Instructions** - Deploy `.claude.md` and `.cursorrules` to your project
- **Status Bar** - Always know your connection status
- **Sidebar** - Quick access to all ekkOS_ features
- **Offline Indicator** - Shows sync status and last sync time
- **Retry Logic** - Automatic retries with exponential backoff

## Getting Started

1. Click the ekkOS_ icon in the activity bar
2. Click "Connect Account"
3. Sign in with your ekkOS_ account
4. MCP config is automatically deployed to all detected IDEs

## Commands

- `ekkOS: Connect Account` - Start OAuth flow
- `ekkOS: Disconnect Account` - Remove local credentials
- `ekkOS: Deploy MCP Config` - Deploy MCP config to all IDEs
- `ekkOS: Deploy AI Instructions` - Add `.claude.md` and `.cursorrules` to project
- `ekkOS: Open Dashboard` - Open platform.ekkos.dev

## Configuration

| Setting               | Default                      | Description                |
| --------------------- | ---------------------------- | -------------------------- |
| `ekkos.apiUrl`        | `https://mcp.ekkos.dev`      | ekkOS_ API URL             |
| `ekkos.platformUrl`   | `https://platform.ekkos.dev` | Platform URL               |
| `ekkos.autoDeployMcp` | `true`                       | Auto-deploy MCP after auth |
| `ekkos.showStatusBar` | `true`                       | Show status bar item       |

## Requirements

- VS Code 1.80.0 or higher
- Node.js 18+ (for MCP server)

## Support

- Documentation: https://docs.ekkos.dev
- Issues: https://github.com/ekkostech/ekkos-connect/issues
