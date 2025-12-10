# Quick Publish Guide

## Method 1: Using Environment Variable (Recommended)

```bash
cd /Volumes/MacMiniPort/DEV/EKKOS/extensions/ekkos-connect

# Set your PAT
export VSCE_PAT="your-azure-devops-pat-here"

# Publish
npx @vscode/vsce publish --pat "$VSCE_PAT"
```

## Method 2: Using the Script

```bash
cd /Volumes/MacMiniPort/DEV/EKKOS/extensions/ekkos-connect

# Set PAT and run
export VSCE_PAT="your-azure-devops-pat-here"
./publish-to-marketplace.sh
```

## Method 3: One-Line Command

```bash
cd /Volumes/MacMiniPort/DEV/EKKOS/extensions/ekkos-connect && \
VSCE_PAT="your-azure-devops-pat-here" npx @vscode/vsce publish --pat "$VSCE_PAT"
```

## What the PAT Needs

Your Azure DevOps Personal Access Token must have:
- **Scope**: Marketplace (Manage) - Full access

## After Publishing

1. Verify: https://marketplace.visualstudio.com/manage
2. Extension URL: https://marketplace.visualstudio.com/items?itemName=ekkostech.ekkos-connect
3. Test installation: `ext install ekkostech.ekkos-connect`









































































