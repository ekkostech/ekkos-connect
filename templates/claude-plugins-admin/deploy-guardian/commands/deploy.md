# Deploy Guardian

**ADMIN ONLY** - Deployment safety and management for ekkOS infrastructure.

## Overview

Deploy Guardian helps the ekkOS team safely deploy to Vercel (13 projects) and Railway (PM2 workers) with pre-flight checks and conflict detection.

## ekkOS Infrastructure Layout

### Vercel Projects (13 Total)

| App Directory | Vercel Project | Domain | Purpose |
|---------------|----------------|---------|---------|
| `apps/memory` | `memory` | api.ekkos.dev | MCP server (CRITICAL) |
| `apps/web` | `platform` | platform.ekkos.dev | Main dashboard |
| `apps/labs` | `labs` | www.ekkoslabs.com | Research site |
| `apps/docs` | `docs` | docs.ekkos.dev | Documentation |
| `apps/ekkosca` | `ekkosca` | ekkos.ca | Company site |
| `apps/marketing` | `marketing` | ekkos.dev | Landing page |
| `extensions/ekkos-connect` | `ekkos-connect` | ekkos-connect.vercel.app | Extension API |
| `apps/admin` | `admin` | admin.ekkos.ca | Admin dashboard |
| `apps/blog` | `blog` | blog.ekkos.dev | Blog |
| `packages/ekkos-sdk` | `sdk` | sdk-ekkos.vercel.app | SDK docs |
| - | `echo-web` | echo-web-echoapp-ca.vercel.app | Legacy |
| - | `comingsoon` | ekkos.dev | Legacy redirect |
| - | `applepitch` | applepitch.vercel.app | Legacy |

### Railway Services (PM2 Workers)

| Service | Purpose | Cron |
|---------|---------|------|
| `services/monitor` | Memory metrics | Continuous |
| `workers/brain-decay` | Pattern cleanup | `0 1 * * *` |
| `workers/judge-queue` | Episode judging | `0 2 * * *` |

### ⚠️ CRITICAL RULE

**NEVER deploy `apps/memory` to Railway!**
- It's a Vercel project (API server)
- Railway is ONLY for PM2 workers
- This mistake breaks the MCP server

## Commands

### `/deploy check`

Pre-flight check before deployment.

```bash
# Check specific project
/deploy check apps/memory

# Check all Vercel projects
/deploy check --all-vercel

# Check Railway services
/deploy check --railway
```

**What it checks:**
- ✅ Target is correct (Vercel vs Railway)
- ✅ No conflicting deployments in progress
- ✅ Environment variables are set
- ✅ Tests passing (if applicable)
- ✅ No active incidents
- ✅ Deployment time is safe (not Friday evening)
- ✅ User directives don't prohibit deploy
- ✅ Recent git commits look safe

**Example Output:**
```
🛡️ Deploy Guardian: Pre-Flight Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: apps/memory → Vercel (api.ekkos.dev)
Target: Production

───────────────────────────────────────────────────────────────────
✅ Pre-Flight Checks

✅ Correct target (Vercel, not Railway)
✅ No conflicting deployments
✅ Environment variables configured
✅ Recent commits look safe (3 commits since last deploy)
✅ No active incidents
✅ Safe deployment time (Monday 2 PM)

───────────────────────────────────────────────────────────────────
📋 Recent Changes (Since Last Deploy)

1. fix: Handle null user in auth middleware (safe)
2. feat: Add rate limiting to search endpoint (safe)
3. chore: Update dependencies (safe)

Impact: Low risk

───────────────────────────────────────────────────────────────────
🎯 Deployment Command

Ready to deploy? Run:

cd /Volumes/MacMiniPort/DEV/EKKOS/apps/memory
vercel deploy --prod

Or use: /deploy execute apps/memory

───────────────────────────────────────────────────────────────────
✅ SAFE TO PROCEED

All checks passed. Deploy when ready.
```

**Example - Issues Detected:**
```
🛡️ Deploy Guardian: Pre-Flight Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: apps/memory → Vercel (api.ekkos.dev)
Target: Production

───────────────────────────────────────────────────────────────────
🚨 ISSUES DETECTED

❌ Wrong target!
   You're trying to deploy apps/memory to Railway
   → apps/memory is a Vercel project (MCP server)
   → Railway is ONLY for PM2 workers
   → This will break the MCP server!

   Correct command:
   cd apps/memory && vercel deploy --prod

❌ Tests failing
   • test/api/search.test.ts - FAILED
   • test/auth/middleware.test.ts - FAILED

   Fix tests before deploying!

⚠️  Dangerous deployment time
   Current: Friday, 6:45 PM
   Risk: Weekend incident with no team available

   User directive: "Never deploy to production on Friday after 3 PM"

   Recommendation: Wait until Monday

───────────────────────────────────────────────────────────────────
🔧 Required Actions

[ ] 1. Change deploy target to Vercel (NOT Railway)
[ ] 2. Fix 2 failing tests
[ ] 3. Wait until Monday for safer deploy time

───────────────────────────────────────────────────────────────────
🚨 DO NOT PROCEED

Fix issues above before deploying.
```

### `/deploy execute`

Execute deployment with safety confirmation.

```bash
# Deploy specific project
/deploy execute apps/memory

# Deploy with reason
/deploy execute apps/memory --reason "Critical security fix"

# Emergency deploy (skip checks)
/deploy execute apps/memory --emergency "API down"
```

**What it does:**
1. Runs pre-flight check
2. Shows deployment plan
3. Asks for confirmation
4. Executes deployment
5. Monitors deployment status
6. Reports success/failure

**Example:**
```bash
/deploy execute apps/memory

🛡️ Deploy Guardian: Deployment Plan
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: apps/memory
Target: Vercel Production (api.ekkos.dev)
Impact: CRITICAL (MCP server)

Changes:
  • 3 commits since last deploy
  • Low risk changes
  • No breaking changes detected

Proceed? (yes/no/abort)
> yes

🚀 Deploying...

[████████░░░░░░░░░░░░] 40% - Building...
[████████████████░░░░] 80% - Deploying...
[████████████████████] 100% - Complete!

✅ Deployment Successful!

URL: https://api.ekkos.dev
Deployment ID: dpl_abc123xyz
Time: 45 seconds

🧪 Running smoke tests...

✅ Health check passed
✅ MCP tools responding
✅ Authentication working

───────────────────────────────────────────────────────────────────
📊 Post-Deploy Actions

• Monitor for 30 minutes: /deploy monitor apps/memory
• Rollback if needed: /deploy rollback apps/memory
• View logs: /deploy logs apps/memory
```

### `/deploy list`

List all projects and their deployment status.

```bash
# List all projects
/deploy list

# List only Vercel
/deploy list --vercel

# List only Railway
/deploy list --railway

# Show recent deployments
/deploy list --recent
```

**Example Output:**
```
🛡️ Deploy Guardian: Infrastructure Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Vercel Projects (13):

🔴 CRITICAL
  • apps/memory (api.ekkos.dev)
    Status: ✅ Healthy
    Last Deploy: 2 hours ago
    Version: v2.45.1

🟡 HIGH PRIORITY
  • apps/web (platform.ekkos.dev)
    Status: ✅ Healthy
    Last Deploy: 1 day ago
    Version: v1.89.2

  • apps/labs (www.ekkoslabs.com)
    Status: ✅ Healthy
    Last Deploy: 3 days ago
    Version: v0.12.5

🟢 STANDARD
  • apps/docs (docs.ekkos.dev)
    Status: ✅ Healthy
    Last Deploy: 1 week ago

  • apps/ekkosca (ekkos.ca)
    Status: ✅ Healthy
    Last Deploy: 2 weeks ago

  • apps/marketing (ekkos.dev)
    Status: ✅ Healthy
    Last Deploy: 1 week ago

  • extensions/ekkos-connect (ekkos-connect.vercel.app)
    Status: ✅ Healthy
    Last Deploy: 3 days ago

  • apps/admin (admin.ekkos.ca)
    Status: ⚠️  Warning (1 error in logs)
    Last Deploy: 5 days ago

  • apps/blog (blog.ekkos.dev)
    Status: ✅ Healthy
    Last Deploy: 2 weeks ago

  • packages/ekkos-sdk (sdk-ekkos.vercel.app)
    Status: ✅ Healthy
    Last Deploy: 1 month ago

  [+3 legacy projects...]

───────────────────────────────────────────────────────────────────
Railway Services (3):

  • services/monitor
    Status: ✅ Running
    Uptime: 15 days
    Memory: 234 MB / 512 MB

  • workers/brain-decay
    Status: ✅ Running
    Last Run: 1 hour ago (success)
    Next Run: Tomorrow 1 AM

  • workers/judge-queue
    Status: ⚠️  Stalled
    Last Run: 6 hours ago (failed)
    Error: Database connection timeout

───────────────────────────────────────────────────────────────────
⚠️  Action Items

1. Check apps/admin logs: /deploy logs apps/admin
2. Investigate judge-queue failure: /deploy logs workers/judge-queue --railway
3. Consider deploying if you have pending changes
```

### `/deploy logs`

View deployment logs and errors.

```bash
# View logs for project
/deploy logs apps/memory

# View recent errors
/deploy logs apps/memory --errors

# View Railway worker logs
/deploy logs workers/judge-queue --railway

# Tail logs in real-time
/deploy logs apps/memory --follow
```

### `/deploy rollback`

Rollback to previous deployment.

```bash
# Rollback specific project
/deploy rollback apps/memory

# Rollback to specific version
/deploy rollback apps/memory --to v2.45.0

# Emergency rollback (skip confirmations)
/deploy rollback apps/memory --emergency
```

**Example:**
```bash
/deploy rollback apps/memory

🛡️ Deploy Guardian: Rollback Confirmation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Project: apps/memory (api.ekkos.dev)

Current: v2.45.1 (deployed 10 minutes ago)
↓
Previous: v2.45.0 (deployed 2 hours ago)

Reason for rollback:
> API returning 500 errors

Confirm rollback? (yes/no)
> yes

🔄 Rolling back...

✅ Rollback complete!

Previous deployment (v2.45.0) is now live.
Deployment ID: dpl_prev_xyz

Monitor: /deploy monitor apps/memory
```

### `/deploy monitor`

Monitor deployment health in real-time.

```bash
# Monitor specific project
/deploy monitor apps/memory

# Monitor for specific duration
/deploy monitor apps/memory --duration 30m

# Monitor with alerts
/deploy monitor apps/memory --alert-on-error
```

## MCP Tools Used

- `ekkOS_Conflict` - Check for deployment conflicts with user directives
- `ekkOS_Search` - Find past deployment incidents
- `ekkOS_Recall` - Recent infrastructure changes
- `ekkOS_Directive` - Deployment safety rules
- `ekkOS_Summary` - Recent MCP activity
- `Bash` - Execute deployment commands

## Safety Rules

### Automatic Checks

1. **Target Validation**
   - ❌ NEVER deploy apps/memory to Railway
   - ✅ Vercel for all apps/*
   - ✅ Railway for workers/* and services/*

2. **Time-Based**
   - ⚠️  Warn if Friday after 3 PM
   - ⚠️  Warn if outside business hours
   - ✅ Best time: Monday-Thursday, 10 AM - 3 PM

3. **Dependency Checks**
   - ✅ Tests passing (if applicable)
   - ✅ No active incidents
   - ✅ Dependencies up to date
   - ✅ No conflicting deployments

4. **Impact Assessment**
   - 🔴 CRITICAL: apps/memory (MCP server)
   - 🟡 HIGH: apps/web, apps/labs
   - 🟢 STANDARD: Everything else

### Manual Overrides

Emergency deployments can skip checks:
```bash
/deploy execute apps/memory --emergency "API down, critical fix"
```

**Use emergency mode ONLY for:**
- Production outages
- Security vulnerabilities
- Data loss prevention

## Common Workflows

### Deploy MCP Server (apps/memory)
```bash
# 1. Pre-flight check
/deploy check apps/memory

# 2. Review changes
git log --oneline -5

# 3. Deploy
/deploy execute apps/memory

# 4. Monitor
/deploy monitor apps/memory --duration 30m
```

### Deploy All Vercel Projects
```bash
# Check all projects
/deploy check --all-vercel

# Deploy each one
/deploy execute apps/memory
/deploy execute apps/web
/deploy execute apps/labs
# ... etc
```

### Update Railway Worker
```bash
# Railway services deploy via git push
git push railway main

# Then monitor
/deploy logs workers/judge-queue --railway --follow
```

### Emergency Rollback
```bash
# If deployment breaks production
/deploy rollback apps/memory --emergency

# Monitor after rollback
/deploy monitor apps/memory
```

## Integration with User Directives

Deploy Guardian respects ekkOS directives:

- **NEVER**: "Never deploy to production on Friday after 3 PM"
- **MUST**: "Must run tests before deploying"
- **PREFER**: "Prefer deploying during business hours"
- **AVOID**: "Avoid deploying multiple projects simultaneously"

Create deployment rules:
```bash
# Via ekkOS MCP
ekkOS_Directive({
  type: "NEVER",
  rule: "deploy apps/memory to Railway",
  reason: "Railway is for workers only, Vercel is for apps"
})
```

## Troubleshooting

### "Wrong target" Error

**Problem:** Trying to deploy apps/* to Railway
**Fix:** Use Vercel instead
```bash
cd apps/memory && vercel deploy --prod
```

### Deployment Stalled

**Problem:** Deployment stuck at building
**Fix:**
1. Check Vercel dashboard
2. View build logs: /deploy logs apps/memory
3. Cancel and retry: vercel deploy --prod --force

### Tests Failing

**Problem:** Pre-flight check fails on tests
**Fix:**
1. Run tests locally: npm test
2. Fix failing tests
3. Commit fixes
4. Try deploy again

### Environment Variables Missing

**Problem:** "Environment variable not set"
**Fix:**
1. Check .env.local
2. Set via Vercel dashboard
3. Or: vercel env add VARIABLE_NAME

---

**Deploy safely. Monitor closely. Rollback quickly.** 🛡️
