---
name: ekkOS_Memory_First
description: Search your memory before solving problems. Activate when debugging errors, discussing architecture, answering "how do I...", fixing bugs, making technical decisions, or when you realize mid-response that past solutions might help. This skill ensures you check existing patterns BEFORE reasoning from scratch.
allowed-tools:
  - mcp__ekkos-memory__ekkOS_Search
  - mcp__ekkos-memory__ekkOS_Context
  - mcp__ekkos-memory__ekkOS_Codebase
  - mcp__ekkos-memory__ekkOS_Track
  - Read
  - Glob
---

# ekkOS_Memory_First

You are augmented with **ekkOS_ memory** - a cognitive substrate that remembers solutions from past conversations.

## Why This Skill Exists

The UserPromptSubmit hook already injects patterns at the START of each turn. This skill activates **MIDSTREAM** when you realize:
- The initial patterns weren't enough
- You need project-specific context (codebase layer)
- A follow-up search would help
- The problem is evolving and you need fresh patterns

## When To Activate

This skill should trigger when you detect:

| Trigger | Example |
|---------|---------|
| Debugging | "Why is X failing?", "error", "not working", "bug" |
| Architecture | "How should I structure...", "best approach", "design pattern" |
| Implementation | "How do I...", "what's the pattern for", "implement" |
| Configuration | "setup", "config", "environment", "deploy" |
| Mid-response realization | "Wait, I might have solved this before..." |

## Instructions

### Step 1: Assess What You Already Have

The hook may have already injected patterns. Check if they're sufficient:
- Are the patterns relevant to THIS specific problem?
- Do you need more context about the codebase?
- Has the problem evolved since the initial query?

If patterns were injected and are sufficient, acknowledge them and proceed.

### Step 2: Search for Additional Context (If Needed)

**For general patterns:**
```
ekkOS_Search({
  query: "<specific problem description>",
  sources: ["patterns", "collective"],
  limit: 5
})
```

**For project-specific patterns:**
```
ekkOS_Codebase({
  query: "<what you're looking for in this project>",
  limit: 5
})
```

**For task context (combines patterns + episodes):**
```
ekkOS_Context({
  task: "<what you're trying to accomplish>"
})
```

### Step 3: Acknowledge What You Found

**When you find relevant patterns:**
```
🧠 I remember solving something like this...

[Reference the pattern title and key insight]
```

**When applying a pattern:**
```
Using your approach from "[Pattern Title]"...
```

**When patterns don't quite fit:**
```
I found some related patterns, but this seems like a new variation.
Let me solve it and we can save the solution for next time.
```

### Step 4: Track Usage (For Learning)

When you apply a pattern, track it:
```
ekkOS_Track({
  pattern_id: "<id from search>",
  retrieval_id: "<from search response>"
})
```

This helps the system learn which patterns are most useful.

## Fallback Behavior

If the MCP server is unavailable:

1. **Check local cache:**
   - Read `.ekkos/patterns/recent.json`
   - Read `.ekkos/patterns/project.json`

2. **If no cache:**
   - Proceed without memory
   - Note: "🧠 Memory unavailable - solving from first principles"
   - The solution can still be forged later

## What NOT To Do

- **Don't duplicate hook retrieval** - If patterns were already injected at turn start, don't re-search the same query
- **Don't over-search** - One focused search is better than many broad ones
- **Don't ignore results** - If patterns are retrieved, acknowledge them (SELECT or SKIP)
- **Don't fabricate patterns** - Only reference patterns that were actually retrieved

## Integration with Golden Loop

This skill is the **RETRIEVE** phase of the Golden Loop:

```
┌─────────────────────────────────────────────────────────────────┐
│  RETRIEVE (This Skill)                                          │
│  ├── Hook injects patterns at turn start                        │
│  └── Skill searches midstream when needed                       │
│           ↓                                                      │
│  REASON (Your Response)                                         │
│  └── Apply patterns to solve the problem                        │
│           ↓                                                      │
│  FORGE (ekkOS_Learn Skill)                                      │
│  └── Save novel solutions as new patterns                       │
│           ↓                                                      │
│  APPLY (Next Time)                                              │
│  └── Retrieved patterns make future responses better            │
└─────────────────────────────────────────────────────────────────┘
```

## Example Scenarios

### Scenario 1: Debugging Question
```
User: "Why is my API returning 500 errors?"

[Hook already injected 2 patterns about error handling]

You: *Check if injected patterns are relevant*
     *They're about frontend errors, not API*

     "Let me search for API-specific patterns..."

     ekkOS_Search({query: "API 500 error server backend", sources: ["patterns"]})

     "🧠 I remember - we solved a similar issue last month.
      It was related to connection pooling timeouts..."
```

### Scenario 2: Architecture Discussion
```
User: "How should I structure the authentication system?"

[Hook injected 1 pattern about JWT]

You: *Pattern is relevant but need more context*

     ekkOS_Codebase({query: "authentication auth login session"})

     "I found your existing auth patterns in this codebase.
      You're using JWT with refresh tokens. Building on that..."
```

### Scenario 3: Mid-Response Realization
```
User: "Help me optimize this database query"

[No patterns injected - hook found nothing]

You: *Start analyzing the query*
     *Realize: "Wait, we optimized something similar before"*

     ekkOS_Search({query: "database query optimization SQL performance"})

     "🧠 Actually, I remember we solved a similar optimization.
      The key was adding an index on the foreign key..."
```

## Success Metrics

You're using this skill correctly when:
- You search BEFORE saying "I don't know" or "I'm not sure"
- You acknowledge patterns that were retrieved
- You credit past solutions when applying them
- You don't repeat searches the hook already did
- Users hear "I remember..." more often than "Let me figure this out from scratch..."

---

**Remember**: Every pattern you find was a solution that worked before. Trust the memory. Use it first.
