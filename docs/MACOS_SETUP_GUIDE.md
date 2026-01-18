# macOS Setup Guide for ekkOS Extension

**Complete guide for setting up ekkOS on macOS with all platform-specific issues resolved.**

## 🍎 Critical macOS Issues (2026)

### Issue 1: `claude` Command Not Found After npm Install

**Problem**: With Homebrew and npm global installs, symlink issues prevent finding the `claude` command.

**Error**: `command not found: claude` or `zsh: command not found: claude`

**Solution**: Fix npm global bin path

```bash
# Check npm global bin path
npm bin -g
# Should show: /opt/homebrew/bin or /usr/local/bin

# If not in PATH, add to your shell profile
echo 'export PATH="$(npm bin -g):$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**Reference**: [GitHub Issue #3172](https://github.com/anthropics/claude-code/issues/3172)

### Issue 2: zsh vs bash (Shell Profile Confusion)

**Problem**: macOS Catalina+ uses zsh by default, but old guides reference `.bash_profile`

**Solution**: Use the correct shell profile

```bash
# Check your shell
echo $SHELL

# If /bin/zsh:
nano ~/.zshrc

# If /bin/bash:
nano ~/.bash_profile
```

**Path Configuration**:
```bash
# For zsh (~/.zshrc):
export PATH="/opt/homebrew/bin:$PATH"  # M1/M2 Macs
export PATH="/usr/local/bin:$PATH"      # Intel Macs
export PATH="$HOME/.local/bin:$PATH"    # User binaries

# Apply changes
source ~/.zshrc
```

### Issue 3: Permission Issues with npm

**Problem**: `sudo npm install -g` causes permission errors

**Error**: `EACCES: permission denied`

**Solution**: Fix npm permissions (never use sudo!)

```bash
# Create user npm directory
mkdir ~/.npm-global

# Configure npm to use it
npm config set prefix '~/.npm-global'

# Add to PATH
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
source ~/.zshrc

# Now install without sudo
npm install -g @ekkos/mcp-server
```

**Reference**: [Troubleshooting Guide](https://code.claude.com/docs/en/troubleshooting)

### Issue 4: Node.js Version Too Old

**Problem**: Claude Code requires Node.js 18+

**Check Version**:
```bash
node --version
# Must show v18.x.x or higher
```

**Solution**: Install/Update Node.js

**Option 1: Homebrew (Recommended)**
```bash
brew install node
# or update existing
brew upgrade node
```

**Option 2: nvm (Node Version Manager)**
```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Add to shell profile
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.zshrc
echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.zshrc
source ~/.zshrc

# Install Node 20 LTS
nvm install 20
nvm use 20
nvm alias default 20
```

### Issue 5: M1/M2 (ARM) vs Intel Differences

**Problem**: Homebrew paths differ between Apple Silicon and Intel Macs

**M1/M2 Macs (Apple Silicon)**:
- Homebrew location: `/opt/homebrew`
- Node location: `/opt/homebrew/bin/node`

**Intel Macs**:
- Homebrew location: `/usr/local`
- Node location: `/usr/local/bin/node`

**Universal Solution**:
```bash
# Add both paths (safe for both architectures)
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
```

### Issue 6: Gatekeeper Security Blocking

**Problem**: macOS Gatekeeper may block downloaded files

**Solution**: Allow ekkOS binaries

```bash
# If you get "app can't be opened because it is from an unidentified developer"
xattr -dr com.apple.quarantine ~/.claude/hooks/*.sh

# Or allow all at once
sudo spctl --master-disable  # Disable Gatekeeper (not recommended)
# After installing:
sudo spctl --master-enable   # Re-enable Gatekeeper
```

## Prerequisites

### 1. Install Homebrew (if not already installed)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# For M1/M2, add Homebrew to PATH
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

### 2. Install Node.js 18+

```bash
brew install node

# Verify
node --version  # Should be v18+
npm --version
```

### 3. Install VS Code

Download from [code.visualstudio.com](https://code.visualstudio.com/)

Or with Homebrew:
```bash
brew install --cask visual-studio-code
```

## Installation Steps

### Step 1: Install ekkOS Extension

1. Open VS Code
2. Go to Extensions (⌘+Shift+X)
3. Search for "ekkos-connect"
4. Click Install

### Step 2: Connect Account

1. Click ekkOS icon in activity bar
2. Click "Connect Account"
3. Sign in with your ekkOS account
4. MCP config will auto-deploy

### Step 3: Verify Configuration

Check that config file exists:
```bash
cat ~/.claude/settings.json
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

```bash
# Test MCP server manually
export EKKOS_API_KEY=your-key-here
npx -y @ekkos/mcp-server
```

Should show:
```
ekkOS MCP Server v2.x.x
Listening on stdio...
```

Press Ctrl+C to exit.

### Step 5: Verify Hooks

Check hooks are installed:
```bash
ls -la ~/.claude/hooks/
```

Should show:
- `user-prompt-submit.sh`
- `session-start.sh`

Test hook syntax:
```bash
bash -n ~/.claude/hooks/user-prompt-submit.sh
```

No output = syntax is good ✅

Make executable:
```bash
chmod +x ~/.claude/hooks/*.sh
```

## Common macOS Issues

### Issue: Hooks Not Executing

**Problem**: Hooks not running, no ekkOS header shown

**Solution**: Check permissions and shell

```bash
# Make hooks executable
chmod +x ~/.claude/hooks/*.sh

# Verify shebang
head -1 ~/.claude/hooks/user-prompt-submit.sh
# Should show: #!/bin/bash

# Test hook manually
bash ~/.claude/hooks/user-prompt-submit.sh <<< '{"query":"test","session_id":"test123"}'
```

### Issue: Command Line Tools Missing

**Problem**: `xcrun: error: invalid active developer path`

**Solution**: Install Xcode Command Line Tools

```bash
xcode-select --install
```

Click "Install" in the dialog that appears.

### Issue: Python Not Found

**Problem**: Some hooks need Python

**Solution**: macOS comes with Python 3

```bash
# Verify Python
python3 --version

# If missing, install via Homebrew
brew install python3
```

### Issue: jq Not Found

**Problem**: Hooks use `jq` for JSON parsing

**Solution**: Install jq

```bash
brew install jq

# Verify
jq --version
```

### Issue: Environment Variables Not Persisting

**Problem**: PATH or EKKOS variables disappear after restart

**Solution**: Add to correct shell profile

```bash
# For zsh (default on modern macOS)
echo 'export EKKOS_API_KEY="your-key"' >> ~/.zshrc
source ~/.zshrc

# For bash (if you changed your shell)
echo 'export EKKOS_API_KEY="your-key"' >> ~/.bash_profile
source ~/.bash_profile
```

### Issue: VS Code Can't Find Node

**Problem**: VS Code doesn't detect Node.js

**Solution**: Add to VS Code settings

```json
// settings.json (⌘+Shift+P → "Preferences: Open Settings (JSON)")
{
  "terminal.integrated.env.osx": {
    "PATH": "/opt/homebrew/bin:/usr/local/bin:${env:PATH}"
  }
}
```

Restart VS Code after PATH changes.

## Path Configuration Quick Reference

### For M1/M2 Macs (Apple Silicon)

```bash
# ~/.zshrc
export PATH="/opt/homebrew/bin:$PATH"
export PATH="/opt/homebrew/opt/node/bin:$PATH"
export PATH="$HOME/.npm-global/bin:$PATH"
export PATH="$HOME/.local/bin:$PATH"
```

### For Intel Macs

```bash
# ~/.zshrc (or ~/.bash_profile)
export PATH="/usr/local/bin:$PATH"
export PATH="/usr/local/opt/node/bin:$PATH"
export PATH="$HOME/.npm-global/bin:$PATH"
export PATH="$HOME/.local/bin:$PATH"
```

## Validation Checklist

After setup, verify:

- [ ] Node.js 18+ installed (`node --version`)
- [ ] Homebrew installed (`brew --version`)
- [ ] VS Code installed
- [ ] ekkOS extension installed
- [ ] Account connected (OAuth complete)
- [ ] MCP config exists at `~/.claude/settings.json`
- [ ] MCP server tests successfully (`npx @ekkos/mcp-server`)
- [ ] Hooks exist in `~/.claude/hooks/`
- [ ] Hooks are executable (`ls -l ~/.claude/hooks/*.sh`)
- [ ] Shell profile configured (`.zshrc` or `.bash_profile`)
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

## Debugging Commands

```bash
# Check shell
echo $SHELL

# Check PATH
echo $PATH

# Find Node.js
which node
node --version

# Find npm
which npm
npm --version

# Find npx
which npx

# Check npm global bin
npm bin -g

# List hooks
ls -la ~/.claude/hooks/

# Test hook syntax
bash -n ~/.claude/hooks/user-prompt-submit.sh

# Check MCP config
cat ~/.claude/settings.json | jq '.'
```

## Getting Help

- **Extension Issues**: [GitHub Issues](https://github.com/ekkostech/ekkos-connect/issues)
- **macOS Setup**: [Complete Installation Guide](https://medium.com/@lvalics_37568/setting-up-claude-code-on-windows-macos-449eed161e10)
- **Troubleshooting**: [Official Claude Code Docs](https://code.claude.com/docs/en/troubleshooting)
- **Discord Support**: [discord.gg/vePAuEYp](https://discord.gg/vePAuEYp)

## Sources

- [claude command not found with Homebrew](https://github.com/anthropics/claude-code/issues/3172)
- [Claude Code Troubleshooting Guide](https://claudelog.com/troubleshooting/)
- [Setting up Claude Code on macOS](https://medium.com/@lvalics_37568/setting-up-claude-code-on-windows-macos-449eed161e10)
- [Official Troubleshooting Docs](https://code.claude.com/docs/en/troubleshooting)
- [Complete Setup Guide 2025](https://www.aifreeapi.com/en/posts/install-claude-code)

---

**Built for ekkOS™** - macOS compatibility, thoroughly covered

**Last Updated**: 2026-01-12 (reflects January 2026 issues with M1/M2, zsh, and Homebrew)
