# Create PAT for ekkostech Organization

## Your Azure DevOps Organization
- **Organization**: `ekkostech`
- **URL**: https://dev.azure.com/ekkostech/ekkOS_

## Steps to Create PAT with Marketplace Access

### 1. Go to Personal Access Tokens
1. Visit: https://dev.azure.com/ekkostech/_usersSettings/tokens
2. Or: https://dev.azure.com → Click your profile → Personal Access Tokens

### 2. Create New Token
1. Click **"New Token"** or **"+ New Token"**
2. Configure:
   - **Name**: `VS Code Marketplace - ekkos-connect`
   - **Organization**: Select **"ekkostech"** (your organization)
   - **Expiration**: Your choice (or no expiration)
   - **Scopes**: 
     - ✅ **Marketplace** → **Manage** (Full access)
     - This is the critical permission!

### 3. Important Notes
- The token must be scoped to your **ekkostech** organization
- Must have **Marketplace (Manage)** permission
- The publisher "ekkostech" must exist at https://marketplace.visualstudio.com/manage

### 4. Copy the Token
- **Copy it immediately** - you won't see it again!
- Store it securely

### 5. Verify Publisher Exists
Before publishing, ensure:
1. Go to: https://marketplace.visualstudio.com/manage
2. Publisher ID: `ekkostech` exists
3. If not, create it (must match exactly)

## Quick Link
Direct link to create token for ekkostech org:
https://dev.azure.com/ekkostech/_usersSettings/tokens















































































































































