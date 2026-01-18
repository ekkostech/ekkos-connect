---
name: ekkOS_Summary
description: Show what ekkOS learned and did. Activate when the user asks "what did you learn", "show me my patterns", "ekkOS status", "memory summary", or wants to understand what the memory system captured. This skill provides transparency about memory operations.
allowed-tools:
  - mcp__ekkos-memory__ekkOS_Summary
  - mcp__ekkos-memory__ekkOS_Stats
  - mcp__ekkos-memory__ekkOS_Search
  - mcp__ekkos-memory__ekkOS_Plans
---

# ekkOS_Summary

You are augmented with **ekkOS_ memory** - and you can show users exactly what the memory system has learned and done.

## Why This Skill Exists

Transparency builds trust:
- Users should know what's being remembered
- Pattern counts and success rates matter
- Session activity should be visible

This skill provides insight into ekkOS operations.

## When To Activate

This skill should trigger when:

| Trigger | Example |
|---------|---------|
| "What did you learn?" | Wants to see forged patterns |
| "Show my patterns" | Wants pattern list |
| "ekkOS status" | System health check |
| "Memory summary" | Overview request |
| "What did ekkOS do?" | Activity review |
| End of session | Natural summary point |

## Instructions

### Session Summary

```
ekkOS_Summary({
  time_window_seconds: 300  // Last 5 minutes
})
```

Response:
```json
{
  "session_activity": {
    "searches": 5,
    "patterns_retrieved": 12,
    "patterns_applied": 4,
    "patterns_forged": 2,
    "directives_created": 1
  },
  "recent_events": [
    {"type": "search", "query": "auth error", "results": 3},
    {"type": "forge", "title": "JWT clock tolerance fix"},
    {"type": "apply", "pattern": "Error handling middleware"}
  ]
}
```

### Memory Statistics

```
ekkOS_Stats({
  scope: "personal"  // or "collective" or "both"
})
```

Response:
```json
{
  "personal": {
    "patterns": 127,
    "directives": 23,
    "episodes": 489,
    "avg_success_rate": 0.82
  },
  "collective": {
    "patterns": 5420,
    "avg_success_rate": 0.78
  }
}
```

## Example Scenarios

### Scenario 1: Session Summary
```
User: "What did ekkOS do this session?"

You: ekkOS_Summary({ time_window_seconds: 3600 })

     "🧠 ekkOS Session Summary (last hour):

      📊 Activity:
      ├── Searches: 8 queries
      ├── Patterns retrieved: 15
      ├── Patterns applied: 6
      └── Patterns forged: 3

      ✨ New patterns created:
      1. 'Fix CORS with credentials mode'
      2. 'Supabase RLS policy syntax'
      3. 'React useEffect cleanup pattern'

      📋 Directives added:
      1. [PREFER] Use arrow functions

      🎯 Golden Loop compliance: 94%

      Your memory is growing!"
```

### Scenario 2: Overall Statistics
```
User: "How's my ekkOS memory doing?"

You: ekkOS_Stats({ scope: "both" })

     "🧠 ekkOS Memory Statistics:

      📚 Your Personal Memory:
      ├── Patterns: 127 total
      ├── Success rate: 82%
      ├── Directives: 23 active
      ├── Episodes: 489 conversations
      └── Most used: 'Error handling' (45 applications)

      🌐 Collective Memory:
      ├── Total patterns: 5,420
      ├── Your contributions: 127
      └── Top category: API Integration

      📈 Growth:
      ├── This week: +12 patterns
      ├── This month: +47 patterns
      └── Trend: ↑ 15% more than last month

      You're in the top 10% of ekkOS contributors!"
```

### Scenario 3: What Did You Learn?
```
User: "What patterns did you learn from our conversation?"

You: ekkOS_Search({
       query: "session:" + session_id,
       sources: ["patterns"]
     })

     "🧠 Patterns learned this session:

      1. **Fix timezone issues in date comparison**
         Problem: Dates compared without timezone normalization
         Solution: Always convert to UTC before comparison
         Confidence: 85%

      2. **Supabase real-time subscription cleanup**
         Problem: Memory leak from unsubscribed channels
         Solution: Store subscription and call unsubscribe in useEffect cleanup
         Confidence: 90%

      3. **Anti-pattern: Don't use .env in client code**
         Problem: Tried to read .env directly in React
         Solution: Use NEXT_PUBLIC_ prefix or server-side only
         Type: Anti-pattern (learned from mistake)

      These will help in future sessions!"
```

### Scenario 4: Plan Status
```
User: "What am I working on?"

You: ekkOS_Plans({ status: "in_progress" })

     ekkOS_Summary({ time_window_seconds: 86400 })

     "🧠 Current State:

      📋 Active Plans:
      1. **API Refactoring** [5/8 steps]
         Current: Creating service interfaces
         Next: Add dependency injection

      2. **Auth System** [2/6 steps]
         Current: Implementing registration
         Blocked: Waiting for email service

      📊 Today's Progress:
      ├── Completed 3 plan steps
      ├── Forged 2 new patterns
      └── Applied 8 existing patterns

      Resume API Refactoring?"
```

### Scenario 5: Memory Health Check
```
User: "Is ekkOS working properly?"

You: ekkOS_Stats({})

     "🧠 ekkOS Health Check:

      ✅ API Connection: Healthy
      ✅ Pattern Layer: 127 patterns indexed
      ✅ Directive Layer: 23 active rules
      ✅ Episode Layer: 489 conversations stored
      ✅ Context Guardian: Active

      📊 Performance:
      ├── Average search time: 120ms
      ├── Pattern retrieval rate: 94%
      └── Golden Loop compliance: 91%

      ⚠️ Suggestions:
      ├── 5 patterns have <50% success rate
      └── Consider reviewing/updating these

      Overall: System healthy! 🟢"
```

## Display Formats

### Compact Summary
```
🧠 ekkOS: 127 patterns | 23 directives | 82% success rate
```

### Detailed Summary
```
🧠 ekkOS Memory Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Patterns:    127 total, 82% success rate
Directives:  23 active (12 MUST, 8 NEVER, 3 PREFER)
Episodes:    489 conversations indexed
Plans:       2 in progress, 15 completed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Success Metrics

You're using this skill correctly when:
- Users understand what ekkOS is doing
- Statistics are presented clearly
- Session activity is transparent
- Users trust the memory system
- Summaries are useful, not overwhelming

---

**Mantra**: Show the work. Users should see what ekkOS learns.
