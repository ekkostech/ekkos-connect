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

**Version**: 1.9.0 | [Changelog](https://github.com/ekkostech/ekkos-connect/blob/main/CHANGELOG.md)

## Features

- **One-click OAuth** - Connect to your ekkOS\_ account with a single click
- **Auto MCP Deploy** - Automatically deploys MCP configuration to all supported IDEs:
  - Cursor (`~/.cursor/mcp.json`)
  - Claude Code CLI (`~/.claude/settings.json`)
  - Claude Desktop App
  - Windsurf (`~/.codeium/windsurf/mcp_config.json`)
  - VS Code (Continue extension)
  - OpenAI Codex CLI
- **Cross-Platform** - Supports macOS, Linux, and Windows paths
- **Restart Prompts** - Clear instructions on how to restart each IDE after deployment
- **Health Check** - Test MCP gateway connectivity with one click
- **AI Instructions** - Deploy `.claude.md` and `.cursorrules` to your project
- **Status Bar** - Always know your connection status
- **Sidebar** - Quick access to all ekkOS\_ features

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

- VS Code 1.80.0 or higher (or Cursor/Windsurf)
- Node.js 18+ (for MCP server)

## MCP Package

This extension deploys configs that use `@ekkos/mcp-server` - the official ekkOS MCP bridge package:

```bash
npx -y @ekkos/mcp-server
```

The package creates a stdio-to-HTTP bridge that connects your AI tools to the ekkOS cloud memory system.

## Troubleshooting

**MCP not loading?**
1. Check Node.js version: `node --version` (must be 18+)
2. Verify config file exists at the correct path
3. Test manually: `EKKOS_API_KEY=xxx npx @ekkos/mcp-server`
4. Restart your IDE completely (not just reload window)

**Config file locations:**
| IDE | macOS/Linux | Windows |
|-----|-------------|---------|
| Claude Code | `~/.claude/settings.json` | `%USERPROFILE%\.claude\settings.json` |
| Cursor | `~/.cursor/mcp.json` | `%USERPROFILE%\.cursor\mcp.json` |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` | `%USERPROFILE%\.codeium\windsurf\mcp_config.json` |

## Support

- Documentation: https://docs.ekkos.dev
- Issues: https://github.com/ekkostech/ekkos-connect/issues
- Discord: https://discord.gg/vePAuEYp
