# ekkOS Custom Agents - Deployment Guide

This document explains how the custom agent plugins integrate with ekkos-connect and ekkOS MCP.

## Architecture Overview

```
User
  │
  ├──► Installs ekkos-connect.vsix (VS Code Extension)
  │    │
  │    ├──► Authenticates with OAuth
  │    ├──► Configures ~/.claude/claude_desktop_config.json (MCP)
  │    └──► Runs: "ekkOS: Deploy Custom Agents to Claude Code"
  │         │
  │         └──► Copies templates/claude-plugins/* to ~/.claude/plugins/ekkos/
  │
  └──► Uses Claude Code CLI
       │
       ├──► Hooks inject patterns automatically (from ekkOS MCP)
       │
       └──► User runs slash commands:
            ├──► /memory-analyze  (Memory Archaeologist plugin)
            ├──► /deploy-check    (Deploy Guardian plugin)
            ├──► /schema-check    (Schema Sentinel plugin)
            └──► /forge-pattern   (Pattern Forger plugin)
                 │
                 └──► All call ekkOS MCP tools under the hood
```

## What Gets Deployed

### 1. Plugin Templates (Source)

Location: `extensions/ekkos-connect/templates/claude-plugins/`

```
claude-plugins/
├── README.md (Plugin documentation)
├── memory-archaeologist/
│   ├── .claude-plugin/
│   │   └── plugin.json
│   └── commands/
│       └── memory-analyze.md
├── deploy-guardian/
│   ├── .claude-plugin/
│   │   └── plugin.json
│   └── commands/
│       └── deploy-check.md
├── schema-sentinel/
│   ├── .claude-plugin/
│   │   └── plugin.json
│   └── commands/
│       └── schema-check.md
└── pattern-forger/
    ├── .claude-plugin/
    │   └── plugin.json
    └── commands/
        └── forge-pattern.md
```

These templates are **bundled in the VSIX** when you run `vsce package`.

### 2. Plugin Installation (Target)

Location: `~/.claude/plugins/ekkos/`

When user runs **"ekkOS: Deploy Custom Agents to Claude Code"**, the extension:
1. Creates `~/.claude/plugins/ekkos/` directory
2. Copies all 4 plugins from templates to target
3. Shows success message with available commands

```
~/.claude/plugins/ekkos/
├── memory-archaeologist/
├── deploy-guardian/
├── schema-sentinel/
└── pattern-forger/
```

Claude Code automatically discovers plugins in `~/.claude/plugins/` on startup.

## Extension Changes Made

### 1. package.json

Added new command:

```json
{
  "command": "ekkos.deployPlugins",
  "title": "ekkOS: Deploy Custom Agents to Claude Code"
}
```

### 2. extension.ts

Added three components:

#### a) Command Registration (Line ~340)

```typescript
vscode.commands.registerCommand('ekkos.deployPlugins', () => deployClaudePlugins())
```

#### b) Deployment Function (Line ~1710)

```typescript
async function deployClaudePlugins() {
  const homeDir = os.homedir();
  const claudePluginsDir = path.join(homeDir, '.claude', 'plugins', 'ekkos');

  // Create plugins directory
  fs.mkdirSync(claudePluginsDir, { recursive: true });

  // Copy plugins from templates to ~/.claude/plugins/ekkos/
  const plugins = ['memory-archaeologist', 'deploy-guardian', 'schema-sentinel', 'pattern-forger'];

  for (const plugin of plugins) {
    const sourceDir = path.join(__dirname, '..', 'templates', 'claude-plugins', plugin);
    const destDir = path.join(claudePluginsDir, plugin);
    copyDirectoryRecursive(sourceDir, destDir);
  }

  vscode.window.showInformationMessage('✅ Deployed 4 ekkOS plugins!');
}
```

#### c) Helper Function (Line ~1762)

```typescript
function copyDirectoryRecursive(source: string, destination: string) {
  // Recursively copies entire directory tree
}
```

## How It Works

### Step 1: User Installs Extension

```bash
# From marketplace or local VSIX
code --install-extension ekkos-connect-2.6.3.vsix
```

### Step 2: User Authenticates

- Click "ekkOS: Connect Account" in VS Code
- OAuth flow with platform.ekkos.dev
- Credentials stored in VS Code SecretStorage
- API key written to `~/.ekkos/config.json` (for CLI hooks)

### Step 3: User Deploys Plugins

- Run command: **ekkOS: Deploy Custom Agents to Claude Code**
- Extension copies templates to `~/.claude/plugins/ekkos/`
- User sees success message with available commands

### Step 4: User Uses Plugins in Claude Code

```bash
# Open Claude Code CLI
claude

# Run any plugin command
/memory-analyze
```

Claude Code:
1. Finds plugin in `~/.claude/plugins/ekkos/memory-archaeologist/`
2. Reads `commands/memory-analyze.md`
3. Executes the implementation instructions
4. Calls ekkOS MCP tools (ekkOS_Stats, ekkOS_Search, etc.)
5. Displays formatted output to user

## Plugin Command Flow

```
User types: /memory-analyze

   ↓

Claude Code loads: ~/.claude/plugins/ekkos/memory-archaeologist/commands/memory-analyze.md

   ↓

Command definition tells Claude to:
1. Call ekkOS_Stats({scope: "both"})
2. Call ekkOS_Search({query: "low success rate"})
3. Analyze results
4. Format output

   ↓

Claude executes via ekkOS MCP server (already configured by ekkos-connect)

   ↓

Results displayed to user
```

## Benefits of This Architecture

### 1. **No Duplication**
- ekkos-connect already sets up ekkOS MCP
- Plugins reuse existing MCP connection
- Single source of truth for memory

### 2. **Portable**
- Templates bundled in VSIX
- Works on Windows/Mac/Linux
- No manual file copying

### 3. **User-Friendly**
- One command deploys all plugins
- Slash commands are intuitive
- Clear output formatting

### 4. **Maintainable**
- Plugins are separate from core extension
- Easy to add/remove plugins
- Command definitions are markdown (easy to edit)

### 5. **Extensible**
- Users can create custom plugins
- Teams can share plugin templates
- Plugin marketplace potential

## Testing the Integration

### 1. Build Extension

```bash
cd extensions/ekkos-connect
npm install
npm run compile
vsce package
```

This creates `ekkos-connect-2.6.3.vsix` with plugins bundled.

### 2. Install Extension

```bash
code --install-extension ekkos-connect-2.6.3.vsix
```

### 3. Deploy Plugins

In VS Code:
1. Command Palette (Cmd+Shift+P)
2. Run: "ekkOS: Deploy Custom Agents to Claude Code"
3. Verify success message

### 4. Verify Installation

```bash
ls -la ~/.claude/plugins/ekkos/
```

Should show 4 plugin directories.

### 5. Test in Claude Code

```bash
claude

# Test each command
/memory-analyze
/deploy-check
/schema-check
/forge-pattern
```

## Troubleshooting

### Plugins not deploying

Check template files exist:

```bash
ls -la extensions/ekkos-connect/templates/claude-plugins/
```

If missing, templates weren't bundled in VSIX. Rebuild extension.

### Commands not working

1. Restart Claude Code after deployment
2. Check plugin files copied correctly:
   ```bash
   cat ~/.claude/plugins/ekkos/memory-archaeologist/.claude-plugin/plugin.json
   ```
3. Verify ekkOS MCP is configured:
   ```bash
   cat ~/.claude/claude_desktop_config.json
   ```

### ekkOS tools failing

1. Ensure ekkos-connect is authenticated
2. Check API key in `~/.ekkos/config.json`
3. Test MCP connection in Claude Code

## Adding New Plugins

See `templates/claude-plugins/README.md` for detailed instructions.

Quick steps:
1. Create plugin directory structure
2. Write plugin.json manifest
3. Write command.md definition
4. Add plugin name to deployment list in extension.ts
5. Rebuild VSIX

## Future Enhancements

### Phase 2: Plugin Marketplace
- Host plugins at plugins.ekkos.dev
- Auto-update mechanism
- Community-contributed plugins

### Phase 3: Plugin Generator
- VS Code command: "ekkOS: Create New Plugin"
- Template scaffolding
- One-click publishing

### Phase 4: Team Plugins
- Share plugins within organization
- Role-based plugin access
- Custom plugin repositories

---

## Summary

This integration creates a **seamless triangle**:

1. **ekkos-connect** (VS Code Extension)
   - Authenticates user
   - Configures MCP
   - Deploys plugin templates

2. **Claude Code Plugins** (Slash Commands)
   - User-friendly commands
   - Call ekkOS MCP tools
   - Format output

3. **ekkOS MCP** (Memory System)
   - 42 memory tools
   - 11-layer architecture
   - Persistent learning

Together, they create a powerful **AI memory assistant** that gets smarter over time.

**Built with ❤️ by the ekkOS team**
