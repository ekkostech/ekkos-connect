---
name: ekkOS_Reflect
description: Analyze response quality and learn from it. Activate after completing complex tasks, when the user provides feedback on your response, when you could have done something better, or when you want to improve pattern quality. This skill helps the memory system get smarter by evaluating what worked and what didn't.
allowed-tools:
  - mcp__ekkos-memory__ekkOS_Reflect
  - mcp__ekkos-memory__ekkOS_Outcome
  - mcp__ekkos-memory__ekkOS_Forge
  - mcp__ekkos-memory__ekkOS_Search
---

# ekkOS_Reflect

You are augmented with **ekkOS_ memory** - and you can analyze your own responses to improve future performance.

## Why This Skill Exists

The memory system only improves if we close the feedback loop:
- Did that pattern actually help?
- Could the response have been better?
- What should be remembered for next time?

This skill enables self-improvement.

## When To Activate

This skill should trigger when:

| Trigger | Example |
|---------|---------|
| Complex task completed | Finished multi-step implementation |
| User provides feedback | "That's not quite right", "Perfect!" |
| You sense improvement opportunity | "I could have done this better" |
| Pattern was applied | Need to record if it worked |
| User corrects you | Learn from the correction |
| After difficult debugging | What was the key insight? |

## Instructions

### Step 1: Analyze the Response

```
ekkOS_Reflect({
  user_query: "Original user question",
  response: "Your complete response",
  context: {
    patterns_used: 3,
    session_id: "...",
    model: "claude-opus-4-5"
  }
})
```

Response:
```json
{
  "quality_score": 8.5,
  "improvement_opportunities": [
    "Could have included error handling example",
    "Solution was correct but verbose"
  ],
  "pattern_suggestions": [
    {
      "title": "Concise error handling patterns",
      "reason": "Response could be more concise"
    }
  ],
  "positive_aspects": [
    "Correct solution",
    "Good explanation of trade-offs"
  ]
}
```

### Step 2: Record Outcomes

For each pattern that was applied:

```
ekkOS_Outcome({
  success: true,  // or false
  model_used: "claude-opus-4-5"
})
```

This updates the pattern's success rate.

### Step 3: Forge Improvements

If reflection reveals a better approach:

```
ekkOS_Forge({
  title: "Concise error handling in async functions",
  problem: "Error handling code is often verbose and repetitive",
  solution: "Use wrapper function: const safe = (fn) => async (...args) => { try { return await fn(...args); } catch (e) { handleError(e); } }",
  tags: ["improvement", "reflection", "error-handling"]
})
```

## Example Scenarios

### Scenario 1: User Feedback - Positive
```
User: "Perfect, that's exactly what I needed!"

You: *Reflect on what made it good*

     ekkOS_Outcome({ success: true })

     ekkOS_Reflect({
       response: "...",
       user_query: "..."
     })

     Analysis: Pattern #auth-jwt-123 was applied, user confirmed success.

     "Glad it helped! I've recorded that this approach works well.
      It'll be even faster to help with similar issues next time."
```

### Scenario 2: User Feedback - Needs Improvement
```
User: "This works but it's way too complicated"

You: *Reflect on the complexity issue*

     ekkOS_Outcome({ success: false })  // Partially failed

     ekkOS_Reflect({
       response: "...",
       user_query: "..."
     })

     Analysis: Solution was correct but overly complex.

     "You're right, let me simplify:

      [Simpler solution]

      I've noted that simpler solutions are preferred.

      ekkOS_Forge({
        title: 'Prefer simple solutions over comprehensive ones',
        problem: 'Tendency to over-engineer solutions',
        solution: 'Start with minimal implementation, add complexity only when needed',
        tags: ['meta', 'style', 'simplicity']
      })

      This preference is now saved."
```

### Scenario 3: Post-Task Reflection
```
*After completing a complex debugging session*

You: "Let me reflect on this debugging session...

      ekkOS_Reflect({
        response: 'Full debugging process and solution',
        user_query: 'Original bug report'
      })

      📊 Session Analysis:

      ✅ What worked:
      - Systematic elimination of causes
      - Using git bisect to find regression
      - Checking logs before guessing

      ⚠️ Could improve:
      - Took 3 attempts before checking logs
      - Should have reproduced issue first

      💡 Key insight to remember:
      'Always reproduce the bug in isolation first'

      ekkOS_Forge({
        title: 'Reproduce bug before debugging',
        problem: 'Jumping into debugging without reproduction wastes time',
        solution: 'First step: create minimal reproduction case',
        tags: ['debugging', 'methodology', 'reflection']
      })

      This insight is now saved for future debugging sessions."
```

### Scenario 4: Pattern Quality Check
```
*After applying a pattern that didn't work*

You: *Pattern #db-query-123 was applied but query failed*

     ekkOS_Outcome({ success: false })

     "That pattern didn't work for this case. Let me update it...

      ekkOS_Search({
        query: 'db-query-123',
        sources: ['patterns']
      })

      Found: 'Use LIMIT for pagination'
      Current success rate: 85%

      The pattern is generally good but doesn't handle
      offset-based pagination with large tables.

      ekkOS_Forge({
        title: 'Use cursor-based pagination for large tables',
        problem: 'OFFSET pagination slows down on large datasets',
        solution: 'Use WHERE id > last_id ORDER BY id LIMIT n',
        works_when: ['table > 100k rows', 'pagination needed'],
        anti_patterns: ['Using OFFSET with large datasets']
      })

      Added a more specific pattern for this case."
```

## Reflection Questions

Ask yourself after responses:

1. **Did the applied patterns help?**
   - Yes → `ekkOS_Outcome({ success: true })`
   - No → `ekkOS_Outcome({ success: false })`

2. **Was the response quality good?**
   - Run `ekkOS_Reflect` to analyze

3. **What would I do differently?**
   - Forge the improvement as a new pattern

4. **Did I learn something new?**
   - Forge it immediately

## Integration with Learning

Reflection feeds back into the Golden Loop:

```
Response → Reflect → Improve Patterns → Better Future Responses
    ↑                                            ↓
    └────────────────────────────────────────────┘
```

## Success Metrics

You're using this skill correctly when:
- Pattern success rates are accurate
- Improvements are forged after corrections
- Response quality increases over time
- You proactively reflect, not just when asked
- The memory system gets demonstrably smarter

---

**Mantra**: Every response is a learning opportunity. Reflect. Record. Improve.
