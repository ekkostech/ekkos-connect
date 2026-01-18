# Tech Lead Agent

**ADMIN ONLY** - AI Tech Lead that orchestrates the dev team, creates implementation plans, assigns tasks to specialized agents, and manages the development lifecycle.

## Overview

The Tech Lead Agent acts as your engineering manager and technical architect. It:
- Breaks down features into tasks
- Assigns work to specialized agents (Frontend, Backend, QA, etc.)
- Reviews code quality and architectural decisions
- Manages releases and coordinates deployments
- Tracks project progress and unblocks teams

## Commands

### `/lead plan`

Create a comprehensive implementation plan for a feature or project.

```bash
/lead plan "Feature description"

# Examples
/lead plan "Add Teams feature with collaboration"
/lead plan "Implement real-time notifications system"
/lead plan "Refactor authentication to use OAuth 2.0"
```

**What happens:**

```
🎯 Tech Lead: Planning "Add Teams feature"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Feature Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Searching existing patterns...
✓ Found 3 similar features (pattern: team-collaboration-2024)
✓ Found 2 relevant schemas (users, organizations)
✓ Checked dependencies (Supabase RLS, Next.js 14)

Complexity: High (8/10)
Estimated: 5-7 days with full team
Risk Areas: RLS policies, real-time sync, billing integration

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Implementation Plan
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase 1: Foundation (Backend + Data)
┌─────────────────────────────────────────────────┐
│ 1. Database Schema (Backend Agent)              │
│    - Create teams table with RLS policies       │
│    - Create team_members junction table         │
│    - Create team_invitations table              │
│    - Add indexes for performance                │
│    Duration: 2 hours                            │
│    Command: /backend schema "Teams"             │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 2. API Endpoints (Backend Agent)                │
│    - POST /api/teams (create team)              │
│    - GET /api/teams (list user teams)           │
│    - POST /api/teams/:id/invite (invite member) │
│    - PATCH /api/teams/:id (update team)         │
│    Duration: 3 hours                            │
│    Command: /backend api "Teams CRUD"           │
└─────────────────────────────────────────────────┘

Phase 2: Frontend (UI Components)
┌─────────────────────────────────────────────────┐
│ 3. Teams Dashboard (Frontend Agent)             │
│    - Create app/teams/page.tsx                  │
│    - Team list with search/filter               │
│    - Team creation modal                        │
│    Duration: 4 hours                            │
│    Command: /frontend build "Teams dashboard"   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 4. Team Settings Page (Frontend Agent)          │
│    - Member management UI                       │
│    - Invitation system                          │
│    - Role permissions UI                        │
│    Duration: 3 hours                            │
│    Command: /frontend build "Team settings"     │
└─────────────────────────────────────────────────┘

Phase 3: Quality & Security
┌─────────────────────────────────────────────────┐
│ 5. Security Audit (Security Agent)              │
│    - RLS policy verification                    │
│    - API authorization checks                   │
│    - Data isolation testing                     │
│    Duration: 2 hours                            │
│    Command: /security audit "Teams"             │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ 6. Test Suite (QA Agent)                        │
│    - API endpoint tests (28 tests)              │
│    - Integration tests (12 tests)               │
│    - E2E workflow tests (5 scenarios)           │
│    Duration: 3 hours                            │
│    Command: /qa write "Teams feature"           │
└─────────────────────────────────────────────────┘

Phase 4: Documentation & Deployment
┌─────────────────────────────────────────────────┐
│ 7. Documentation (Docs Agent)                   │
│    - API reference documentation                │
│    - User guide for Teams                       │
│    Duration: 2 hours                            │
│    Command: /docs api "Teams endpoints"         │
└─────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Plan Created
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Tasks: 7
Total Duration: ~19 hours (2.5 days with parallel work)
Agents Involved: Backend (2), Frontend (2), Security (1), QA (1), Docs (1)

Dependencies:
  Task 2 depends on Task 1 (schema first)
  Task 3-4 depend on Task 2 (API ready)
  Task 5-6 can run in parallel after Task 4
  Task 7 runs after Task 6

Critical Path: 1 → 2 → 3 → 4 → 6 → 7 (16 hours)

Next Steps:
  1. Review plan: /lead review plan
  2. Start execution: /lead assign all
  3. Track progress: /lead status
```

### `/lead assign`

Assign tasks from the plan to specialized agents.

```bash
# Assign all tasks automatically
/lead assign all

# Assign specific tasks
/lead assign task 1,2,3

# Assign to specific agent
/lead assign task 5 to security-agent
```

**What happens:**

```
🎯 Tech Lead: Assigning Tasks
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Starting parallel execution...

┌─ Backend Agent ──────────────────────────────────┐
│ 🚀 Task 1: Database Schema                      │
│                                                  │
│ Status: ⏳ In Progress                           │
│ Running: /backend schema "Teams"                │
│                                                  │
│ Created:                                         │
│   ✓ supabase/migrations/..._teams.sql           │
│   ✓ Teams table with uuid, name, owner_id       │
│   ✓ RLS policies (owner access, member access)  │
│   ✓ Indexes on (owner_id, created_at)           │
│                                                  │
│ Duration: 1.5 hours                              │
│ Status: ✅ Complete                              │
└──────────────────────────────────────────────────┘

┌─ Backend Agent ──────────────────────────────────┐
│ 🚀 Task 2: API Endpoints                        │
│                                                  │
│ Status: ⏳ In Progress (waiting on Task 1)       │
│ Running: /backend api "Teams CRUD"              │
│                                                  │
│ Created:                                         │
│   ✓ apps/web/app/api/teams/route.ts            │
│   ✓ apps/web/app/api/teams/[id]/route.ts       │
│   ✓ POST, GET, PATCH, DELETE handlers           │
│   ✓ Zod validation schemas                      │
│                                                  │
│ Duration: 2.5 hours                              │
│ Status: ✅ Complete                              │
└──────────────────────────────────────────────────┘

[Frontend Agent now starts Tasks 3-4...]
[Security Agent starts Task 5 in parallel...]
[QA Agent starts Task 6...]
[Docs Agent starts Task 7...]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Execution Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Progress: 100% (7/7 tasks complete)
Total Duration: 14.5 hours (actual, with parallelization)
Estimated: 19 hours (saved 4.5 hours via parallel work)

Files Changed: 23 files
  - 3 migrations
  - 8 API routes
  - 6 React components
  - 4 test files
  - 2 documentation pages

Tests: 45 tests, 100% passing
Coverage: 94% (meets threshold)

Next Steps:
  1. Review changes: /lead review all
  2. Deploy to staging: /lead deploy staging
  3. Create release: /lead release
```

### `/lead review`

Review completed work from agents.

```bash
# Review all changes
/lead review all

# Review specific agent's work
/lead review frontend

# Review specific files
/lead review apps/web/app/teams/page.tsx
```

**What happens:**

```
🎯 Tech Lead: Reviewing All Changes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Code Quality Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Backend Work (Backend Agent)
┌──────────────────────────────────────────────────┐
│ File: apps/web/app/api/teams/route.ts           │
│ Quality: ⭐⭐⭐⭐⭐ Excellent                      │
│                                                  │
│ ✅ Strengths:                                    │
│   • Proper error handling with try/catch        │
│   • Zod validation on all inputs                │
│   • RLS policies enforced at DB level           │
│   • Follows REST conventions                    │
│   • Good use of TypeScript types                │
│                                                  │
│ ⚠️  Improvements:                                │
│   • Add rate limiting (use Upstash)             │
│   • Add request logging for audit               │
│                                                  │
│ Recommendation: Approve with minor changes      │
└──────────────────────────────────────────────────┘

Frontend Work (Frontend Agent)
┌──────────────────────────────────────────────────┐
│ File: apps/web/app/teams/page.tsx               │
│ Quality: ⭐⭐⭐⭐ Very Good                       │
│                                                  │
│ ✅ Strengths:                                    │
│   • Clean component structure                   │
│   • Proper error states                         │
│   • Loading states handled                      │
│   • Accessibility (ARIA labels)                 │
│                                                  │
│ ⚠️  Issues:                                      │
│   • Missing pagination (will fail at scale)     │
│   • No optimistic updates on create             │
│   • Search is client-side only                  │
│                                                  │
│ Recommendation: Request changes                 │
└──────────────────────────────────────────────────┘

Security Audit (Security Agent)
┌──────────────────────────────────────────────────┐
│ Status: ✅ Passed with recommendations           │
│                                                  │
│ Findings:                                        │
│   ✅ RLS policies correct                       │
│   ✅ No SQL injection vectors                   │
│   ✅ Input validation comprehensive             │
│   ⚠️  Missing rate limiting (High Priority)     │
│   ⚠️  No audit logging (Medium Priority)        │
│                                                  │
│ Recommendation: Fix rate limiting before deploy │
└──────────────────────────────────────────────────┘

Test Coverage (QA Agent)
┌──────────────────────────────────────────────────┐
│ Coverage: 94% (45/48 lines)                      │
│ Status: ✅ Meets threshold (90%)                 │
│                                                  │
│ Test Results:                                    │
│   ✅ API tests: 28/28 passing                   │
│   ✅ Integration tests: 12/12 passing           │
│   ✅ E2E tests: 5/5 passing                     │
│                                                  │
│ Untested:                                        │
│   • Error recovery on network failure           │
│   • Concurrent team creation race condition     │
│                                                  │
│ Recommendation: Add 2 more tests for edge cases │
└──────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Review Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Overall Status: ⚠️  Needs Changes

Critical Issues: 1
  🔴 Missing rate limiting (Backend)

High Priority: 2
  🟡 Add pagination to frontend
  🟡 Add optimistic updates

Medium Priority: 3
  🟢 Add audit logging
  🟢 Server-side search
  🟢 Additional edge case tests

Blockers for Deploy: 1 (rate limiting)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 Action Items
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Assigned to Backend Agent:
  /backend fix "Add rate limiting to Teams API"
  /backend fix "Add audit logging"

Assigned to Frontend Agent:
  /frontend fix "Add pagination to Teams list"
  /frontend fix "Add optimistic updates"

Assigned to QA Agent:
  /qa write "Teams edge cases (network, race conditions)"

Next Review: /lead review all (after fixes)
```

### `/lead release`

Plan and execute a release.

```bash
# Plan next release
/lead release plan

# Create release notes
/lead release notes

# Execute release
/lead release deploy production
```

**What happens:**

```
🎯 Tech Lead: Planning Release
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Analyzing changes since last release (v1.4.2)...

📊 Release Scope
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Version: v1.5.0 (Minor - New Features)

Features Added: 3
  ✨ Teams collaboration system
  ✨ Real-time notifications
  ✨ Advanced search with filters

Bug Fixes: 7
  🐛 Fix auth token refresh race condition
  🐛 Fix memory leak in pattern search
  🐛 Fix RLS policy for shared patterns
  ... 4 more

Performance: 2 improvements
  ⚡ Optimize pattern search (+40% faster)
  ⚡ Reduce bundle size (-180 KB)

Breaking Changes: 0

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 Pre-Release Checklist
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ All tests passing (412/412)
✅ Coverage > 90% (94%)
✅ Security audit passed
✅ Documentation updated
✅ Migration scripts tested
✅ Rollback plan prepared
✅ Feature flags configured
⏳ Staging deployment (in progress)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚀 Deployment Plan
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1: Deploy to Staging
  Command: /deploy execute apps/web --env staging
  Duration: 5 minutes
  Status: ✅ Complete

Step 2: Run Smoke Tests
  Command: /qa test --env staging --smoke
  Duration: 3 minutes
  Status: ✅ Complete (23/23 tests passed)

Step 3: Database Migrations
  Command: supabase db push --env production
  Duration: 30 seconds
  Status: ⏳ Pending approval

Step 4: Deploy to Production (Canary)
  Command: /deploy execute apps/web --env production --canary 10%
  Duration: 5 minutes
  Monitor: 15 minutes for errors
  Status: ⏳ Waiting

Step 5: Full Rollout
  Command: /deploy execute apps/web --env production --canary 100%
  Duration: 5 minutes
  Status: ⏳ Waiting

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 Release Notes (Auto-Generated)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

# ekkOS v1.5.0 - Teams & Collaboration

## 🎉 New Features

### Teams Collaboration System
Create teams, invite members, and collaborate on patterns together.
Perfect for organizations using ekkOS across multiple developers.

- Create unlimited teams
- Invite team members via email
- Share patterns within teams
- Role-based permissions (Owner, Admin, Member)

[Learn more](https://docs.ekkos.dev/teams)

### Real-Time Notifications
Get instant updates when patterns are forged, teams are created, or
invitations are received. Powered by Supabase Realtime.

### Advanced Search
Search your patterns with powerful filters:
- Filter by tags, date range, success rate
- Sort by relevance, recency, effectiveness
- Search within specific projects or teams

## 🐛 Bug Fixes

- Fixed auth token refresh race condition causing intermittent logouts
- Fixed memory leak in pattern search affecting long sessions
- Fixed RLS policy allowing unauthorized access to shared patterns
- ... 4 more

## ⚡ Performance Improvements

- Pattern search is now 40% faster (avg 120ms → 72ms)
- Reduced bundle size by 180 KB through code splitting

## 📚 Documentation

- Added Teams feature guide
- Updated API reference for Teams endpoints
- Added troubleshooting guide for common issues

## 🔄 Migration Guide

No breaking changes. Existing users can upgrade seamlessly.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Ready to Deploy
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Confirm production deployment?
  • Yes: /lead release deploy production
  • Review changes: /lead review all
  • Cancel: /lead release cancel
```

### `/lead status`

Check current project status and team health.

```bash
/lead status

# Detailed status
/lead status --detailed

# Specific agent status
/lead status frontend-agent
```

**What happens:**

```
🎯 Tech Lead: Project Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Current Sprint: Week 3 of 4
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Progress: ████████████████░░░░ 78% complete

Active Tasks: 4
Completed: 23
Blocked: 1
Total: 28

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👥 Team Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Frontend Agent: 🟢 Active
  Current: Building Teams settings page
  Progress: 3/4 components complete
  ETA: 2 hours

Backend Agent: 🟢 Active
  Current: API rate limiting implementation
  Progress: 85% complete
  ETA: 1 hour

QA Agent: 🟡 Waiting
  Blocked by: Backend rate limiting task
  Next: Write edge case tests
  ETA: 3 hours (after unblock)

Security Agent: 🟢 Active
  Current: Audit Teams feature
  Progress: 67% complete
  ETA: 1.5 hours

Docs Agent: ⚪ Idle
  Last task: API reference (completed 2h ago)
  Next: Wait for Teams feature completion

DevOps Agent: 🟢 Active
  Current: Monitoring production deployment
  Status: All systems healthy
  Alerts: 0

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 Blockers
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1 critical blocker:
  🔴 QA Agent blocked by Backend rate limiting
     Owner: Backend Agent
     ETA: 1 hour

Action: Monitor Backend progress, auto-unblock when ready

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📈 Metrics (Last 7 Days)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Velocity: 23 tasks/week (↑ 15% from last week)
Code Quality: 4.6/5.0 (⭐⭐⭐⭐⭐)
Test Coverage: 94% (↑ 2%)
Production Incidents: 0 (🎉 Perfect week!)
Deploy Frequency: 14 deploys (2/day average)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎯 Next Milestones
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Teams Feature Complete: 78% (ETA: 6 hours)
⏳ Release v1.5.0: Pending Teams completion
⏳ Start Notifications Feature: After release

Actions:
  • Monitor blockers: /lead status --watch
  • Review progress: /lead review all
  • Help unblock: /lead assist qa-agent
```

## MCP Tools Used

The Tech Lead Agent orchestrates all other agents, using:

- `ekkOS_Plan` - Create structured implementation plans
- `ekkOS_Plans` - Track active plans and progress
- `ekkOS_PlanStatus` - Update plan state
- `ekkOS_PlanStep` - Mark steps complete
- `ekkOS_Generate` - AI-generate plans from context
- `ekkOS_Search` - Find similar past implementations
- `ekkOS_Context` - Get relevant patterns for tasks
- `ekkOS_Codebase` - Analyze project structure
- `ekkOS_Stats` - Team and project metrics
- `ekkOS_Summary` - Recent activity across agents
- `ekkOS_Recall` - Past architectural decisions
- `ekkOS_Conflict` - Check for conflicts before changes
- `Bash` - Execute git, deployment commands
- All specialized agent plugins (Deploy Guardian, Memory Monitor, etc.)

## Integration with Other Agents

The Tech Lead coordinates all specialized agents:

```typescript
// Example: Tech Lead assigns tasks
async function assignTasks(plan: Plan) {
  const tasks = plan.steps;

  // Parallel execution where possible
  const backendTasks = tasks.filter(t => t.type === 'backend');
  const frontendTasks = tasks.filter(t => t.type === 'frontend');

  await Promise.all([
    executeAgent('backend-agent', backendTasks),
    executeAgent('frontend-agent', frontendTasks)
  ]);

  // Sequential for dependent tasks
  const securityTask = tasks.find(t => t.type === 'security');
  await executeAgent('security-agent', [securityTask]);

  const qaTasks = tasks.filter(t => t.type === 'qa');
  await executeAgent('qa-agent', qaTasks);
}
```

## Best Practices

### Let Tech Lead Manage Complexity

**Before Tech Lead:**
```bash
# You manually coordinate:
cd apps/web && npm run build
cd ../memory && vercel deploy
# ... 10+ more commands across agents
```

**With Tech Lead:**
```bash
# Tech Lead orchestrates everything:
/lead plan "Add Teams feature"
/lead assign all
/lead review all
/lead release deploy production
```

### Trust the Review Process

The Tech Lead reviews ALL code before deployment:
- Code quality analysis
- Security audit results
- Test coverage verification
- Architectural consistency
- Performance implications

### Use for Major Features

Tech Lead is perfect for:
- Multi-component features
- Cross-team coordination
- Release management
- Architecture decisions

Not needed for:
- Small bug fixes (use agent directly)
- Single-file changes
- Documentation updates

## Troubleshooting

### Agent Not Responding

**Problem:** Agent assigned but not starting work
**Check:** Agent health with `/lead status frontend-agent`
**Fix:** Restart agent or reassign task

### Blocked Tasks

**Problem:** Task waiting on dependency
**Check:** `/lead status` shows blockers
**Fix:** Prioritize blocking task or remove dependency

### Poor Code Quality

**Problem:** Review shows consistent issues
**Check:** `/lead review` for patterns
**Fix:** Update agent prompts or add constraints

---

## Summary

The Tech Lead Agent is your AI engineering manager that:

✅ **Plans** - Breaks down features into coordinated tasks
✅ **Assigns** - Distributes work to specialized agents
✅ **Reviews** - Ensures code quality and security
✅ **Releases** - Manages deployments safely
✅ **Coordinates** - Unblocks teams and tracks progress

**Let AI manage your dev team.**

```bash
/lead plan "Your feature here"
```

---

**Build faster. Ship smarter. Sleep better.** 🎯
