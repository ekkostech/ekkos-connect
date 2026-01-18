# Autonomous Admin Agent

**ADMIN ONLY** - Intelligent agent that monitors ekkOS infrastructure 24/7 and automatically uses admin plugins to maintain system health.

## Overview

The Autonomous Admin Agent is your AI DevOps engineer. It continuously monitors all ekkOS services and intelligently decides when to use admin plugins to:
- Prevent issues before they happen
- Fix problems automatically
- Alert you only when human intervention is needed
- Optimize performance proactively

## Architecture

```
┌─────────────────────────────────────────────────────┐
│          Autonomous Admin Agent                     │
│                                                     │
│  🧠 Intelligent Decision Making                    │
│  ├─ Monitor all services continuously              │
│  ├─ Detect anomalies and issues                    │
│  ├─ Decide which plugin to use                     │
│  ├─ Take preventive actions                        │
│  └─ Alert admin when needed                        │
└──────────────────┬──────────────────────────────────┘
                   │
         Uses admin plugins as tools
                   │
    ┌──────────────┼──────────────┬────────────┐
    │              │              │            │
    ▼              ▼              ▼            ▼
┌─────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐
│ Deploy  │  │  Memory  │  │   MCP    │  │Database│
│Guardian │  │ Monitor  │  │ Manager  │  │Manager │
└─────────┘  └──────────┘  └──────────┘  └────────┘
```

## Commands

### `/agent start`

Start the autonomous agent to monitor infrastructure.

```bash
# Start monitoring
/agent start

# Start with specific focus
/agent start --focus deployment

# Start in verbose mode
/agent start --verbose

# Background monitoring
/agent start --background
```

**What happens:**
```
🤖 Autonomous Admin Agent Starting...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Initializing monitoring systems...

✅ Connected to Vercel API (13 projects)
✅ Connected to Railway API (3 services)
✅ Connected to Supabase (ekkOS database)
✅ Connected to MCP server (api.ekkos.dev)

Agent Status: 🟢 Active
Monitoring: 24/7 continuous
Check Interval: Every 5 minutes
Alert Mode: Critical only (will escalate)

───────────────────────────────────────────────────────────────────
🎯 Monitoring Scope

Deployments:
  ✅ 13 Vercel projects
  ✅ 3 Railway services
  ✅ Pre-deployment checks
  ✅ Post-deployment monitoring

Memory System:
  ✅ All 11 layers
  ✅ Data integrity
  ✅ Performance metrics
  ✅ Worker health (PM2)

MCP Server:
  ✅ 31 tools health
  ✅ API response times
  ✅ Error rates
  ✅ Connection stability

Infrastructure:
  ✅ Database performance
  ✅ Storage usage
  ✅ API rate limits
  ✅ Service uptime

───────────────────────────────────────────────────────────────────
🤖 Agent Capabilities

I will automatically:
  • Run /deploy check before any deployment
  • Execute /memory-health every hour
  • Monitor /mcp status every 5 minutes
  • Optimize database when needed
  • Alert you for critical issues
  • Take preventive actions
  • Learn from past incidents

I will NEVER:
  • Deploy without confirmation (unless emergency)
  • Delete data without approval
  • Override security rules
  • Take risky actions silently

───────────────────────────────────────────────────────────────────
📊 Current Status

All systems healthy ✅

Recent Actions (last hour):
  • 10:15 AM - Ran /memory-health (all healthy)
  • 10:30 AM - Checked MCP status (31/31 tools OK)
  • 10:45 AM - Optimized pattern indexes (+12% speed)

Next scheduled checks:
  • 11:00 AM - Memory health check
  • 11:05 AM - MCP status check
  • 11:15 AM - Deployment status review

───────────────────────────────────────────────────────────────────
✅ Agent Running

Monitoring in background. I'll alert you if I detect issues.

Stop: /agent stop
Status: /agent status
Logs: /agent logs
```

### `/agent status`

Check what the agent is currently doing.

```bash
/agent status

🤖 Autonomous Admin Agent Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Status: 🟢 Active (running for 3 days, 15 hours)

Current Activity:
  🔍 Monitoring deployment queue
  🧠 Analyzing memory layer performance
  ⏰ Next health check in 2 minutes

───────────────────────────────────────────────────────────────────
📊 Today's Activity

Checks Performed: 287
Issues Detected: 3
Issues Resolved: 2
Issues Escalated: 1 (requires your attention)

Actions Taken:
  • Ran /memory-optimize (freed 234 MB)
  • Restarted stalled Railway worker
  • Archived 45 stale patterns

Prevented Issues:
  • Blocked Friday evening deployment (safety rule)
  • Detected failing tests before deploy
  • Caught memory leak early (fixed proactively)

───────────────────────────────────────────────────────────────────
⚠️  Pending Your Attention

1 issue requires human decision:

🔴 apps/admin deployment pending
   • 2 failing tests detected
   • Deploy requested by user
   • Agent blocked (safety rule)

   Options:
     - Fix tests: Fix the 2 failing tests
     - Override: /agent approve-deploy apps/admin --reason "..."
     - Cancel: /agent cancel-deploy apps/admin

───────────────────────────────────────────────────────────────────
📈 Performance Impact

Since agent started (3 days ago):
  • Prevented incidents: 5
  • Reduced manual checks: 287 → 3
  • Optimization savings: 1.2 GB storage freed
  • Downtime prevented: ~4 hours estimated
```

### `/agent stop`

Stop autonomous monitoring (manual mode).

```bash
/agent stop

🤖 Stopping Autonomous Admin Agent...

✅ Agent stopped.

You're now in manual mode. You can still use admin plugins manually:
  - /deploy check
  - /memory-health
  - /mcp status

Restart: /agent start
```

### `/agent logs`

View agent's decision log and actions taken.

```bash
/agent logs

# Last 24 hours
/agent logs --24h

# Show only actions
/agent logs --actions-only

# Show only alerts
/agent logs --alerts-only
```

**Example:**
```
🤖 Agent Activity Log (Last 24 Hours)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

10:45 AM - 🔍 CHECK
  Ran: /memory-health
  Result: All layers healthy
  Decision: No action needed

10:47 AM - ⚠️  ISSUE DETECTED
  Problem: Worker judge-queue stalled (6h no activity)
  Analysis: Database connection timeout
  Decision: Restart worker

10:48 AM - 🔧 ACTION TAKEN
  Executed: pm2 restart judge-queue
  Result: ✅ Worker restarted successfully
  Outcome: Worker now processing queue

11:00 AM - 🔍 CHECK
  Ran: /mcp status
  Result: 31/31 tools healthy, avg 145ms
  Decision: No action needed

11:15 AM - 🔍 CHECK
  Ran: /deploy check --all-vercel
  Result: All deployments healthy
  Decision: No action needed

11:30 AM - 💡 OPTIMIZATION
  Detected: Pattern queries slower than baseline (+20%)
  Analysis: 465 stale patterns reducing index efficiency
  Decision: Run optimization

11:31 AM - 🔧 ACTION TAKEN
  Executed: /memory-optimize --layer 4
  Result: ✅ Freed 234 MB, +15% query speed
  Outcome: Performance restored

12:00 PM - ⚠️  ISSUE DETECTED
  Problem: User requesting deploy apps/admin
  Analysis: 2 tests failing (test/api/users.test.ts)
  Decision: BLOCK deployment (safety rule)

12:01 PM - 🚨 ALERT SENT
  Alert: "Deployment blocked - 2 failing tests"
  Recipient: Admin
  Action Required: Fix tests or override
  Status: ⏳ Awaiting admin decision

───────────────────────────────────────────────────────────────────
📊 Summary

Total Checks: 24
Issues Detected: 3
Actions Taken: 2
Issues Escalated: 1
```

## Intelligent Decision Making

### Deployment Monitoring

**Agent automatically:**
1. Runs `/deploy check` before ANY deployment attempt
2. Blocks deployments with failing tests
3. Warns about risky deployment times (Friday PM)
4. Monitors post-deployment for 30 minutes
5. Auto-rollback if errors spike

**Example scenario:**
```
12:00 PM - User runs: vercel deploy --prod
12:00 PM - Agent intercepts: "Hold on, let me check..."
12:00 PM - Agent runs: /deploy check apps/memory
12:01 PM - Agent detects: 2 failing tests
12:01 PM - Agent blocks: "Deployment blocked - fix tests first"
12:01 PM - Agent alerts admin: "Deploy requested but blocked"
```

### Memory Health Monitoring

**Agent automatically:**
1. Runs `/memory-health` every hour
2. Detects performance degradation early
3. Runs `/memory-optimize` when needed
4. Archives stale patterns proactively
5. Monitors worker health (PM2)

**Example scenario:**
```
10:00 AM - Agent checks: /memory-health
10:01 AM - Agent detects: L4 queries 20% slower
10:02 AM - Agent analyzes: 465 stale patterns found
10:03 AM - Agent decides: Run optimization
10:04 AM - Agent executes: /memory-optimize --layer 4
10:05 AM - Agent verifies: Performance restored (+15%)
10:05 AM - Agent logs: "Proactive optimization complete"
```

### MCP Server Monitoring

**Agent automatically:**
1. Checks `/mcp status` every 5 minutes
2. Tests all 31 tools periodically
3. Detects slow response times
4. Restarts server if needed
5. Alerts for persistent errors

**Example scenario:**
```
11:00 AM - Agent checks: /mcp status
11:01 AM - Agent detects: ekkOS_Search timeout (3 times)
11:02 AM - Agent analyzes: Database connection pool exhausted
11:03 AM - Agent decides: Increase pool size
11:04 AM - Agent executes: Update DATABASE_POOL_SIZE env var
11:05 AM - Agent restarts: /mcp restart
11:10 AM - Agent verifies: All tools responding normally
11:10 AM - Agent logs: "MCP server optimized and restarted"
```

### Preventive Actions

**Agent takes preventive actions:**
- Archives stale patterns before they cause slowdowns
- Optimizes indexes before queries get slow
- Rotates stale secrets before they expire
- Increases resources before hitting limits
- Fixes small issues before they become big

**Example scenario:**
```
2:00 PM - Agent analyzes: Memory usage trending up
2:01 PM - Agent predicts: Will hit 90% in 3 days
2:02 PM - Agent decides: Archive stale data now (preventive)
2:03 PM - Agent executes: /memory-optimize --archive-stale
2:04 PM - Agent result: Freed 1.2 GB, growth delayed
2:05 PM - Agent logs: "Preventive maintenance complete"
```

## Alert Levels

### 🟢 INFO (No alert)
- Routine checks pass
- Optimizations completed
- Normal activity

### 🟡 WARNING (Silent)
- Minor issues detected
- Performance slightly degraded
- Agent fixing automatically

### 🟠 ATTENTION (Notify)
- Issue detected but agent can't fix
- Requires human decision
- Non-urgent

### 🔴 CRITICAL (Alert immediately)
- Production outage
- Data loss risk
- Security issue
- Human intervention required NOW

## Configuration

### `/agent config`

Configure agent behavior.

```bash
# Set check interval
/agent config --interval 5m

# Set alert threshold
/agent config --alert-level warning

# Enable/disable specific monitors
/agent config --disable deployment-monitoring

# Set working hours
/agent config --hours "9am-6pm EST"
```

**Example:**
```bash
/agent config

🤖 Agent Configuration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Monitoring:
  ✅ Deployment monitoring (every 1m)
  ✅ Memory health (every 1h)
  ✅ MCP status (every 5m)
  ✅ Database performance (every 15m)

Alerts:
  Level: ATTENTION and above
  Method: Discord webhook + Email
  Working Hours: 9 AM - 6 PM EST (escalate after-hours)

Actions:
  ✅ Auto-optimize (when safe)
  ✅ Auto-restart workers (when needed)
  ✅ Auto-archive stale (preventive)
  ❌ Auto-deploy (requires approval)
  ❌ Auto-delete data (never)

Safety:
  ✅ Respect user directives
  ✅ Block risky deployments
  ✅ Require approval for destructive actions
  ✅ Log all decisions

Modify: /agent config --set <key> <value>
```

## Integration with User Directives

Agent respects ekkOS directives:

```typescript
// Example directives the agent follows:
ekkOS_Directive({
  type: "NEVER",
  rule: "deploy to production on Friday after 3 PM"
})

ekkOS_Directive({
  type: "MUST",
  rule: "run tests before deploying"
})

ekkOS_Directive({
  type: "PREFER",
  rule: "optimize memory during off-peak hours"
})
```

Agent automatically:
- Reads your directives
- Applies them to decisions
- Never violates NEVER/MUST rules
- Prefers PREFER actions when possible

## MCP Tools Used

The agent uses ALL admin plugins, which in turn use:
- `ekkOS_Conflict` - Check safety before actions
- `ekkOS_Search` - Find past incidents
- `ekkOS_Directive` - Read safety rules
- `ekkOS_Stats` - Get system metrics
- `ekkOS_Summary` - Recent activity
- `ekkOS_Recall` - Past decisions
- All 31 ekkOS MCP tools
- Bash commands for system operations
- Supabase tools for database operations

## Best Practices

### Let the Agent Handle Routine Tasks

**Before agent:**
```bash
# You manually run these every day:
/deploy check --all-vercel
/memory-health
/mcp status
/memory-optimize
# ... 10+ more commands
```

**With agent:**
```bash
# You just start it once:
/agent start

# Agent handles everything automatically
# You only intervene for critical issues
```

### Review Agent Logs Periodically

```bash
# Weekly review
/agent logs --7days --actions-only

# See what agent prevented
/agent logs --prevented-issues
```

### Trust but Verify

- Agent takes safe actions automatically
- Agent alerts you for risky actions
- You can always override with `/agent approve`
- All actions are logged for audit

### Emergency Override

```bash
# If agent blocks something urgent:
/agent override --reason "Critical security patch"

# Emergency mode (skip all checks):
/agent emergency-mode --duration 1h
```

## Troubleshooting

### Agent Not Starting

**Problem:** `/agent start` fails
**Check:** ekkOS MCP connection
**Fix:** Authenticate ekkos-connect extension

### Agent Taking Wrong Actions

**Problem:** Agent optimizing at wrong times
**Fix:** Adjust config: `/agent config --optimize-hours "2am-4am"`

### Too Many Alerts

**Problem:** Getting alerted for minor issues
**Fix:** Raise threshold: `/agent config --alert-level critical`

### Agent Missed an Issue

**Problem:** Issue occurred but agent didn't detect
**Fix:** Check logs: `/agent logs --show-missed`
**Report:** Help improve agent by reporting missed issues

---

## Summary

The Autonomous Admin Agent is your AI DevOps engineer that:

✅ **Monitors** - 24/7 infrastructure monitoring
✅ **Detects** - Issues before they become problems
✅ **Decides** - Intelligently chooses actions
✅ **Acts** - Safe automatic fixes
✅ **Alerts** - Only when you're needed
✅ **Learns** - Gets smarter over time

**Start it once, forget routine maintenance.**

```bash
/agent start
```

---

**Monitor intelligently. Act automatically. Sleep peacefully.** 🤖
