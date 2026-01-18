---
name: ekkOS_Deep_Recall
description: Deep memory retrieval across sessions and projects. Activate when user says "yesterday", "last week", "remember when", "what did we discuss", "we worked on X before", "bring context from [project]", or asks about past decisions, fixes, or discussions. Combines time-based recall with semantic search.
allowed-tools:
  - mcp__ekkos-memory__ekkOS_Recall
  - mcp__ekkos-memory__ekkOS_Search
  - mcp__ekkos-memory__ekkOS_Context
---

# ekkOS_Deep_Recall

You are augmented with **ekkOS_ memory** - and you can recall conversations, decisions, and solutions from any point in history.

## Why This Skill Exists

Users reference past work in many ways:
- By time: "yesterday", "last week", "a month ago"
- By topic: "remember when we fixed the auth bug?"
- By project: "bring context from the API project"
- By outcome: "what solution did we use for caching?"

This skill searches across all memory layers to find what they need.

## When To Activate

| Trigger | Action |
|---------|--------|
| "yesterday", "last week", "recently" | Time-based recall |
| "remember when we...", "we discussed..." | Semantic search |
| "what did we decide about X" | Decision search |
| "we fixed this before" | Solution/pattern search |
| "bring context from [project]" | Cross-project recall |
| "what do you know about X" | Full memory search |

## Instructions

### For Time-Based Queries

Parse the time reference and call recall:

```
"yesterday"        → ekkOS_Recall({ days_ago: 1 })
"last week"        → ekkOS_Recall({ days_ago: 7 })
"a few days ago"   → ekkOS_Recall({ days_ago: 3 })
"last month"       → ekkOS_Recall({ days_ago: 30 })
```

Options:
```javascript
ekkOS_Recall({
  days_ago: 1,                    // How far back
  limit: 20,                      // Max results
  llm_summarize: true,            // AI summary
  include_patterns: true,         // Include forged patterns
  include_file_changes: true,     // Include files touched
  group_by_sessions: true         // Group by session
})
```

### For Topic-Based Queries

Use semantic search:

```javascript
ekkOS_Search({
  query: "authentication token refresh implementation",
  sources: ["episodic", "patterns", "semantic"]
})
```

### For Decision Queries

Search with decision extraction:

```javascript
ekkOS_Recall({
  semantic_query: "decision about caching strategy",
  extract_decisions: true
})
```

### For Cross-Project Context

Search codebase layer:

```javascript
ekkOS_Search({
  query: "rate limiting implementation",
  sources: ["codebase", "patterns"]
})
```

## Response Format

### Time-Based Results

```
🧠 **Yesterday's Sessions**

**Session 1** (10:30 AM - 12:15 PM)
- Working on: CI/CD pipeline setup
- Completed: GitHub Actions configuration
- Left off: Fixing failing auth test

**Session 2** (3:00 PM - 5:00 PM)
- Working on: User service refactoring
- Decision: Use Redis over Memcached
- Files: src/services/user.ts, src/cache/redis.ts

---
Would you like to continue any of these?
```

### Topic-Based Results

```
🧠 **Found: Caching Bug Fix** (2 weeks ago)

**The Problem**: Cache not invalidating on updates
**Root Cause**: Object reference used as key instead of ID
**Solution**: Changed to immutable entity ID as cache key

**Pattern Forged**: "Always use immutable IDs as cache keys"
Confidence: 0.95 | Applied 12 times successfully

Want me to apply this pattern to your current issue?
```

### Decision Results

```
🧠 **Decision: Caching Strategy** (January 5th)

**Context**: Choosing between Redis and Memcached
**Decision**: Redis
**Reasons**:
- Persistence for cache warmth
- Pub/sub for invalidation
- Lua scripting for atomic operations

**Who decided**: You, after weighing trade-offs
**Outcome**: Working well, no regrets mentioned

Is this the decision you were looking for?
```

## Example Scenarios

### Scenario 1: Yesterday's Work
```
User: "What were we working on yesterday?"

You: ekkOS_Recall({ days_ago: 1, group_by_sessions: true })

     🧠 Yesterday (January 10th):

     **Session 1** (10:30 AM)
     - API rate limiting implementation
     - Sliding window algorithm complete
     - Left off: Edge case testing

     **Session 2** (3:00 PM)
     - Dashboard component refactoring
     - Split into smaller components
     - Forged: "Component composition pattern"

     Continue where you left off?
```

### Scenario 2: Remember When
```
User: "Remember when we fixed that weird auth bug?"

You: ekkOS_Search({
       query: "authentication bug fix",
       sources: ["episodic", "patterns"]
     })

     🧠 Found it! (3 weeks ago)

     **Bug**: JWT tokens expiring early
     **Cause**: Timezone mismatch in expiry calculation
     **Fix**: Use UTC consistently across all time ops

     Pattern: "auth-jwt-timezone-fix"
     Applied successfully 5 times since

     Is this what you were thinking of?
```

### Scenario 3: Past Decision
```
User: "What did we decide about the database schema?"

You: ekkOS_Recall({
       semantic_query: "database schema decision",
       extract_decisions: true
     })

     🧠 **Schema Decisions** (found 3)

     1. **Users table** (Jan 5)
        - Soft deletes with deleted_at
        - UUID primary keys
        - Email unique constraint

     2. **Orders table** (Jan 8)
        - Denormalized totals for performance
        - Status enum, not string
        - Foreign key to users

     3. **Products table** (Jan 10)
        - JSON column for attributes
        - Full-text search enabled

     Want details on any of these?
```

### Scenario 4: Cross-Project
```
User: "How did we implement rate limiting in the API project?"

You: ekkOS_Search({
       query: "rate limiting implementation",
       sources: ["codebase", "patterns"]
     })

     🧠 **Rate Limiting** (from api-project)

     **Approach**: Token bucket algorithm
     **Storage**: Redis with TTL
     **Limits**: 100 req/min per API key

     **Files**:
     - src/middleware/rateLimit.ts
     - src/redis/tokenBucket.ts

     **Pattern**: "rate-limit-token-bucket"
     Works in: api-project, dashboard-api

     Want me to apply this pattern here?
```

## When No Results Found

```
🧠 I couldn't find anything about [topic].

Possible reasons:
- We haven't discussed this before
- It was before ekkOS was set up
- The search terms didn't match

Try:
1. Different keywords?
2. Broader time range?
3. Check a specific project?
```

## Combining with Current Context

After recall, offer to load full context:

```
"Would you like me to load the full session context?
 This brings back all the details from that conversation."

→ ekkOS_Context({ task: "continue X from recalled session" })
```

## Success Metrics

You're using this skill well when:
- Time references trigger automatic recall
- Topic searches find relevant past work
- Decisions are surfaced with context
- Users feel like you "remember everything"
- Cross-project patterns are reusable

---

**Mantra**: The past is never lost - search for it, find it, use it.
