---
name: permissions
description: Manage ekkOS tool permissions. View, grant, or revoke permissions for proactive tool execution. Use when user types "/permissions" or wants to configure what ekkOS can do automatically.
allowed-tools:
  - Bash
  - Read
  - Write
---

# /permissions - Manage ekkOS Tool Permissions

Control what ekkOS tools can run proactively without asking for approval.

## Usage

```bash
/permissions                    # Show current permissions
/permissions list               # Show all permissions
/permissions grant <scope>      # Grant a permission
/permissions revoke <scope>     # Revoke a permission
/permissions reset              # Reset to defaults
```

## Permission Scopes

### 🔍 ekkOS_Search (Low Risk)
```bash
/permissions grant search:auto_before_answer
  → Automatically search memory before answering technical questions

/permissions grant search:auto_on_debug
  → Automatically search for similar issues when debugging
```

### 🔨 ekkOS_Forge (Medium Risk)
```bash
/permissions grant forge:auto_on_fix
  → Automatically create patterns when you fix bugs

/permissions grant forge:auto_on_solution
  → Create patterns for any non-trivial solution you provide
```

### 📋 ekkOS_Directive (Medium Risk)
```bash
/permissions grant directive:auto_capture_preferences
  → Automatically save user preferences as directives

/permissions grant directive:auto_capture_corrections
  → Save corrections as directives without asking
```

### 📊 ekkOS_Track (Low Risk)
```bash
/permissions grant track:auto_track_usage
  → Automatically track when patterns are applied

/permissions grant track:auto_track_outcomes
  → Track success/failure of pattern applications
```

### ⚠️ ekkOS_Conflict (Low Risk)
```bash
/permissions grant conflict:auto_check_destructive
  → Automatically check for conflicts before dangerous operations
```

### 🧠 ekkOS_Recall (Low Risk)
```bash
/permissions grant recall:auto_load_context
  → Automatically load relevant past context for tasks
```

## Risk Levels

| Level | Operations | Examples |
|-------|------------|----------|
| **Low** | Read-only, no side effects | Search, Recall, Conflict checks |
| **Medium** | Write operations, reversible | Forge patterns, Create directives |
| **High** | Destructive, irreversible | (None currently - all high-risk requires explicit approval) |

## Implementation

When user runs `/permissions`:

### Step 1: Parse Command

```bash
#!/bin/bash
ARGS="${ARGUMENTS:-list}"
API_KEY=$(jq -r '.apiKey // .hookApiKey' ~/.ekkos/config.json)
BASE_URL="https://api.ekkos.dev"

case "$ARGS" in
  ""|list)
    # Show current permissions
    curl -s "$BASE_URL/api/v1/permissions" \
      -H "Authorization: Bearer $API_KEY" | jq .
    ;;

  grant*)
    # Extract scope from "grant scope:name"
    SCOPE=$(echo "$ARGS" | sed 's/grant //')
    curl -s "$BASE_URL/api/v1/permissions/grant" \
      -H "Authorization: Bearer $API_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"scope\": \"$SCOPE\"}" | jq .
    ;;

  revoke*)
    # Extract scope from "revoke scope:name"
    SCOPE=$(echo "$ARGS" | sed 's/revoke //')
    curl -s "$BASE_URL/api/v1/permissions/revoke" \
      -H "Authorization: Bearer $API_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"scope\": \"$SCOPE\"}" | jq .
    ;;

  reset)
    # Reset to recommended defaults
    curl -s "$BASE_URL/api/v1/permissions/reset" \
      -H "Authorization: Bearer $API_KEY" \
      -X POST | jq .
    ;;

  *)
    echo "Unknown command: $ARGS"
    echo "Usage: /permissions [list|grant|revoke|reset]"
    exit 1
    ;;
esac
```

### Step 2: Display Results

Format the response for readability:

```
✓ ekkOS Tool Permissions

## Active Permissions (5)

🔍 ekkOS_Search
  ✓ auto_before_answer        [low risk]    Used: 247 times
  ✓ auto_on_debug              [low risk]    Used: 18 times

🔨 ekkOS_Forge
  ✓ auto_on_fix                [medium risk] Used: 42 times

📋 ekkOS_Directive
  ✓ auto_capture_preferences   [medium risk] Used: 9 times

## Revoked Permissions (1)

🔨 ekkOS_Forge
  ✗ auto_on_solution           [medium risk] Revoked 3 days ago

## Available Permissions

You can grant these additional permissions:

  /permissions grant track:auto_track_usage
  /permissions grant recall:auto_load_context
  /permissions grant conflict:auto_check_destructive

Run "/permissions grant <scope>" to enable.
```

### Step 3: Recommend Defaults

If user has NO permissions set, show recommended starter set:

```
🚀 Recommended Starter Permissions

These are safe, read-only operations that make ekkOS smarter:

  /permissions grant search:auto_before_answer      ← Search memory first
  /permissions grant track:auto_track_usage         ← Track what works
  /permissions grant conflict:auto_check_destructive ← Safety checks

Would you like to grant all three? (y/n)
```

## Permission Enforcement

The MCP gateway checks permissions before executing tools:

```typescript
// Before executing a tool
const hasPermission = await checkPermission(
  userId,
  toolName,
  context.permission_scope
);

if (!hasPermission) {
  // Ask user for approval
  return {
    success: false,
    error: 'Permission required',
    request_permission: {
      tool: toolName,
      scope: context.permission_scope,
      description: 'What this allows...',
      risk_level: 'low'
    }
  };
}

// Execute tool with permission
await executeTool(toolName, args);
await trackPermissionUsage(userId, toolName, scope);
```

## Examples

### Example 1: First Time User

```
User: /permissions

Output:
  ✓ ekkOS Tool Permissions

  You haven't granted any permissions yet.

  🚀 Recommended Starter Set (read-only, safe):

    /permissions grant search:auto_before_answer
    /permissions grant track:auto_track_usage
    /permissions grant conflict:auto_check_destructive

  Or grant all at once:

    /permissions reset    ← Sets recommended defaults
```

### Example 2: Grant Permission

```
User: /permissions grant forge:auto_on_fix

Output:
  ✓ Permission Granted

  🔨 ekkOS_Forge: auto_on_fix [medium risk]

  This allows:
    - Automatically create memory patterns when you fix bugs
    - Patterns are saved without asking for approval
    - You can review patterns later with /patterns list

  To revoke: /permissions revoke forge:auto_on_fix
```

### Example 3: View Active

```
User: /permissions list

Output:
  ✓ ekkOS Tool Permissions (6 active)

  🔍 ekkOS_Search
    ✓ auto_before_answer        Used 342 times   Last: 2 min ago
    ✓ auto_on_debug              Used 29 times    Last: 1 hour ago

  🔨 ekkOS_Forge
    ✓ auto_on_fix                Used 67 times    Last: 5 min ago

  📋 ekkOS_Directive
    ✓ auto_capture_preferences   Used 14 times    Last: 1 day ago

  📊 ekkOS_Track
    ✓ auto_track_usage           Used 534 times   Last: 1 min ago
    ✓ auto_track_outcomes        Used 67 times    Last: 10 min ago

  Total proactive actions: 1,053
```

### Example 4: Revoke Permission

```
User: /permissions revoke forge:auto_on_fix

Output:
  ✓ Permission Revoked

  🔨 ekkOS_Forge: auto_on_fix

  This permission is now disabled. I will ask before creating patterns.

  To re-enable: /permissions grant forge:auto_on_fix
```

## Integration with Skills

When a skill wants to use a tool proactively:

```markdown
# In ekkOS_Learn skill

Before calling ekkOS_Forge, check if permission is granted:

1. Try proactive execution (relies on MCP gateway permission check)
2. If rejected → explain what permission is needed
3. Offer to grant permission: "/permissions grant forge:auto_on_solution"
```

## Success Metrics

Permissions are working well when:
- ✅ Users grant permissions for operations they trust
- ✅ ekkOS operates autonomously within granted boundaries
- ✅ Users rarely see "permission required" prompts for granted scopes
- ✅ Permission usage stats show which features are most valuable
- ✅ Users feel in control of what ekkOS can do automatically

---

**Mantra**: Explicit permissions enable proactive intelligence. Users control the autonomy level.
