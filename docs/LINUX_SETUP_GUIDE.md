# Linux Setup Guide for ekkOS Extension

**Complete guide for setting up ekkOS on Linux (Ubuntu, Fedora, Arch) with all platform-specific issues resolved.**

## 🐧 Critical Linux Issues (2026)

### Issue 1: Permission Issues with npm Global Install

**Problem**: `sudo npm install -g` causes permission errors and security issues

**Error**: `EACCES: permission denied` or `Error: EACCES: permission denied, mkdir '/usr/local/lib/node_modules'`

**Solution**: Fix npm permissions (never use sudo!)

```bash
# Create user npm directory
mkdir ~/.npm-global

# Configure npm to use it
npm config set prefix '~/.npm-global'

# Add to PATH in your shell profile
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# For zsh users:
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.zshrc
source ~/.zshrc

# Now install without sudo
npm install -g @ekkos/mcp-server
```

**Reference**: [Troubleshooting Guide](https://code.claude.com/docs/en/troubleshooting)

### Issue 2: Node.js Version Too Old

**Problem**: Claude Code requires Node.js 18 or higher

**Check Version**:
```bash
node --version
# Must show v18.x.x or higher
```

**Solution (Ubuntu/Debian)**:
```bash
# Install Node.js 20.x LTS from NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version  # Should be v20+
npm --version
```

**Solution (Fedora/RHEL)**:
```bash
# Install Node.js and npm
sudo dnf install -y nodejs npm

# If version is too old, use NodeSource
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# Verify
node --version  # Should be v20+
```

**Solution (Arch Linux)**:
```bash
# Install Node.js
sudo pacman -S nodejs npm

# Verify
node --version
```

**Reference**: [Ubuntu Installation Guide](https://itecsonline.com/post/how-to-install-claude-code-on-ubuntu-linux-complete-guide-2025)

### Issue 3: Hooks Not Executable

**Problem**: Hooks don't run because they lack execute permission

**Solution**: Make hooks executable

```bash
# Add execute permission
chmod +x ~/.claude/hooks/*.sh

# Verify
ls -l ~/.claude/hooks/
# Should show: -rwxr-xr-x (x = executable)
```

### Issue 4: PATH Not Persisting Across Sessions

**Problem**: PATH changes disappear after logout/reboot

**Solution**: Add to correct shell profile

```bash
# For bash (Ubuntu, Debian default)
echo 'export PATH=$HOME/.local/bin:$PATH' >> ~/.bashrc
echo 'export PATH=$HOME/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc

# For zsh
echo 'export PATH=$HOME/.local/bin:$PATH' >> ~/.zshrc
echo 'export PATH=$HOME/.npm-global/bin:$PATH' >> ~/.zshrc
source ~/.zshrc

# For fish
set -Ua fish_user_paths $HOME/.local/bin
set -Ua fish_user_paths $HOME/.npm-global/bin
```

### Issue 5: SELinux Blocking Hooks (Fedora/RHEL)

**Problem**: SELinux prevents hooks from executing

**Check SELinux Status**:
```bash
getenforce
# Shows: Enforcing, Permissive, or Disabled
```

**Solution**: Create SELinux policy or set permissive

```bash
# Option 1: Set hooks directory context
chcon -t user_home_t ~/.claude/hooks/*.sh

# Option 2: Temporarily set permissive (for testing only)
sudo setenforce 0

# After testing, re-enable
sudo setenforce 1

# Option 3: Create custom policy (recommended for production)
# This requires creating a custom SELinux module
```

### Issue 6: Snap-Installed VS Code Issues

**Problem**: Snap's sandboxing prevents access to home directory files

**Solution**: Use native .deb/.rpm installation

```bash
# Ubuntu/Debian: Remove snap version
snap remove code

# Install from Microsoft repository
sudo apt install software-properties-common apt-transport-https wget
wget -q https://packages.microsoft.com/keys/microsoft.asc -O- | sudo apt-key add -
sudo add-apt-repository "deb [arch=amd64] https://packages.microsoft.com/repos/vscode stable main"
sudo apt update
sudo apt install code

# Fedora: Use RPM
sudo rpm --import https://packages.microsoft.com/keys/microsoft.asc
sudo sh -c 'echo -e "[code]\nname=Visual Studio Code\nbaseurl=https://packages.microsoft.com/yumrepos/vscode\nenabled=1\ngpgcheck=1\ngpgkey=https://packages.microsoft.com/keys/microsoft.asc" > /etc/yum.repos.d/vscode.repo'
sudo dnf check-update
sudo dnf install code
```

## Prerequisites by Distribution

### Ubuntu/Debian

```bash
# Update package list
sudo apt update

# Install required packages
sudo apt install -y curl wget git build-essential

# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version  # Should be v20+
npm --version
```

### Fedora/RHEL

```bash
# Update system
sudo dnf update -y

# Install required packages
sudo dnf install -y curl wget git gcc-c++ make

# Install Node.js
sudo dnf install -y nodejs npm

# Verify
node --version
npm --version
```

### Arch Linux

```bash
# Update system
sudo pacman -Syu

# Install required packages
sudo pacman -S nodejs npm git base-devel

# Verify
node --version
npm --version
```

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

## Common Linux Issues

### Issue: jq Not Installed

**Problem**: Hooks need `jq` for JSON parsing

**Solution**: Install jq

```bash
# Ubuntu/Debian
sudo apt install -y jq

# Fedora/RHEL
sudo dnf install -y jq

# Arch
sudo pacman -S jq
```

### Issue: curl Not Installed

**Problem**: Some scripts need curl

**Solution**: Install curl

```bash
# Ubuntu/Debian
sudo apt install -y curl

# Fedora/RHEL
sudo dnf install -y curl

# Arch
sudo pacman -S curl
```

### Issue: Firewall Blocking MCP

**Problem**: Firewall prevents MCP connections

**Solution**: Configure firewall

```bash
# Ubuntu (ufw)
sudo ufw allow from 127.0.0.1

# Fedora/RHEL (firewalld)
sudo firewall-cmd --permanent --add-rich-rule='rule family="ipv4" source address="127.0.0.1" accept'
sudo firewall-cmd --reload

# Check status
sudo firewall-cmd --list-all
```

### Issue: VS Code Can't Execute Hooks

**Problem**: VS Code integrated terminal doesn't run hooks

**Solution**: Verify shell configuration

```bash
# Check which shell VS Code uses
echo $SHELL

# Ensure hooks directory in PATH (for your shell)
# Add to ~/.bashrc (bash) or ~/.zshrc (zsh):
export PATH="$HOME/.claude/hooks:$PATH"
```

### Issue: AppArmor Blocking (Ubuntu)

**Problem**: AppArmor profile prevents hook execution

**Solution**: Adjust AppArmor profile

```bash
# Check AppArmor status
sudo aa-status

# If blocking, create exception
sudo nano /etc/apparmor.d/local/usr.bin.code

# Add this line:
/home/*/.claude/hooks/*.sh r,

# Reload AppArmor
sudo systemctl reload apparmor
```

## Shell Configuration by Distribution

### Ubuntu/Debian (bash default)

```bash
# ~/.bashrc
export PATH="$HOME/.local/bin:$PATH"
export PATH="$HOME/.npm-global/bin:$PATH"
export EKKOS_API_KEY="your-key-here"

# Apply changes
source ~/.bashrc
```

### Fedora/RHEL (bash default)

```bash
# ~/.bashrc
export PATH="$HOME/.local/bin:$PATH"
export PATH="$HOME/.npm-global/bin:$PATH"
export EKKOS_API_KEY="your-key-here"

# Apply changes
source ~/.bashrc
```

### Arch (may vary - check $SHELL)

```bash
# For bash: ~/.bashrc
# For zsh: ~/.zshrc
# For fish: ~/.config/fish/config.fish

# Same exports as above for bash/zsh
# For fish:
set -x PATH $HOME/.local/bin $PATH
set -x PATH $HOME/.npm-global/bin $PATH
set -x EKKOS_API_KEY "your-key-here"
```

## Validation Checklist

After setup, verify:

- [ ] Node.js 18+ installed (`node --version`)
- [ ] npm configured for user installs
- [ ] VS Code installed (non-snap preferred)
- [ ] ekkOS extension installed
- [ ] Account connected (OAuth complete)
- [ ] MCP config exists at `~/.claude/settings.json`
- [ ] MCP server tests successfully (`npx @ekkos/mcp-server`)
- [ ] Hooks exist in `~/.claude/hooks/`
- [ ] Hooks are executable (`ls -l ~/.claude/hooks/*.sh`)
- [ ] Shell profile configured (`.bashrc`, `.zshrc`, etc.)
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
# Check system info
uname -a
cat /etc/os-release

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

# Check npm config
npm config list

# List hooks
ls -la ~/.claude/hooks/

# Check hook permissions
stat ~/.claude/hooks/user-prompt-submit.sh

# Test hook syntax
bash -n ~/.claude/hooks/user-prompt-submit.sh

# Check MCP config
cat ~/.claude/settings.json | jq '.'

# Check for blocking (SELinux/AppArmor)
getenforce              # Fedora/RHEL
sudo aa-status          # Ubuntu
```

## Distribution-Specific Package Managers

| Distribution | Package Manager | Install Command |
|--------------|----------------|-----------------|
| Ubuntu/Debian | apt | `sudo apt install package` |
| Fedora | dnf | `sudo dnf install package` |
| RHEL/CentOS | dnf/yum | `sudo dnf install package` |
| Arch | pacman | `sudo pacman -S package` |
| openSUSE | zypper | `sudo zypper install package` |
| Manjaro | pacman | `sudo pacman -S package` |

## Getting Help

- **Extension Issues**: [GitHub Issues](https://github.com/ekkostech/ekkos-connect/issues)
- **Ubuntu Setup**: [Complete Ubuntu Guide 2025](https://itecsonline.com/post/how-to-install-claude-code-on-ubuntu-linux-complete-guide-2025)
- **Troubleshooting**: [Official Claude Code Docs](https://code.claude.com/docs/en/troubleshooting)
- **Discord Support**: [discord.gg/vePAuEYp](https://discord.gg/vePAuEYp)

## Sources

- [Linux Installation Guide (Ubuntu)](https://itecsonline.com/post/how-to-install-claude-code-on-ubuntu-linux-complete-guide-2025)
- [Node.js Version Issues](https://github.com/anthropics/claude-code/issues/8410)
- [Claude Code Troubleshooting](https://claudelog.com/troubleshooting/)
- [Complete Setup Guide 2025](https://www.aifreeapi.com/en/posts/install-claude-code)
- [Official Troubleshooting Docs](https://code.claude.com/docs/en/troubleshooting)

---

**Built for ekkOS™** - Linux compatibility, all distributions covered

**Last Updated**: 2026-01-12 (reflects Node.js 18+ requirement, npm permissions, SELinux/AppArmor issues)
