# ekkOS Connect

This repository contains the **official VS Code/Cursor extension** for ekkOS — the persistent memory layer for AI coding assistants.

> **Note:** Forks or mirrors of this repository may be outdated. For the most current version, install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=ekkos.ekkos-connect).

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

One-click setup for ekkOS memory across all AI IDEs:

- **One-click OAuth** — Connect to your ekkOS account instantly
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

---

## What This Extension Does NOT Document

This extension intentionally does not describe:
- Internal system architecture
- How memory is processed server-side
- Infrastructure or backend topology

---

## Getting Started

1. Click the ekkOS icon in the activity bar
2. Click "Connect Account"
3. Sign in with your ekkOS account
4. MCP config is automatically deployed to all detected IDEs

---

## Commands

| Command | Description |
|---------|-------------|
| `ekkOS: Connect Account` | Start OAuth flow |
| `ekkOS: Disconnect Account` | Remove local credentials |
| `ekkOS: Deploy MCP Config` | Deploy MCP config to all IDEs |
| `ekkOS: Deploy AI Instructions` | Add `.claude.md` and `.cursorrules` to project |
| `ekkOS: Open Dashboard` | Open platform.ekkos.dev |

---

## Configuration

| Setting               | Default                      | Description                |
| --------------------- | ---------------------------- | -------------------------- |
| `ekkos.apiUrl`        | `https://mcp.ekkos.dev`      | ekkOS API URL              |
| `ekkos.platformUrl`   | `https://platform.ekkos.dev` | Platform URL               |
| `ekkos.autoDeployMcp` | `true`                       | Auto-deploy MCP after auth |
| `ekkos.showStatusBar` | `true`                       | Show status bar item       |

---

## Requirements

- VS Code 1.80.0+ (or Cursor/Windsurf)
- Node.js 18+ (for MCP server)

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

**ekkOS** and the ekkOS logo are trademarks of ekkOS Technologies Inc.

This extension is provided under the MIT license. Unauthorized reproduction or distribution of ekkOS trademarks or branding assets is prohibited.

For licensing inquiries: [ekkoslabs.com](https://ekkoslabs.com)
