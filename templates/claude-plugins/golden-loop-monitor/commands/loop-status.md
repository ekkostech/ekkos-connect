# Loop Status

Monitor and troubleshoot the Golden Loop to ensure ekkOS is working correctly for your codebase.

## Overview

The **Golden Loop** is the heart of ekkOS:

```
RETRIEVE → APPLY → MEASURE → LEARN
    ↑                           ↓
    └───────────────────────────┘
```

This command shows you:
- ✅ Is the loop working?
- ⚠️ Where is it breaking?
- 🔧 How to fix issues

## What it does

1. **Tests each loop phase** - RETRIEVE, APPLY, MEASURE, LEARN
2. **Shows recent activity** - What happened in last session
3. **Identifies bottlenecks** - Where the loop is stuck
4. **Diagnoses issues** - Why patterns aren't being retrieved/applied
5. **Provides fixes** - Actionable steps to resolve problems
6. **Real-time health check** - Is ekkOS MCP responding?

## Usage

```bash
# Check Golden Loop status
/loop-status

# Detailed diagnostic
/loop-status --detailed

# Test a specific phase
/loop-status --test-retrieve
/loop-status --test-forge

# Show last session activity
/loop-status --last-session
```

## Example - Healthy Loop

```
🔄 Golden Loop Status Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Overall Status: ✅ HEALTHY

All phases operational. Your ekkOS memory is working perfectly!

───────────────────────────────────────────────────────────────────
📊 Loop Phases

1. ✅ RETRIEVE (Pattern Search)
   Status: Working
   Last Activity: 2 minutes ago
   Recent: Retrieved 3 patterns for "auth error"
   Performance: 95ms avg response time
   Success Rate: 89% (patterns found when relevant)

2. ✅ APPLY (Pattern Usage)
   Status: Working
   Last Activity: 5 minutes ago
   Recent: Applied pattern "Fix JWT expiration"
   Application Rate: 84% (patterns actually used)
   User Engagement: Excellent

3. ✅ MEASURE (Outcome Tracking)
   Status: Working
   Last Activity: 10 minutes ago
   Recent: Tracked success for "Fix JWT expiration"
   Tracking Rate: 72% (outcomes recorded)
   Note: Could be improved - see recommendations

4. ✅ LEARN (Pattern Forging)
   Status: Working
   Last Activity: 1 hour ago
   Recent: Forged "Handle API timeout"
   Forging Rate: 45% (solutions captured)
   Note: Good, but could forge more often

───────────────────────────────────────────────────────────────────
📈 Recent Activity (Last Hour)

🔍 RETRIEVE Events:
  • 10:15 AM - Searched for "database connection error" → 2 patterns
  • 10:32 AM - Searched for "react useEffect dependency" → 4 patterns
  • 10:45 AM - Searched for "typescript generic types" → 1 pattern

✅ APPLY Events:
  • 10:17 AM - Applied "Fix DB connection pool exhaustion" (success)
  • 10:48 AM - Applied "Generic type constraints" (pending outcome)

📊 MEASURE Events:
  • 10:25 AM - Marked "Fix DB connection" as successful
  • Pattern success rate updated: 92% → 93%

⚒️  LEARN Events:
  • 11:02 AM - Forged "Handle API timeout with retry"
  • Total patterns: 41 → 42

───────────────────────────────────────────────────────────────────
🎯 Performance Metrics

Golden Loop Efficiency: 76% (Good)
├─ RETRIEVE → APPLY: 84% (patterns get used)
├─ APPLY → MEASURE: 72% (outcomes tracked)
└─ MEASURE → LEARN: 45% (new patterns forged)

Bottleneck Analysis:
  • MEASURE phase could be better (72%)
    → Some patterns applied but outcomes not tracked
    → This is OK - not all applications need tracking

  • LEARN phase is moderate (45%)
    → You're forging patterns, but could capture more
    → Try using /forge after solving problems

Total Loop Cycles Completed: 18 (since last week)
Average Cycle Time: 2.5 hours (problem → solution → pattern)

───────────────────────────────────────────────────────────────────
✅ Health Checks

MCP Connection: ✅ Responding (52ms ping)
Authentication: ✅ Valid token
Pattern Storage: ✅ 42 patterns accessible
Hook Integration: ✅ Auto-injection working
API Rate Limit: ✅ 847/1000 requests remaining today

───────────────────────────────────────────────────────────────────
💡 Recommendations

1. 🎉 Great job! Your Golden Loop is healthy
   → ekkOS is working as designed

2. ⚒️  Try forging more patterns
   → 45% capture rate is decent, aim for 60%+
   → Use /forge after solving problems

3. 📊 Outcome tracking is good
   → 72% of applications measured
   → This helps patterns improve over time

Keep using ekkOS and your memory will continue to grow! 🌱
```

## Example - Loop Issues Detected

```
🔄 Golden Loop Status Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Overall Status: ⚠️  ISSUES DETECTED

Some phases aren't working correctly. Let's fix them!

───────────────────────────────────────────────────────────────────
📊 Loop Phases

1. ⚠️  RETRIEVE (Pattern Search)
   Status: Degraded
   Last Activity: Never
   Problem: No patterns being retrieved
   Recent: 0 retrievals in last 24 hours

   🔧 Diagnosis:
      • Hooks may not be configured
      • MCP server might not be running
      • No patterns in memory yet (brand new user?)

   ✅ Fixes:
      1. Check MCP config: cat ~/.claude/claude_desktop_config.json
      2. Verify ekkos-connect is authenticated
      3. Test manual search: /memory-search "test"
      4. If brand new, forge your first pattern: /forge

2. ⚠️  APPLY (Pattern Usage)
   Status: Low Activity
   Last Activity: 3 days ago
   Problem: Patterns retrieved but not applied
   Application Rate: 12% (very low)

   🔧 Diagnosis:
      • Patterns might not be relevant
      • User not following pattern suggestions
      • Pattern quality issues

   ✅ Fixes:
      1. Check pattern relevance: /my-patterns
      2. Update low-quality patterns: /forge --update
      3. Remove stale patterns: /my-patterns --archive-stale

3. ❌ MEASURE (Outcome Tracking)
   Status: Broken
   Last Activity: Never
   Problem: No outcomes being tracked
   Tracking Rate: 0%

   🔧 Diagnosis:
      • Post-tool-use hook not configured
      • ekkOS_Outcome never called
      • Pattern applications not being detected

   ✅ Fixes:
      1. Check hooks: ls ~/.claude/hooks/
      2. Reinstall hooks: "ekkOS: Setup Global Hooks"
      3. Manual outcome: Call ekkOS_Outcome after applying pattern

4. ❌ LEARN (Pattern Forging)
   Status: Not Happening
   Last Activity: Never
   Problem: No patterns forged yet
   Forging Rate: 0%

   🔧 Diagnosis:
      • User hasn't forged any patterns
      • New ekkOS user
      • Don't know how to forge

   ✅ Fixes:
      1. Forge your first pattern: /forge
      2. Read forging guide: /forge --help
      3. Pattern Coach will guide you interactively

───────────────────────────────────────────────────────────────────
🚨 Critical Issues

Issue #1: MCP Server Not Responding
  Severity: Critical
  Impact: ekkOS cannot function without MCP
  Fix:
    1. Check if ekkos-connect is installed
    2. Run: "ekkOS: Connect Account"
    3. Verify auth: cat ~/.ekkos/config.json
    4. Test connection: /loop-status --test-connection

Issue #2: No Patterns Forged
  Severity: High
  Impact: Nothing to retrieve = loop can't start
  Fix:
    1. Forge your first pattern: /forge
    2. This kickstarts the Golden Loop
    3. After first pattern, auto-retrieval begins

Issue #3: Hooks Not Configured
  Severity: Medium
  Impact: Auto-injection won't work
  Fix:
    1. Run: "ekkOS: Setup Global Hooks"
    2. Restart Claude Code
    3. Test: Hooks should inject patterns automatically

───────────────────────────────────────────────────────────────────
🔧 Quick Fix Checklist

Run these commands in order:

[ ] 1. Verify ekkos-connect installed
       → Check VS Code extensions

[ ] 2. Authenticate with ekkOS
       → Command: "ekkOS: Connect Account"

[ ] 3. Setup hooks globally
       → Command: "ekkOS: Setup Global Hooks"

[ ] 4. Forge your first pattern
       → Command: /forge

[ ] 5. Test retrieval
       → Command: /memory-search "test"

[ ] 6. Rerun this check
       → Command: /loop-status

───────────────────────────────────────────────────────────────────
📞 Need Help?

If issues persist:

  • Documentation: https://docs.ekkos.dev/troubleshooting
  • Discord: https://discord.gg/ekkos
  • Email: support@ekkos.dev

Include this status output when asking for help!
```

## Example - Bottleneck Identified

```
🔄 Golden Loop Status Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Overall Status: ⚠️  BOTTLENECK DETECTED

The loop is working, but there's a bottleneck in the LEARN phase.

───────────────────────────────────────────────────────────────────
📊 Loop Phases

1. ✅ RETRIEVE: 95% healthy
2. ✅ APPLY: 88% healthy
3. ✅ MEASURE: 78% healthy
4. ⚠️  LEARN: 15% healthy ← BOTTLENECK

───────────────────────────────────────────────────────────────────
🔍 Bottleneck Analysis

Problem: Low Forging Rate (15%)

You're solving problems and applying patterns, but not capturing
new solutions. This means:

  • ❌ Repeated problem-solving (no memory of solutions)
  • ❌ Patterns not growing with your experience
  • ❌ Golden Loop incomplete (doesn't close)

Impact:
  • You've solved 47 problems in the last week
  • Only forged 7 patterns (15% capture rate)
  • 40 solutions LOST (not remembered!)

What You're Missing:
  • Those 40 solutions could save you hours next time
  • Other developers could benefit from your solutions
  • Your ekkOS memory is growing SLOWLY

───────────────────────────────────────────────────────────────────
✅ How to Fix: Forge More Often

Build a habit:

  1. After solving ANY problem → /forge
  2. After fixing ANY bug → /forge
  3. After user corrects you → /forge
  4. After discovering gotcha → /forge failure

Make it automatic:

  • Set reminder: "Did I forge that solution?"
  • Use Pattern Coach: /forge (guides you interactively)
  • Quick forge: /forge quick (auto-detects from conversation)

Goal: 60% capture rate
  • Means 6 out of 10 solutions become patterns
  • Reasonable balance (not every solution needs forging)
  • Keeps your memory growing steadily

───────────────────────────────────────────────────────────────────
📈 Projected Impact

If you increase forging to 60% capture rate:

  Current: 7 patterns/week
  Projected: 28 patterns/week (4x growth!)

  After 1 month:
    • 112 new patterns
    • Estimated 250+ problem-solving hours saved
    • 90% of problems will have existing patterns

Your ekkOS memory would become incredibly valuable! 💎
```

## Requirements

- ekkOS MCP server configured
- ekkos-connect extension installed
- Some usage history (or will show "brand new user" status)

## Advanced Options

```bash
# Test specific components
/loop-status --test-mcp          # Test MCP connection
/loop-status --test-hooks        # Test hook integration
/loop-status --test-retrieve     # Test pattern retrieval
/loop-status --test-forge        # Test pattern forging

# Show historical trends
/loop-status --last-week
/loop-status --last-month

# Export diagnostics
/loop-status --export-diagnostics
```

## Implementation Details

When this command runs, Claude will:

1. **Test MCP Connection**:
   - Ping ekkOS API
   - Check authentication
   - Verify MCP tools accessible

2. **Check Each Loop Phase**:
   - RETRIEVE: Call `ekkOS_Search` with test query
   - APPLY: Check recent pattern applications via `ekkOS_Track`
   - MEASURE: Check outcome tracking via `ekkOS_Outcome` stats
   - LEARN: Count patterns via `ekkOS_Stats`

3. **Analyze Activity**:
   - Call `ekkOS_Summary({time_window_seconds: 3600})` for recent activity
   - Calculate rates (retrieve → apply, apply → measure, measure → learn)
   - Identify bottlenecks (where conversion is low)

4. **Diagnose Issues**:
   - If retrieve failing → Check MCP config
   - If apply low → Check pattern quality
   - If measure low → Check hooks
   - If learn low → Encourage forging

5. **Format Output**:
   - Clear status indicators (✅⚠️❌)
   - Actionable fix steps
   - Performance metrics with context
   - Recommendations for improvement

6. **Provide Fixes**:
   - Step-by-step checklist
   - Links to documentation
   - Commands to run
   - Support contact if needed

This command helps users understand if ekkOS is working and how to fix issues.

**A healthy Golden Loop = A smarter you** 🔄🧠
