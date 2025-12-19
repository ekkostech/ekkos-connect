# Verify Your Personal Access Token

## The Issue
Your PAT is being rejected with: `TF400813: The user is not authorized to access this resource`

## What This Means
The PAT either:
1. **Doesn't have Marketplace permissions** - Most common issue
2. **Is expired or revoked**
3. **Is from a different Microsoft account** than the one that owns the publisher
4. **Has incorrect scope/organization**

## How to Fix

### Step 1: Regenerate PAT with Correct Permissions

1. Go to **Azure DevOps**: https://dev.azure.com
2. Click your profile icon (top right) → **Personal Access Tokens**
3. Either:
   - **Edit existing token** → Scroll to "Scopes" → Find "Marketplace" → Check "Manage"
   - **Create new token** with these settings:
     - **Name**: VS Code Marketplace Publishing
     - **Organization**: All accessible organizations
     - **Expiration**: Your choice (or no expiration)
     - **Scopes**: 
       - ✅ **Marketplace** → **Manage** (Full access)
       - This is REQUIRED for publishing

### Step 2: Verify Publisher Exists

1. Go to: https://marketplace.visualstudio.com/manage
2. Sign in with the **same Microsoft account** you used for Azure DevOps
3. Check if publisher "ekkostech" exists
4. If not, create it (Publisher ID must be exactly: `ekkostech`)

### Step 3: Ensure Same Account

**Critical**: The PAT and the publisher must be from the **same Microsoft account**.

- PAT from: `account1@example.com`
- Publisher owned by: `account1@example.com` ✅

If they're different accounts, either:
- Create PAT from the account that owns the publisher, OR
- Transfer publisher to the account that has the PAT

### Step 4: Test the New PAT

```bash
cd /Volumes/MacMiniPort/DEV/EKKOS/extensions/ekkos-connect

# Test with new PAT
export VSCE_PAT="your-new-pat-here"
npx @vscode/vsce ls ekkostech
```

If this works, you'll see your publisher info or extensions list.

## Quick Checklist

- [ ] PAT has "Marketplace (Manage)" permission
- [ ] Publisher "ekkostech" exists at marketplace.visualstudio.com/manage
- [ ] PAT and publisher are from same Microsoft account
- [ ] PAT is not expired
- [ ] PAT organization scope includes the right organization

## Once Fixed

Once you have a new PAT with correct permissions, we can retry publishing:

```bash
cd /Volumes/MacMiniPort/DEV/EKKOS/extensions/ekkos-connect
VSCE_PAT="new-pat-here" npx @vscode/vsce publish --pat "$VSCE_PAT"
```















































































































































