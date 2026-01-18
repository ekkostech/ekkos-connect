---
name: ekkOS_Learn
description: Capture solutions as patterns for future use. Activate when you fix a bug, solve a non-trivial problem, get corrected by the user, discover something that works (or doesn't work), find a better approach, or complete any solution worth remembering. Failures are just as valuable as successes - forge anti-patterns too.
allowed-tools:
  - mcp__ekkos-memory__ekkOS_Forge
  - mcp__ekkos-memory__ekkOS_Outcome
  - mcp__ekkos-memory__ekkOS_Track
  - mcp__ekkos-memory__ekkOS_Search
---

# ekkOS_Learn

You are augmented with **ekkOS_ memory** - and your job is to make it SMARTER over time by forging what you learn.

## Why This Skill Exists

The Stop hook detects `[ekkOS_LEARN]` markers in your responses and auto-forges patterns. This skill teaches you **WHEN** to add those markers and **HOW** to forge patterns directly.

**The Golden Rule**: If you solved something non-trivial, FORGE IT. If something didn't work, FORGE IT AS AN ANTI-PATTERN. Every forged pattern makes future sessions smarter.

## When To Activate

This skill should trigger when you detect:

| Trigger | What To Forge |
|---------|---------------|
| **Bug fixed** | Problem + root cause + solution |
| **Non-trivial solution** | The approach that worked |
| **User corrected you** | What you got wrong + the correct way |
| **Unexpected success** | Why it worked (capture the insight) |
| **Unexpected failure** | Why it didn't work (anti-pattern) |
| **Better approach found** | The improvement over first attempt |
| **Configuration solved** | Setup steps that worked |
| **Architecture decision** | The decision + rationale |
| **Gotcha discovered** | The pitfall + how to avoid it |

## Pattern vs Anti-Pattern

**Patterns** = Things that WORK
```
Title: "Fix JWT expiration errors with clock tolerance"
Problem: "JWT tokens rejected as expired due to clock skew"
Solution: "Add clockTolerance: 30 to jwt.verify options"
```

**Anti-Patterns** = Things that DON'T WORK
```
Title: "Don't use setTimeout for rate limiting"
Problem: "Tried setTimeout to throttle API calls"
Solution: "This doesn't work because... Use debounce instead"
anti_patterns: ["setTimeout for throttling"]
```

**BOTH ARE VALUABLE.** Anti-patterns prevent repeating mistakes.

## Instructions

### Method 1: Marker-Based (Recommended)

Add a marker in your response that the Stop hook will detect:

```
[ekkOS_LEARN] Forging: "Your Pattern Title"
```

The hook extracts:
- Title from the marker
- Problem from user's question
- Solution from your response

**Example:**
```
The issue was that the database connection wasn't being released.
Here's the fix:

```typescript
finally {
  await connection.release();
}
```

[ekkOS_LEARN] Forging: "Always release database connections in finally block"
```

### Method 2: Direct Forge (For Complex Patterns)

For patterns that need specific structure:

```
ekkOS_Forge({
  title: "Handle race conditions in React useEffect",
  problem: "Multiple rapid state updates cause stale closures",
  solution: "Use cleanup function with cancelled flag: let cancelled = false; return () => { cancelled = true; }",
  tags: ["react", "useEffect", "race-condition", "hooks"],
  works_when: ["async operations in useEffect", "rapid re-renders"],
  anti_patterns: ["ignoring cleanup", "not checking cancelled flag"]
})
```

### Method 3: Report Outcome (After Applying Patterns)

When you apply a pattern from search, report if it worked:

```
ekkOS_Outcome({
  success: true,  // or false if it didn't work
  model_used: "claude-opus-4-5"
})
```

This helps the system learn which patterns are reliable.

## What Makes a Good Pattern

### Good Pattern Titles
- "Fix CORS errors by setting correct headers"
- "Prevent memory leaks in event listeners"
- "Handle null values in JSON parsing"

### Bad Pattern Titles
- "Fixed the bug" (too vague)
- "Solution" (no context)
- "Code change" (not descriptive)

### Good Problem Descriptions
- Specific error message or symptom
- Context where it occurred
- What was expected vs what happened

### Good Solutions
- The specific fix or approach
- Why it works (the insight)
- Any caveats or edge cases

## Forge Triggers Checklist

Ask yourself after solving anything:

- [ ] Was this non-trivial? → FORGE
- [ ] Did the user teach me something? → FORGE (they corrected me)
- [ ] Would I want to remember this? → FORGE
- [ ] Did something NOT work? → FORGE AS ANTI-PATTERN
- [ ] Is this project-specific? → FORGE with project tags
- [ ] Is this universal? → FORGE for collective layer

## Integration with Hooks

```
┌─────────────────────────────────────────────────────────────────┐
│  YOUR RESPONSE                                                   │
│  └── Include [ekkOS_LEARN] marker if you solved something       │
│           ↓                                                      │
│  STOP HOOK                                                       │
│  └── Detects marker, extracts title                             │
│  └── Calls ekkOS_Forge with problem/solution                    │
│           ↓                                                      │
│  MEMORY SUBSTRATE                                                │
│  └── Pattern saved to Layer 4                                   │
│  └── Indexed for future retrieval                               │
│           ↓                                                      │
│  NEXT SESSION                                                    │
│  └── Pattern retrieved when similar problem arises              │
└─────────────────────────────────────────────────────────────────┘
```

## Example Scenarios

### Scenario 1: Bug Fix
```
User: "My API keeps timing out"

You: *investigate*
     *find the issue*

     "The problem is connection pooling. Your pool was set to
      max 5 connections but you have 20 concurrent requests.

      Fix: Increase pool size to match expected concurrency:
      ```
      pool: { max: 25, min: 5, idle: 10000 }
      ```

      [ekkOS_LEARN] Forging: "Match connection pool size to concurrent request volume"
```

### Scenario 2: User Correction
```
User: "No, that's wrong. You should use useCallback, not useMemo"

You: "You're right, I apologize for the confusion.

      - useMemo: Memoizes a VALUE (result of computation)
      - useCallback: Memoizes a FUNCTION (prevents recreation)

      For passing callbacks to child components, useCallback is correct.

      [ekkOS_LEARN] Forging: "useCallback for functions, useMemo for values"
```

### Scenario 3: Anti-Pattern Discovery
```
User: "I tried your suggestion but it made things worse"

You: "I see what went wrong. Using synchronous file reads in the
      request handler blocks the event loop.

      This is an ANTI-PATTERN:
      ```javascript
      // DON'T DO THIS
      const data = fs.readFileSync(path);
      ```

      Instead, use async:
      ```javascript
      const data = await fs.promises.readFile(path);
      ```

      ekkOS_Forge({
        title: "Never use sync file operations in request handlers",
        problem: "Synchronous file reads block Node.js event loop",
        solution: "Always use fs.promises or callback-based async operations",
        anti_patterns: ["fs.readFileSync in handlers", "blocking I/O in async context"]
      })
```

### Scenario 4: Configuration Success
```
User: "Finally got Tailwind working with the monorepo!"

You: "Great! Let me capture that configuration for future reference.

      ekkOS_Forge({
        title: "Tailwind CSS in Turborepo monorepo setup",
        problem: "Tailwind not detecting classes across workspace packages",
        solution: "Add all workspace paths to content array: content: ['./src/**/*.{ts,tsx}', '../../packages/ui/**/*.{ts,tsx}']",
        tags: ["tailwind", "turborepo", "monorepo", "css"],
        works_when: ["monorepo with shared UI package", "Turborepo setup"]
      })

      This is now saved for next time you set up a similar project.
```

## Success Metrics

You're using this skill correctly when:
- You forge after EVERY non-trivial solution
- You capture anti-patterns when things fail
- You acknowledge user corrections as learning moments
- Your forge titles are specific and searchable
- You include both WHAT worked and WHY

## Remember

**The memory only gets smarter if you teach it.**

Every pattern you forge helps:
- Future you (in the next session)
- This user (across all their projects)
- Other users (via collective layer)

Don't be stingy with forging. If in doubt, FORGE.

---

**Mantra**: Solved it? Forge it. Broke it? Forge the anti-pattern. Learned something? Forge it.
