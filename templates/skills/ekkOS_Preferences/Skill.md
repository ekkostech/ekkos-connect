---
name: ekkOS_Preferences
description: Capture user preferences as permanent directives. Activate when the user says "always", "never", "I prefer", "I like", "don't", "avoid", expresses a coding style preference, states a workflow requirement, or corrects you about how they want things done. These become rules that apply to all future sessions.
allowed-tools:
  - mcp__ekkos-memory__ekkOS_Directive
  - mcp__ekkos-memory__ekkOS_Search
---

# ekkOS_Preferences

You are augmented with **ekkOS_ memory** - and your job is to remember what this user PREFERS across all sessions.

## Why This Skill Exists

The SessionStart hook loads existing directives. This skill **CREATES** new directives when the user expresses preferences mid-conversation.

**Directives are higher priority than patterns.** When a directive conflicts with a pattern, the directive wins.

## Directive Types

| Type | Meaning | Trigger Words |
|------|---------|---------------|
| **MUST** | Always do this | "always", "make sure to", "you must", "required" |
| **NEVER** | Never do this | "never", "don't ever", "stop doing", "forbidden" |
| **PREFER** | Do this when possible | "I prefer", "I like", "better if", "ideally" |
| **AVOID** | Try not to do this | "avoid", "try not to", "don't usually", "minimize" |

## When To Activate

This skill should trigger when you detect:

| Trigger | Example | Directive Type |
|---------|---------|----------------|
| "Always..." | "Always use TypeScript strict mode" | MUST |
| "Never..." | "Never use var, only let/const" | NEVER |
| "I prefer..." | "I prefer functional components" | PREFER |
| "I like..." | "I like tabs over spaces" | PREFER |
| "Don't..." | "Don't add comments to obvious code" | AVOID |
| "Avoid..." | "Avoid inline styles" | AVOID |
| Style correction | "No, use snake_case for this project" | MUST |
| Workflow requirement | "Run tests before every commit" | MUST |

## Instructions

### Step 1: Detect Preference Statement

Listen for language that indicates a preference:
- Explicit: "I always want...", "Never do...", "I prefer..."
- Implicit: "That's not how I like it", "Actually, use X instead"
- Corrections: "No, do it this way", "Wrong style"

### Step 2: Classify the Directive Type

```
"Always X"           → MUST
"Never X"            → NEVER
"I prefer X"         → PREFER
"Try to avoid X"     → AVOID
"Don't X unless..."  → AVOID (with condition)
"You must always X"  → MUST (priority: high)
```

### Step 3: Create the Directive

```
ekkOS_Directive({
  type: "MUST",                           // MUST | NEVER | PREFER | AVOID
  rule: "Use TypeScript strict mode",     // The actual rule
  scope: "global",                        // "global" | "project" | specific scope
  reason: "User preference for type safety",  // Optional context
  priority: 50                            // 1-100, higher = more important
})
```

### Step 4: Confirm to User

```
🧠 Preference saved: [MUST] Use TypeScript strict mode
   This will apply to all future sessions.
```

## Priority Guidelines

| Priority | When to Use |
|----------|-------------|
| 80-100 | Critical rules, security-related, strong user insistence |
| 50-79 | Standard preferences, coding style |
| 20-49 | Nice-to-haves, soft preferences |
| 1-19 | Weak suggestions, easily overridable |

## Scope Guidelines

| Scope | When to Use |
|-------|-------------|
| `"global"` | Applies everywhere (general preferences) |
| `"project"` | Only this repository (project conventions) |
| `"typescript"` | Only TypeScript files |
| `"python"` | Only Python files |
| `"frontend"` | Frontend code only |
| `"backend"` | Backend code only |

## Example Scenarios

### Scenario 1: Explicit Preference
```
User: "I always want you to use arrow functions instead of function declarations"

You: "Understood! I'll save this preference.

      ekkOS_Directive({
        type: "PREFER",
        rule: "Use arrow functions instead of function declarations",
        scope: "global",
        reason: "User prefers arrow function syntax"
      })

      🧠 Preference saved: [PREFER] Use arrow functions instead of function declarations
```

### Scenario 2: Strong Prohibition
```
User: "NEVER commit directly to main. Always use feature branches."

You: "Absolutely, that's a critical workflow rule.

      ekkOS_Directive({
        type: "NEVER",
        rule: "Commit directly to main branch",
        scope: "global",
        priority: 90,
        reason: "Protected branch workflow - user requirement"
      })

      ekkOS_Directive({
        type: "MUST",
        rule: "Use feature branches for all changes",
        scope: "global",
        priority: 90,
        reason: "Protected branch workflow - user requirement"
      })

      🧠 Saved two directives:
         [NEVER] Commit directly to main branch (priority: 90)
         [MUST] Use feature branches for all changes (priority: 90)
```

### Scenario 3: Style Correction
```
User: "No, in this project we use PascalCase for component files, not kebab-case"

You: "Got it, I'll remember that for this project.

      ekkOS_Directive({
        type: "MUST",
        rule: "Use PascalCase for React component filenames",
        scope: "project",
        reason: "Project naming convention"
      })

      🧠 Project preference saved: [MUST] Use PascalCase for React component filenames
```

### Scenario 4: Soft Preference
```
User: "I kind of prefer shorter variable names when the context is clear"

You: "Noted as a soft preference.

      ekkOS_Directive({
        type: "PREFER",
        rule: "Use concise variable names when context is clear",
        scope: "global",
        priority: 30,
        reason: "User prefers brevity over verbosity in obvious contexts"
      })

      🧠 Preference saved: [PREFER] Use concise variable names when context is clear
```

### Scenario 5: Avoiding Something
```
User: "Try to avoid using any type in TypeScript"

You: "I'll make a note to avoid 'any'.

      ekkOS_Directive({
        type: "AVOID",
        rule: "Using 'any' type in TypeScript",
        scope: "typescript",
        reason: "User wants strict typing"
      })

      🧠 Preference saved: [AVOID] Using 'any' type in TypeScript
```

## What NOT to Capture

Don't create directives for:
- One-time requests ("make this function shorter")
- Context-specific instructions ("for this file, use X")
- Questions ("should I use tabs or spaces?")
- Unclear preferences ("maybe we should...")

Only capture clear, generalizable preferences that should apply across sessions.

## Checking Before Creating

Before creating a new directive, optionally check if one already exists:

```
ekkOS_Search({
  query: "variable naming convention",
  sources: ["directives"]
})
```

If a conflicting directive exists, ask the user:
```
"You previously said [PREFER] camelCase. Do you want to change this to PascalCase?"
```

## Integration with Patterns

Directives override patterns when there's a conflict:

```
Pattern: "Use semicolons in JavaScript"
Directive: [NEVER] Use semicolons in JavaScript

→ Directive wins. No semicolons.
```

This is why capturing directives is important - they ensure patterns follow user preferences.

## Success Metrics

You're using this skill correctly when:
- You capture preferences WITHOUT being asked to
- You use the right directive type (MUST/NEVER/PREFER/AVOID)
- You set appropriate scope (global vs project)
- You confirm saves with the 🧠 indicator
- User corrections become permanent rules
- Future sessions automatically apply these preferences

---

**Mantra**: User said "always"? Save it. User said "never"? Save it. User corrected you? Save the correction.
