# Windows Quick Fix Card

**Fast solutions for common Windows issues with ekkOS extension**

## 🔴 Critical: Bash Resolves to WSL (2026 Bug)

**Error**: `WSL ERROR: execvpe(/bin/bash) failed`

**Quick Fix**:
```powershell
# PowerShell (Admin)
$env:PATH = "C:\Program Files\Git\usr\bin;$env:PATH"
setx PATH "$env:PATH" /M
```

**Permanent Fix**: Edit hooks to use full Git Bash path:
```bash
# Add to top of ~/.claude/hooks/*.sh
#!/usr/bin/env bash
# Or use: "C:\Program Files\Git\usr\bin\bash.exe"
```

[GitHub Issue #16377](https://github.com/anthropics/claude-code/issues/16377)

---

## 🔴 MCP Server Not Detected

**Symptoms**:
- AI tries to use `curl` instead of MCP tools
- No ekkOS_Search, ekkOS_Forge available

**Quick Fixes**:

### 1. Check Config Location
```cmd
type %USERPROFILE%\.claude\settings.json
```
Should exist with MCP config.

### 2. Use Absolute Path
```json
{
  "mcpServers": {
    "ekkos": {
      "command": "C:\\Users\\YourName\\AppData\\Roaming\\npm\\npx.cmd",
      "args": ["-y", "@ekkos/mcp-server"]
    }
  }
}
```

### 3. Test MCP Manually
```cmd
set EKKOS_API_KEY=your-key-here
npx -y @ekkos/mcp-server
```

### 4. Restart VS Code **Completely**
Close all windows, then reopen.

[MCP Detection Issue](https://github.com/openai/codex/issues/6465)

---

## 🔴 Footer Format Broken

**Symptom**: Footer shows `🧠 ekkOS_™ · 📅 2026-01-12 1:11 PM EST` (missing IDE, Model, Turn)

**Quick Fix**:
```cmd
# Reinstall extension to get latest templates
# Or manually update %USERPROFILE%\.claude\CLAUDE.md
```

**Expected Format**:
```
Claude Code (Sonnet 4.5) · 🧠 **ekkOS_™** · Turn 1 · 📅 2026-01-12 1:11 PM EST
```

---

## 🟡 CRLF Line Ending Issues

**Error**: `^M: bad interpreter` or hooks fail silently

**Quick Fix**:
```bash
# Git Bash
dos2unix ~/.claude/hooks/*.sh

# Or with sed
sed -i 's/\r$//' ~/.claude/hooks/*.sh
```

**Prevent Future Issues**:
```bash
# Configure Git
git config --global core.autocrlf true

# Add to repo
echo "*.sh text eol=lf" >> .gitattributes
```

---

## 🟡 Hooks Not Executable

**Error**: Permission denied when running hooks

**Quick Fix**:
```bash
chmod +x ~/.claude/hooks/*.sh
```

---

## 🟡 Node/NPM Not Found

**Error**: `npx: command not found`

**Quick Fix**:
```cmd
# Check Node installed
where node

# If not found, add to PATH (PowerShell Admin)
$nodePath = "C:\Program Files\nodejs"
$env:PATH = "$nodePath;$env:PATH"
setx PATH "$env:PATH" /M
```

Restart terminal after PATH change.

---

## 🟡 VS Code Can't See Git Bash

**Symptoms**: Terminal opens PowerShell instead of Git Bash

**Quick Fix**:
```json
// settings.json
{
  "terminal.integrated.defaultProfile.windows": "Git Bash"
}
```

---

## Validation Commands

Run these to verify your setup:

```bash
# 1. Check Node.js
node --version  # Should be v18+

# 2. Check Git Bash
bash --version  # Should be GNU bash

# 3. Check hooks exist
ls ~/.claude/hooks/

# 4. Check hook syntax
bash -n ~/.claude/hooks/user-prompt-submit.sh

# 5. Test MCP server
set EKKOS_API_KEY=your-key
npx -y @ekkos/mcp-server
```

---

## Path Translation Quick Reference

| What You Need | Windows | Git Bash | WSL |
|---------------|---------|----------|-----|
| Home directory | `%USERPROFILE%` | `$HOME` | `$HOME` |
| .claude folder | `C:\Users\Name\.claude` | `/c/Users/Name/.claude` | `/mnt/c/Users/Name/.claude` |
| AppData | `%APPDATA%` | `/c/Users/Name/AppData/Roaming` | `/mnt/c/Users/Name/AppData/Roaming` |

---

## Getting Help

| Issue Type | Where to Ask |
|------------|--------------|
| Extension bugs | [GitHub Issues](https://github.com/ekkostech/ekkos-connect/issues) |
| Windows setup | [Complete Setup Guide](./WINDOWS_SETUP_GUIDE.md) |
| MCP problems | [VS Code MCP Docs](https://code.visualstudio.com/api/extension-guides/ai/mcp) |
| Quick questions | [Discord](https://discord.gg/vePAuEYp) |

---

## Emergency Reset

If nothing works, nuclear option:

```cmd
# 1. Uninstall extension
# In VS Code: Extensions -> ekkos-connect -> Uninstall

# 2. Delete config
del %USERPROFILE%\.claude\settings.json
rd /s /q %USERPROFILE%\.claude\hooks

# 3. Clear npm cache
npm cache clean --force

# 4. Reinstall extension
# In VS Code: Extensions -> Search "ekkos-connect" -> Install

# 5. Reconnect account
# Click ekkOS icon -> Connect Account
```

---

**Built for ekkOS™** - Windows issues, solved fast

**Last Updated**: 2026-01-12 (reflects January 2026 compatibility issues)
