# My Patterns

Personal dashboard showing what ekkOS has learned from you - your patterns, success rates, and growth over time.

## Overview

See your learning journey! This command shows all the patterns you've forged, which ones are helping most, and how your ekkOS memory is growing.

**This is your personal knowledge base dashboard.**

## What it does

1. **Lists YOUR patterns** - Everything you've forged
2. **Shows success rates** - Which patterns actually help
3. **Tracks usage** - How often patterns are applied
4. **Highlights top performers** - Your most valuable patterns
5. **Identifies stale patterns** - Unused for 30+ days
6. **Growth metrics** - How your memory is expanding

## Usage

```bash
# Show all your patterns
/my-patterns

# Show only successful patterns
/my-patterns --successful

# Show patterns by category
/my-patterns --category typescript

# Show recent patterns only
/my-patterns --recent
```

## Example Output

```
📊 Your ekkOS Learning Dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👤 User: @yourname
📅 Member Since: 3 months ago
🧠 Memory Health: 85/100 (Excellent)

───────────────────────────────────────────────────────────────────
📈 Growth Overview

Total Patterns Forged: 42
├─ Solutions: 35 (83%)
├─ Anti-patterns: 7 (17%)
└─ Average Success Rate: 84%

This Month:
  • 8 new patterns forged
  • 156 pattern retrievals
  • 131 successful applications (84% success)

All-Time Golden Loop:
  ✅ RETRIEVE: 1,234 times
  ✅ APPLY: 1,041 times (84% application rate)
  ✅ MEASURE: 876 outcomes tracked
  ✅ LEARN: 42 patterns forged

───────────────────────────────────────────────────────────────────
🏆 Top Performing Patterns

1. ⭐⭐⭐⭐⭐ Fix undefined map errors with optional chaining
   Success: 98% (41/42 uses) | Last Used: Today
   Category: TypeScript, Arrays
   Impact: Prevented 41 runtime errors!

2. ⭐⭐⭐⭐⭐ API timeout retry with exponential backoff
   Success: 95% (38/40 uses) | Last Used: 2 days ago
   Category: API, Error Handling
   Impact: Saved 38 failed requests!

3. ⭐⭐⭐⭐☆ Handle promise rejection in async/await
   Success: 92% (23/25 uses) | Last Used: 1 week ago
   Category: JavaScript, Async
   Impact: Prevented 23 unhandled rejections!

4. ⭐⭐⭐⭐☆ Validate user input before database insert
   Success: 88% (15/17 uses) | Last Used: 3 days ago
   Category: Security, Database
   Impact: Blocked 15 potential SQL injections!

5. ⭐⭐⭐⭐☆ Cache API responses for 5 minutes
   Success: 90% (18/20 uses) | Last Used: Today
   Category: Performance, API
   Impact: Reduced 18 redundant API calls!

───────────────────────────────────────────────────────────────────
📚 All Your Patterns (Sorted by Category)

🔷 TypeScript (12 patterns)
   • Fix undefined map errors - 98% success
   • Type narrowing with discriminated unions - 95% success
   • Generic type constraints - 92% success
   • ❌ Don't use 'any' type - Anti-pattern
   [+8 more...]

🔷 API & Backend (8 patterns)
   • Timeout retry with exponential backoff - 95% success
   • Cache responses for 5 minutes - 90% success
   • Rate limit with sliding window - 85% success
   [+5 more...]

🔷 React & Frontend (7 patterns)
   • Memoize expensive computations - 93% success
   • useEffect dependency array pitfalls - 88% success
   [+5 more...]

🔷 Database (5 patterns)
   • Validate input before insert - 88% success
   • Use transactions for multi-step operations - 94% success
   [+3 more...]

🔷 Error Handling (6 patterns)
   • Handle promise rejections - 92% success
   • Try/catch in async functions - 90% success
   [+4 more...]

🔷 Security (4 patterns)
   • Sanitize user input - 96% success
   • ❌ Don't store passwords in plaintext - Anti-pattern
   [+2 more...]

───────────────────────────────────────────────────────────────────
⚠️  Patterns Needing Attention

Low Success Rate (< 70%):
  • "Fix webpack build errors" - 45% success (5/11 uses)
    → This pattern might need updating or more specific conditions

Stale (Not Used in 30+ Days):
  • "Legacy browser polyfill" - Last used: 42 days ago
    → Consider archiving if no longer relevant

Never Applied:
  • "Redis connection pooling" - Forged 2 months ago, never used
    → Did you solve this problem differently?

───────────────────────────────────────────────────────────────────
🎯 Your Learning Stats

Forging Habits:
  • Average time to forge after solving: 2 hours ⏱️
  • Most active forging day: Friday
  • Forging streak: 5 days 🔥

Pattern Quality:
  • Patterns with examples: 38/42 (90%) ✅
  • Patterns with anti-patterns: 7/42 (17%) 📚
  • Patterns with "works when": 35/42 (83%) 🎯

Contribution to Collective:
  • Your patterns promoted to collective: 8
  • Other users helped by your patterns: 23 developers
  • Collective impact: 156 successful applications 🌍

───────────────────────────────────────────────────────────────────
💡 Recommendations

Based on your patterns and usage:

  1. 🎉 Great job! Your forging discipline is excellent
     → Keep capturing solutions as you solve problems

  2. ⚡ Consider updating "Fix webpack build errors"
     → 45% success rate suggests it needs refinement
     → Use /forge to update with better solution

  3. 🗂️  Archive 3 stale patterns that haven't been used
     → Keeps your memory focused and relevant

  4. 🌟 5 of your patterns are helping other developers!
     → Consider promoting more to collective memory

───────────────────────────────────────────────────────────────────
🔗 Quick Actions

  • View specific pattern: /memory-search <pattern-title>
  • Update low-success pattern: /forge --update pat_abc123
  • Archive stale patterns: /my-patterns --archive-stale
  • Export all patterns: ekkOS_Export (via MCP)
  • Promote to collective: (requires Pro tier)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your ekkOS memory is thriving! 🌱→🌳

You've forged 42 patterns, helped solve 1,041 problems, and
prevented countless repeated mistakes. Keep learning and forging!

Want to see how ekkOS is working for you? Try /loop-status
```

## Compact View Example

```
/my-patterns --compact

📊 Your Patterns (42 total)

Top 5 by Success:
  1. ⭐ 98% - Fix undefined map errors (41 uses)
  2. ⭐ 95% - API timeout retry (38 uses)
  3. ⭐ 92% - Handle promise rejection (23 uses)
  4. ⭐ 90% - Cache API responses (18 uses)
  5. ⭐ 88% - Validate user input (15 uses)

Recent (Last 7 Days):
  • TypeScript type narrowing (forged 2 days ago)
  • React useCallback optimization (forged 5 days ago)

Needs Attention:
  ⚠️  1 low-success pattern
  ⏰ 3 stale patterns (30+ days)

Overall Health: 85/100 (Excellent)
```

## Category Filter Example

```
/my-patterns --category typescript

📊 TypeScript Patterns (12 total)

🔷 All TypeScript Patterns:

1. ⭐⭐⭐⭐⭐ Fix undefined map errors
   Success: 98% | Used: 41 times | Last: Today

2. ⭐⭐⭐⭐⭐ Type narrowing with discriminated unions
   Success: 95% | Used: 28 times | Last: 3 days ago

3. ⭐⭐⭐⭐☆ Generic type constraints
   Success: 92% | Used: 19 times | Last: 1 week ago

[... 9 more patterns ...]

Average Success Rate: 91% (Excellent!)
Total Applications: 234
```

## Requirements

- ekkOS MCP server configured
- At least 1 pattern forged (otherwise shows empty state)
- Optional: Pro tier for collective metrics

## Implementation Details

When this command runs, Claude will:

1. Call `ekkOS_Stats({scope: "personal"})` to get user's pattern count
2. Call `ekkOS_Search({query: "*", sources: ["patterns"], user_only: true})` to list all user patterns
3. Sort patterns by:
   - Success rate (default)
   - Last used date (--recent)
   - Category (--category)
   - Usage count (--popular)
4. Calculate metrics:
   - Total patterns forged
   - Average success rate
   - Golden Loop completion stats
   - Growth over time
5. Identify issues:
   - Patterns with < 70% success
   - Patterns unused for 30+ days
   - Patterns never applied
6. Format into user-friendly dashboard:
   - Visual indicators (stars, emojis)
   - Color-coded success rates
   - Clear categorization
   - Actionable recommendations

This command helps users understand their learning journey and maintain a healthy pattern library.

**Your patterns = Your superpower** 🦸
