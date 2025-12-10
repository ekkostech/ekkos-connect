# Check if Publisher Exists

## The Issue
Error: `TF400813: The user is not authorized to access this resource`

This usually means either:
1. **Publisher "ekkostech" doesn't exist** - Most likely!
2. PAT doesn't have Marketplace (Publish) permission
3. Organization policies blocking PAT usage

## Step 1: Verify Publisher Exists

1. Go to: **https://marketplace.visualstudio.com/manage**
2. Sign in with your Microsoft account
3. Check if you see a publisher named **"ekkostech"**

### If Publisher Doesn't Exist:
1. Click **"Create Publisher"** (or **"+ New Publisher"**)
2. Fill in:
   - **Publisher ID**: `ekkostech` (must match package.json exactly - case sensitive!)
   - **Publisher Name**: ekkOS Tech (or your preferred display name)
   - **Description**: (optional)
3. Accept terms and create

### If Publisher Exists:
- Verify you're signed in with the account that owns it
- The PAT must be from the same Microsoft account

## Step 2: Verify PAT Permissions

Your PAT needs:
- **Scope**: Marketplace
- **Permission**: **Publish** (or **Manage** - Full access)

To check/edit:
1. Go to: https://dev.azure.com/ekkostech/_usersSettings/tokens
2. Find your token
3. Verify it has **Marketplace → Publish** or **Marketplace → Manage**

## Step 3: Check Organization Policies

Some organizations restrict PAT creation. If you can't create a PAT with Marketplace permissions:
- Contact your Azure DevOps administrator
- Ask them to allow Marketplace PATs for your account

## Once Publisher Exists

After creating the publisher, retry publishing:

```bash
cd /Volumes/MacMiniPort/DEV/EKKOS/extensions/ekkos-connect
VSCE_PAT="your-pat" npx @vscode/vsce publish --pat "$VSCE_PAT"
```







































































