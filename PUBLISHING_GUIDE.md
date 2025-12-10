# Publishing ekkos-connect to VS Code Marketplace

## Current Status
- ✅ Extension compiled successfully
- ✅ Icon created (icon.png)
- ✅ .vscodeignore configured
- ✅ Version: 1.2.0
- ✅ Publisher: ekkostech

## Step-by-Step Publishing Guide

### 1. Set Up VS Code Marketplace Account

If you haven't already:

1. Go to [Visual Studio Marketplace](https://marketplace.visualstudio.com/manage)
2. Sign in with your Microsoft account
3. Create a publisher named `ekkostech` (must match package.json)

### 2. Generate Personal Access Token (PAT)

1. Go to [Azure DevOps](https://dev.azure.com)
2. Click your profile icon → **Personal Access Tokens**
3. Click **New Token**
4. Configure:
   - **Name**: `VS Code Marketplace Publishing`
   - **Organization**: All accessible organizations
   - **Expiration**: Set appropriate duration
   - **Scopes**: Custom defined
     - ✅ **Marketplace (Manage)** - Full access
5. Click **Create**
6. **Copy the token immediately** (you won't see it again!)

### 3. Authenticate with vsce

You have two options:

**Option A: Login (stores in keychain)**
```bash
cd /Volumes/MacMiniPort/DEV/EKKOS/extensions/ekkos-connect
npx @vscode/vsce login ekkostech
# Enter your PAT when prompted
```

**Option B: Environment Variable (for CI/CD)**
```bash
export VSCE_PAT="your-personal-access-token-here"
```

### 4. Verify Extension is Ready

```bash
cd /Volumes/MacMiniPort/DEV/EKKOS/extensions/ekkos-connect

# Check version
cat package.json | grep '"version"'

# Verify build
npm run compile
ls -la out/extension.js

# Test package locally
npm run package
# This creates: ekkos-connect-1.2.0.vsix
```

### 5. Publish to Marketplace

**Method 1: Direct Publish (Recommended)**
```bash
cd /Volumes/MacMiniPort/DEV/EKKOS/extensions/ekkos-connect
npx @vscode/vsce publish
```

**Method 2: Publish Specific Version**
```bash
npx @vscode/vsce publish 1.2.0
```

**Method 3: Publish with Release Notes**
```bash
npx @vscode/vsce publish --releaseNotes "Initial marketplace release - one-click ekkOS setup"
```

### 6. Verify Publication

1. Go to [Marketplace Management](https://marketplace.visualstudio.com/manage)
2. Find "ekkOS_™ - Memory That Learns"
3. Check status (should show "Published")
4. Verify version number matches

### 7. Test Installation

1. Open VS Code
2. Go to Extensions (Cmd+Shift+X)
3. Search for "ekkOS"
4. Install from marketplace
5. Verify it works

## Quick Publish Command

If you're already authenticated:

```bash
cd /Volumes/MacMiniPort/DEV/EKKOS/extensions/ekkos-connect && \
npm run compile && \
npx @vscode/vsce publish
```

## Troubleshooting

### "Missing publisher name"
- Make sure you're logged in: `npx @vscode/vsce login ekkostech`
- Or set `VSCE_PAT` environment variable

### "Version already exists"
- Increment version in `package.json`
- Version must be higher than current published version

### "Invalid Personal Access Token"
- Regenerate PAT in Azure DevOps
- Ensure PAT has `Marketplace (Manage)` permission
- Check token hasn't expired

## Next Steps After Publishing

1. Update web app links to use marketplace URL
2. Monitor analytics and user feedback
3. Set up CI/CD for automatic publishing (optional)
4. Update documentation with marketplace link

## Marketplace URL Format

Once published, the extension will be available at:
`https://marketplace.visualstudio.com/items?itemName=ekkostech.ekkos-connect`

Users can install with:
- VS Code: `ext install ekkostech.ekkos-connect`
- Direct link: `vscode:extension/ekkostech.ekkos-connect`









































































