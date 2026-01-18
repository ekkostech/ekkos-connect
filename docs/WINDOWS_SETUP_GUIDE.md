# Windows Setup Guide for ekkOS Extension

**Complete guide for setting up ekkOS on Windows with all compatibility issues resolved.**

## 🚨 Critical Windows Issues (2026)

### Issue 1: Bash Command Resolves to WSL Instead of Git Bash

**Problem**: On Windows 11, the `bash` command may resolve to WSL bash instead of Git Bash, causing:
```
WSL ERROR: execvpe(/bin/bash) failed: No such file or directory
```

**Solution**: Use full Git Bash path in hook configurations:

```json
{
  "hooks": {
    "bash_path": "C:\\Program Files\\Git\\usr\\bin\\bash.exe"
  }
}
```

Or add Git Bash to PATH before WSL:
```powershell
# In PowerShell (Admin)
$env:PATH = "C:\Program Files\Git\usr\bin;$env:PATH"
setx PATH "$env:PATH" /M
```

**Reference**: [GitHub Issue #16377](https://github.com/anthropics/claude-code/issues/16377)

### Issue 2: MCP Server Not Detected in VS Code

**Problem**: MCP servers work in CLI but VS Code extension doesn't detect them.

**Solutions**:

1. **Check config file location**:
   ```
   %USERPROFILE%\.claude\settings.json
   ```

2. **Use absolute paths**:
   ```json
   {
     "mcpServers": {
       "ekkos": {
         "command": "C:\\Users\\YourName\\AppData\\Roaming\\npm\\ekkos-mcp.cmd",
         "args": []
       }
     }
   }
   ```

3. **Restart VS Code completely** (not just reload window)

4. **Check Node.js path**:
   ```cmd
   where node
   # Should show: C:\Program Files\nodejs\node.exe
   ```

**Reference**: [MCP Detection Issues](https://github.com/openai/codex/issues/6465)

### Issue 3: Line Ending Conflicts

**Problem**: Git Bash uses CRLF, WSL uses LF, causing hook failures.

**Solution**: Configure Git to handle line endings:

```bash
# For Git Bash
git config --global core.autocrlf true

# For WSL
git config --global core.autocrlf input
```

**In .gitattributes**:
```
*.sh text eol=lf
*.md text eol=lf
*.json text eol=lf
```

## Prerequisites

### 1. Install Git Bash (Recommended)

Download from [git-scm.com](https://git-scm.com/download/win)

**Installation Options**:
- ✅ Add Git Bash to PATH
- ✅ Use MinTTY terminal
- ✅ Enable symbolic links
- ✅ Use bundled OpenSSH

### 2. Install Node.js 18+

Download from [nodejs.org](https://nodejs.org/)

**Verify installation**:
```cmd
node --version
# Should show v18.x.x or higher
```

### 3. Install VS Code

Download from [code.visualstudio.com](https://code.visualstudio.com/)

## Installation Steps

### Step 1: Install ekkOS Extension

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "ekkos-connect"
4. Click Install

### Step 2: Connect Account

1. Click ekkOS icon in activity bar
2. Click "Connect Account"
3. Sign in with your ekkOS account
4. MCP config will auto-deploy

### Step 3: Verify Configuration

Check that config file exists:
```cmd
type %USERPROFILE%\.claude\settings.json
```

Should contain:
```json
{
  "mcpServers": {
    "ekkos": {
      "command": "npx",
      "args": ["-y", "@ekkos/mcp-server"],
      "env": {
        "EKKOS_API_KEY": "ekk_..."
      }
    }
  }
}
```

### Step 4: Test MCP Connection

```cmd
# Test MCP server manually
set EKKOS_API_KEY=your-key-here
npx -y @ekkos/mcp-server
```

Should show:
```
ekkOS MCP Server v2.x.x
Listening on stdio...
```

### Step 5: Verify Hooks

Check hooks are installed:
```cmd
dir %USERPROFILE%\.claude\hooks
```

Should show:
- `user-prompt-submit.sh`
- `session-start.sh`

Test hook syntax:
```bash
bash -n %USERPROFILE%\.claude\hooks\user-prompt-submit.sh
```

No output = syntax is good ✅

## Common Windows Issues

### Issue: "command not found" in Git Bash

**Problem**: Git Bash PATH doesn't include `/usr/bin`

**Solution**:
```bash
# Add to ~/.bashrc
export PATH="/usr/bin:$PATH"
```

### Issue: CRLF vs LF Line Endings

**Problem**: Scripts fail with "^M: bad interpreter"

**Solution**: Convert to LF:
```bash
# In Git Bash
dos2unix ~/.claude/hooks/*.sh

# Or use sed
sed -i 's/\r$//' ~/.claude/hooks/*.sh
```

### Issue: Permission Denied

**Problem**: Hooks not executable

**Solution**:
```bash
chmod +x ~/.claude/hooks/*.sh
```

### Issue: Node Modules Not Found

**Problem**: `npx` can't find @ekkos/mcp-server

**Solution**:
```cmd
# Clear npm cache
npm cache clean --force

# Reinstall
npm install -g @ekkos/mcp-server
```

### Issue: VS Code Can't Find Node

**Problem**: VS Code doesn't detect Node.js

**Solution**:
```cmd
# Add to System PATH (PowerShell Admin)
$nodePath = "C:\Program Files\nodejs"
$currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
[Environment]::SetEnvironmentVariable("Path", "$nodePath;$currentPath", "Machine")
```

Restart VS Code after PATH change.

## WSL Users (Alternative Setup)

If you prefer WSL over Git Bash:

### 1. Install ekkOS in WSL

```bash
# In WSL terminal
npm install -g @ekkos/mcp-server
```

### 2. Configure VS Code to Use WSL

Install "WSL" extension in VS Code, then:

```json
// settings.json
{
  "remote.WSL.useExperimentalShell": true
}
```

### 3. Open Project in WSL

```bash
# In WSL
code .
```

### 4. Configure MCP in WSL

```bash
# Edit config
nano ~/.claude/settings.json
```

## Path Translation Table

| Windows Path | Git Bash Path | WSL Path |
|--------------|---------------|----------|
| `C:\Users\Name\.claude` | `/c/Users/Name/.claude` | `/mnt/c/Users/Name/.claude` |
| `%USERPROFILE%` | `$HOME` | `$HOME` |
| `%APPDATA%` | `/c/Users/Name/AppData/Roaming` | `/mnt/c/Users/Name/AppData/Roaming` |

## Validation Checklist

After setup, verify:

- [ ] Node.js 18+ installed (`node --version`)
- [ ] Git Bash installed and in PATH
- [ ] VS Code installed
- [ ] ekkOS extension installed
- [ ] Account connected (OAuth complete)
- [ ] MCP config exists at `%USERPROFILE%\.claude\settings.json`
- [ ] MCP server tests successfully (`npx @ekkos/mcp-server`)
- [ ] Hooks exist in `%USERPROFILE%\.claude\hooks\`
- [ ] Hook syntax valid (`bash -n hook-file.sh`)
- [ ] Line endings are LF (not CRLF)
- [ ] Footer format is complete in responses

## Testing Your Setup

Run this test in Claude Code:

```
Please show me:
1. Your current footer format
2. The turn number
3. Whether MCP tools are available
```

**Expected Response**:
```
1. Footer: Claude Code (Sonnet 4.5) · 🧠 **ekkOS_™** · Turn 1 · 📅 2026-01-12 2:00 PM EST
2. Turn: 1 (from hook header)
3. MCP tools: Available (ekkOS_Search, ekkOS_Forge, etc.)
```

If any of these are wrong, refer to troubleshooting above.

## Getting Help

- **Extension Issues**: [GitHub Issues](https://github.com/ekkostech/ekkos-connect/issues)
- **MCP Issues**: [MCP Developer Guide](https://code.visualstudio.com/api/extension-guides/ai/mcp)
- **Windows Setup**: [Complete Claude Code Installation Guide](https://claude.ai/public/artifacts/d5297b60-4c2c-4378-879b-31cc75abdc98)
- **Discord Support**: [discord.gg/vePAuEYp](https://discord.gg/vePAuEYp)

## Sources

- [Windows 11 Compatibility Fixes for Stop Hook](https://github.com/anthropics/claude-code/issues/16377)
- [MCP servers not detected in VS Code](https://github.com/openai/codex/issues/6465)
- [Your Missing Guide to Claude Code on Windows](https://alikhallad.com/your-missing-guide-to-claude-code-on-windows-vs-code/)
- [Use WSL Git in VS Code](https://linuxvox.com/blog/vscode-use-wsl-git-instead-of-git-for-windows/)
- [Make bash hooks work under Windows](https://github.com/pre-commit/pre-commit/issues/1229)
- [Get started using VS Code with WSL](https://learn.microsoft.com/en-us/windows/wsl/tutorials/wsl-vscode)

---

**Built for ekkOS™** - Windows compatibility, comprehensively covered
