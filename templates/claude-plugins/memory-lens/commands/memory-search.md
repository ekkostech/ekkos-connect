# Memory Search

Search your ekkOS memory to see what patterns and solutions exist for your problem.

## Overview

Before solving any problem, use this command to check if ekkOS already knows the solution. This is the **RETRIEVE** phase of the Golden Loop - searching your memory substrate for relevant patterns.

## What it does

1. **Searches all 11 layers** of your ekkOS memory
2. **Finds relevant patterns** matching your query
3. **Shows past solutions** that worked
4. **Highlights success rates** for each pattern
5. **Explains WHY** each pattern was retrieved
6. **User-friendly display** - no overwhelming technical details

## Usage

```bash
# Search for solutions
/memory-search "authentication error"
/memory-search "TypeScript type narrowing"
/memory-search "API timeout handling"

# Quick search (uses recent conversation context)
/memory-search
```

## Example Output

```
🔍 Memory Search Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Query: "authentication error JWT expired"

Found 3 relevant patterns in your memory:

───────────────────────────────────────────────────────────────────
Pattern #1: Fix JWT expired errors in auth middleware
Success Rate: 95% (used 12 times)
Last Used: 2 days ago

Problem:
  Auth middleware throwing "JWT expired" even with valid tokens
  due to clock skew between server and client.

Solution:
  Add 30-second grace period to JWT validation:

  ```typescript
  jwt.verify(token, secret, {
    clockTolerance: 30  // Allow 30s clock skew
  });
  ```

Why This Matches:
  • You mentioned "JWT" and "expired"
  • This pattern solved similar auth issues
  • High success rate suggests it's reliable

───────────────────────────────────────────────────────────────────
Pattern #2: Refresh token before expiry
Success Rate: 88% (used 8 times)
Last Used: 1 week ago

Problem:
  Users getting logged out unexpectedly when JWT expires.

Solution:
  Implement automatic token refresh 5 minutes before expiry...

Why This Matches:
  • Related to JWT expiration handling
  • Complementary to Pattern #1

───────────────────────────────────────────────────────────────────
Pattern #3: Handle auth errors gracefully
Success Rate: 92% (used 15 times)
Last Used: 3 days ago

Problem:
  Auth errors showing ugly stack traces to users.

Solution:
  Catch auth errors and redirect to login...

Why This Matches:
  • General authentication error handling
  • Applies to your "authentication error" query

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💡 Recommendations:

  1. Try Pattern #1 first (highest success rate)
  2. If that doesn't work, combine with Pattern #2
  3. Always implement Pattern #3 for better UX

  Once you apply a solution, I'll automatically track if it worked!

🔄 Golden Loop Status:
  ✅ RETRIEVE - Found 3 patterns
  ⏸️  APPLY - Waiting for you to try a solution
  ⏸️  MEASURE - Will track if solution works
  ⏸️  LEARN - Will update pattern success rates

Use /forge if you discover a NEW solution not in these patterns!
```

## No Results Example

```
🔍 Memory Search Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Query: "rare database edge case issue"

Found 0 patterns in your memory.

This is a NEW problem! 🎉

Here's what happens next:

  1. Solve the problem (experiment, search docs, etc.)
  2. Once you find a solution, use `/forge` to capture it
  3. Next time you encounter this, ekkOS will remember!

This is how your memory grows - every solved problem becomes
a pattern for future reference.

🔄 Golden Loop Status:
  ⚠️  RETRIEVE - No patterns found (new problem)
  💡 SOLVE - Work on solution (you're on your own this time!)
  ⚒️  FORGE - Use /forge once you solve it
  ✅ NEXT TIME - Pattern will be retrieved automatically

The Golden Loop is waiting for you to forge this solution!
```

## Requirements

- ekkOS MCP server configured (via ekkos-connect)
- Active ekkOS account
- Some patterns already forged (or this will show "no results")

## Advanced Options

```bash
# Search specific layers
/memory-search --patterns-only "bug fix"
/memory-search --directives-only

# Search by tags
/memory-search --tags "typescript,api"

# Show low-success patterns too
/memory-search --include-low-success "error handling"
```

## Implementation Details

When this command runs, Claude will:

1. Extract query from command or recent conversation
2. Call `ekkOS_Search({query, sources: ["all"], limit: 10})`
3. Format results in user-friendly way:
   - Pattern title (clear, non-technical)
   - Success rate + usage count
   - Last used date
   - Problem/Solution in plain language
   - "Why This Matches" explanation
4. Group patterns by relevance (best matches first)
5. Show Golden Loop status
6. Suggest next steps:
   - Try pattern X first
   - Use `/forge` if new solution
   - Use `/loop-check` if issues

This command helps users understand what ekkOS knows and how to use it effectively.
