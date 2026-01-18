---
name: ekkOS_Safety
description: Check for conflicts before dangerous operations. Activate before deleting files, dropping tables, deploying to production, pushing to main, running destructive commands, modifying configuration files, or any irreversible action. This skill prevents accidents by checking user directives and patterns first.
allowed-tools:
  - mcp__ekkos-memory__ekkOS_Conflict
  - mcp__ekkos-memory__ekkOS_Search
---

# ekkOS_Safety

You are augmented with **ekkOS_ memory** - and your job is to PREVENT accidents by checking before dangerous operations.

## Why This Skill Exists

Users have directives (MUST/NEVER rules) and learned anti-patterns. Before any destructive action, you MUST check if it conflicts with these rules.

**This skill can BLOCK actions** that violate user directives.

## When To Activate

This skill should trigger BEFORE:

| Action Category | Examples |
|-----------------|----------|
| **File deletion** | `rm -rf`, `unlink`, delete files/folders |
| **Database destruction** | `DROP TABLE`, `DELETE FROM`, truncate |
| **Deployment** | `deploy`, `push to prod`, release |
| **Branch operations** | `push to main`, `force push`, `rebase main` |
| **Config changes** | Modify `.env`, change secrets, update config |
| **Package operations** | `npm publish`, release new version |
| **Infrastructure** | Destroy resources, scale down, terminate |

## Instructions

### Step 1: Detect Dangerous Intent

Before executing, identify if the action is:
- Irreversible (can't undo)
- Destructive (deletes/modifies data)
- Production-affecting (impacts live systems)
- Security-sensitive (credentials, permissions)

### Step 2: Check for Conflicts

```
ekkOS_Conflict({
  proposed_action: "delete all files in /tmp",
  scope: "deployment",  // Optional: narrow the check
  include_patterns: true  // Check anti-patterns too
})
```

### Step 3: Evaluate Response

The conflict check returns:
```json
{
  "has_conflicts": true,
  "blocking_directives": [
    {"type": "NEVER", "rule": "Delete without backup"}
  ],
  "warning_patterns": [
    {"title": "Always backup before delete"}
  ],
  "recommendation": "Create backup first"
}
```

### Step 4: Act on Conflicts

**If blocking conflicts found:**
```
⛔ BLOCKED: This action conflicts with your directive:
   [NEVER] Delete without backup

   Would you like to:
   1. Create a backup first
   2. Override this directive (requires confirmation)
   3. Cancel the operation
```

**If warnings found (not blocking):**
```
⚠️ WARNING: This action has potential issues:
   - Pattern suggests: "Always backup before delete"

   Proceeding with caution. Do you want to continue?
```

**If no conflicts:**
```
✅ Safety check passed. No conflicts with your directives or patterns.
```

## Example Scenarios

### Scenario 1: Delete Operation
```
User: "Delete all the old log files"

You: *Before executing*

     ekkOS_Conflict({
       proposed_action: "delete log files in /var/log/old",
       scope: "files"
     })

     Response: No conflicts found.

     "✅ Safety check passed. Proceeding to delete old log files..."
```

### Scenario 2: Blocked by Directive
```
User: "Push this directly to main"

You: *Before executing*

     ekkOS_Conflict({
       proposed_action: "git push to main branch",
       scope: "git"
     })

     Response:
     {
       "has_conflicts": true,
       "blocking_directives": [
         {"type": "NEVER", "rule": "Push directly to main"}
       ]
     }

     "⛔ BLOCKED: This conflicts with your directive:
      [NEVER] Push directly to main

      You previously set this rule. Options:
      1. Create a feature branch and PR instead
      2. Override (type 'override push to main')
      3. Cancel"
```

### Scenario 3: Warning from Pattern
```
User: "Drop the users table"

You: *Before executing*

     ekkOS_Conflict({
       proposed_action: "DROP TABLE users",
       scope: "database"
     })

     Response:
     {
       "has_conflicts": false,
       "warning_patterns": [
         {"title": "Always backup tables before DROP"}
       ]
     }

     "⚠️ WARNING: A pattern suggests backing up first.

      Pattern: 'Always backup tables before DROP'

      Should I:
      1. Create a backup first, then drop
      2. Proceed without backup
      3. Cancel"
```

### Scenario 4: Production Deployment
```
User: "Deploy to production"

You: *Before executing*

     ekkOS_Conflict({
       proposed_action: "deploy to production environment",
       scope: "deployment"
     })

     Response:
     {
       "has_conflicts": true,
       "blocking_directives": [
         {"type": "MUST", "rule": "Run tests before production deploy"}
       ]
     }

     "⛔ BLOCKED: Deployment requires tests first.
      [MUST] Run tests before production deploy

      Running tests now..."

     *Runs tests, then proceeds if they pass*
```

## Override Protocol

If user wants to override a directive:

1. **Require explicit confirmation:**
   ```
   User: "Override it, push to main anyway"
   You: "Overriding [NEVER] Push directly to main.
        Type 'CONFIRM OVERRIDE' to proceed."
   ```

2. **Log the override:**
   ```
   ekkOS_Forge({
     title: "Override: Pushed to main despite directive",
     problem: "User overrode NEVER directive for specific reason",
     solution: "Allowed because: [user's reason]",
     tags: ["override", "directive-exception"]
   })
   ```

3. **Proceed with caution:**
   ```
   "Override confirmed. Proceeding with push to main.
    ⚠️ This action was logged."
   ```

## Common Conflict Scopes

| Scope | Checks Against |
|-------|----------------|
| `"git"` | Branch rules, push policies |
| `"database"` | Data protection rules |
| `"deployment"` | Release procedures |
| `"files"` | Deletion/modification rules |
| `"security"` | Credential handling |
| `"infrastructure"` | Resource management |

## Integration with Directives

This skill enforces Layer 9 (Directives):

```
┌─────────────────────────────────────────────────────────────────┐
│  USER ACTION REQUEST                                             │
│  └── "Delete all test files"                                    │
│           ↓                                                      │
│  ekkOS_Safety SKILL (This Skill)                                │
│  └── ekkOS_Conflict check                                       │
│           ↓                                                      │
│  DIRECTIVE LAYER (Layer 9)                                       │
│  └── [NEVER] Delete without confirmation                        │
│           ↓                                                      │
│  BLOCKED or PROCEED                                              │
└─────────────────────────────────────────────────────────────────┘
```

## Success Metrics

You're using this skill correctly when:
- EVERY destructive action is checked first
- Blocking directives actually BLOCK
- Warnings are shown but don't block unnecessarily
- Overrides are logged
- Users feel protected, not annoyed

---

**Mantra**: About to destroy something? Check first. Always. No exceptions.
