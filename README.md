## 🚀 EARLY ACCESS - FREE BETA

**You're early!** This extension and [ekkos.dev](https://ekkos.dev) are in **free beta** - you're helping build the future of AI memory.

We ship updates **daily**. Things will change, improve, and occasionally break. That's beta life! Stick with us - the best is coming.

| What to expect               |                                                   |
| ---------------------------- | ------------------------------------------------- |
| 🆓 **Free during beta**      | No credit card needed                             |
| 🔄 **Frequent updates**      | New features weekly                               |
| 🐛 **Bugs happen**           | Report them, we fix fast                          |
| 💬 **Your feedback matters** | Join us on [Discord](https://discord.gg/vePAuEYp) |

**Found an issue?** → [Report it](https://github.com/ekkostech/ekkos-connect/issues)

---

# ekkOS_Connect

One-click setup for ekkOS\_ memory system across all AI IDEs.

**Version**: 1.8.17 | [Changelog](https://github.com/ekkostech/ekkos-connect/blob/main/CHANGELOG.md)

## Features

- **One-click OAuth** - Connect to your ekkOS\_ account with a single click
- **Auto MCP Deploy** - Automatically deploys MCP configuration to all supported IDEs:
  - Cursor
  - Claude Code (cross-platform: macOS, Linux, Windows)
  - VS Code (Continue extension)
  - Windsurf
- **AI Instructions** - Deploy `.claude.md` and `.cursorrules` to your project
- **Status Bar** - Always know your connection status
- **Sidebar** - Quick access to all ekkOS\_ features
- **Offline Indicator** - Shows sync status and last sync time
- **Retry Logic** - Automatic retries with exponential backoff

## Getting Started

1. Click the ekkOS\_ icon in the activity bar
2. Click "Connect Account"
3. Sign in with your ekkOS\_ account
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
| `ekkos.apiUrl`        | `https://mcp.ekkos.dev`      | ekkOS\_ API URL            |
| `ekkos.platformUrl`   | `https://platform.ekkos.dev` | Platform URL               |
| `ekkos.autoDeployMcp` | `true`                       | Auto-deploy MCP after auth |
| `ekkos.showStatusBar` | `true`                       | Show status bar item       |

## Requirements

- VS Code 1.80.0 or higher
- Node.js 18+ (for MCP server)

## Support

- Documentation: https://docs.ekkos.dev
- Issues: https://github.com/ekkostech/ekkos-connect/issues
