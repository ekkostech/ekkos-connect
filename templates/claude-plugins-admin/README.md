# ekkOS Admin Agents

**INTERNAL USE ONLY** - AI agent team for building and managing ekkOS infrastructure.

## Overview

This directory contains specialized AI agents that act as your dev team members. Each agent is an expert in a specific domain and can autonomously handle complex tasks.

## 🎯 The AI Dev Team

### Orchestrator
- **Tech Lead Agent** (`/lead`) - Manages project, creates plans, assigns tasks, reviews work, coordinates releases

### Core Development (70% coverage)
- **Frontend Agent** (`/frontend`) - React, Next.js, TypeScript, Tailwind CSS
- **Backend Agent** (`/backend`) - APIs, database schemas, Supabase, RLS

### Quality & Operations (90% coverage)
- **QA Agent** (`/qa`) - Testing, coverage, quality assurance
- **DevOps Agent** (via existing plugins) - Deploy Guardian, Memory Monitor, MCP Manager

### 24/7 Monitoring
- **Autonomous Admin Agent** (`/agent`) - Monitors infrastructure 24/7, intelligently uses other agents

### Infrastructure Management (via existing plugins)
- **Deploy Guardian** (`/deploy`) - Vercel & Railway deployment safety
- **Memory System Monitor** (`/memory-health`) - 11-layer memory health
- **MCP Server Manager** (`/mcp`) - MCP server operations (api.ekkos.dev)

## 🔒 Security Notice

**INTERNAL USE ONLY - ekkOS Team**

These agents are NOT bundled in the user-facing extension. They access ekkOS infrastructure and must remain separate to prevent any risk of admin data leaking to users.

## Quick Start

### Deploy Admin Agents

**Option 1: Run deployment script (recommended)**

```bash
# From repo root
./scripts/deploy-admin-agents.sh
```

**Option 2: Manual copy**

```bash
# Copy admin plugins directly
cp -r /Volumes/MacMiniPort/DEV/EKKOS/extensions/ekkos-connect/templates/claude-plugins-admin/* \
      ~/.claude/plugins/ekkos-admin/
```

This installs all 8 agents to `~/.claude/plugins/ekkos-admin/`

### Using Agents

#### 1. Tech Lead - Project Management

```bash
# Create implementation plan
/lead plan "Add Teams collaboration feature"

# Assign tasks to specialized agents
/lead assign all

# Review completed work
/lead review all

# Plan release
/lead release plan

# Check project status
/lead status
```

**When to use:** Complex features, multi-component work, releases

#### 2. Frontend Agent - UI Development

```bash
# Build new component/page
/frontend build "Teams dashboard page"

# Fix UI bugs
/frontend fix "Teams list not paginating"

# Optimize performance
/frontend optimize "Dashboard page"
```

**When to use:** React components, pages, UI logic

#### 3. Backend Agent - API & Database

```bash
# Design database schema
/backend schema "Teams with members and roles"

# Build REST API
/backend api "Teams CRUD operations"

# Fix backend issues
/backend fix "Add rate limiting to Teams API"

# Optimize queries
/backend optimize "Pattern search query"
```

**When to use:** Database design, API endpoints, server-side logic

#### 4. QA Agent - Testing

```bash
# Write comprehensive tests
/qa write "Teams API endpoints"

# Run tests with coverage
/qa test --coverage

# Regression testing
/qa regression

# E2E testing
/qa e2e "Create team and invite member"
```

**When to use:** After building features, before deployments

#### 5. Autonomous Agent - 24/7 Monitoring

```bash
# Start autonomous monitoring
/agent start

# Check agent status
/agent status

# View agent activity log
/agent logs

# Configure agent behavior
/agent config
```

**When to use:** Set it and forget it - runs continuously

#### 6. Deploy Guardian

```bash
# Check deployments before pushing
/deploy check --all-vercel

# Execute deployment
/deploy execute apps/memory --env production

# Monitor post-deployment
/deploy monitor apps/memory

# Rollback if needed
/deploy rollback apps/memory
```

**When to use:** Before every deployment, incident response

#### 7. Memory System Monitor

```bash
# Check memory health
/memory-health

# Optimize memory layers
/memory-optimize --layer 4

# Check data integrity
/memory-integrity

# Export/import memory
/memory-export
/memory-import data.json
```

**When to use:** Daily health checks, performance issues

#### 8. MCP Server Manager

```bash
# Check MCP server health
/mcp status

# Test all 31 tools
/mcp test-tools

# Restart server
/mcp restart

# Debug specific tool
/mcp debug ekkOS_Search
```

**When to use:** MCP tool issues, monitoring

## Complete Workflow Example

### Building a New Feature: Teams Collaboration

```bash
# 1. Tech Lead creates plan
/lead plan "Add Teams collaboration feature"

# Output: 7 tasks created
#   Task 1: Database schema (Backend Agent)
#   Task 2: API endpoints (Backend Agent)
#   Task 3: Teams dashboard (Frontend Agent)
#   Task 4: Team settings (Frontend Agent)
#   Task 5: Security audit (Security Agent)
#   Task 6: Test suite (QA Agent)
#   Task 7: Documentation (Docs Agent)

# 2. Assign and execute
/lead assign all

# Agents work in parallel:
# - Backend Agent creates schema + API (4 hours)
# - Frontend Agent builds UI components (4 hours, parallel)
# - QA Agent writes tests (3 hours)
# - Security Agent audits (2 hours)

# 3. Review work
/lead review all

# Output: 1 critical issue (missing rate limiting)

# 4. Fix issues
/backend fix "Add rate limiting to Teams API"

# 5. Final review
/lead review all
# Output: All checks passed ✅

# 6. Deploy
/deploy check apps/web
/deploy execute apps/web --env production

# 7. Monitor
/agent status
# Autonomous agent monitors deployment automatically

# Total time: ~14 hours with parallelization
# Manual time estimate: ~40 hours (65% time savings)
```

## Agent Coordination

Agents coordinate through the Tech Lead:

```
User Request
    ↓
Tech Lead (orchestrator)
    ├─→ Backend Agent  ────┐
    ├─→ Frontend Agent ────┤
    ├─→ QA Agent       ────┤─→ Parallel Execution
    ├─→ Security Agent ────┤
    └─→ DevOps Agent   ────┘
    ↓
Review & Deploy
```

## Cost Analysis

### vs Hiring Team

| Role | Annual Salary | Agent Cost | Savings |
|------|---------------|------------|---------|
| Tech Lead | $180,000 | $0 | $180,000 |
| Frontend Dev | $150,000 | $0 | $150,000 |
| Backend Dev | $150,000 | $0 | $150,000 |
| QA Engineer | $130,000 | $0 | $130,000 |
| DevOps Engineer | $160,000 | $0 | $160,000 |
| **Total** | **$770,000/year** | **~$15,000/year** | **$755,000/year** |

*Agent costs: ~$0.03/1K tokens, ~500M tokens/year at full scale*

### Coverage

- **Phase 1** (Tech Lead + Frontend + Backend): **70% coverage**
- **Phase 2** (+ QA + DevOps): **90% coverage**
- **Phase 3** (+ Docs + Security + Data): **100% coverage**

## MCP Tools Used

All agents leverage the 31 ekkOS MCP tools:

- `ekkOS_Search` - Find past solutions
- `ekkOS_Forge` - Save new patterns
- `ekkOS_Context` - Get relevant context
- `ekkOS_Plan` - Create task plans
- `ekkOS_IndexSchema` - Work with database schemas
- `ekkOS_Codebase` - Search project code
- All specialized tools (see CLAUDE.md)

## Best Practices

### 1. Let Tech Lead Coordinate

**Good:**
```bash
/lead plan "Add feature"
/lead assign all
/lead review all
```

**Not ideal:**
```bash
/frontend build "component"
/backend api "endpoint"
/qa test "feature"
# Manual coordination required
```

### 2. Start Autonomous Agent Early

```bash
# Set it up once
/agent start --background

# It handles:
# - Routine health checks
# - Pre-deployment verification
# - Issue detection
# - Preventive maintenance
```

### 3. Review Before Deploy

**Always:**
```bash
/lead review all        # Review all changes
/deploy check apps/web  # Pre-deployment check
/deploy execute apps/web --env production
```

### 4. Trust the Agents

Agents are trained on ekkOS patterns:
- Follow established conventions
- Maintain high code quality
- Ensure security and performance
- Test thoroughly

## Troubleshooting

### Agent Not Responding

**Problem:** Agent command not recognized
**Fix:** Ensure plugins deployed: `ekkOS: Deploy Admin Agents to Claude Code`

### Agents Making Wrong Decisions

**Problem:** Agent implementing wrong pattern
**Check:** Review agent's reasoning in output
**Fix:** Provide clearer instructions or correct via `/lead review`

### Coordination Issues

**Problem:** Agents working on conflicting changes
**Solution:** Use Tech Lead to coordinate: `/lead plan` then `/lead assign`

## Security

**IMPORTANT:** Admin agents are for ekkOS team only!

- ✅ Access to ekkOS infrastructure (Vercel, Railway, Supabase)
- ✅ Can deploy to production
- ✅ Can modify database schemas
- ❌ NOT for user deployment
- ❌ NOT in public extension

User-facing plugins are in `templates/claude-plugins/`

## File Structure

```
claude-plugins-admin/
├── README.md (this file)
├── AGENT_TEAM_PROPOSALS.md (full architecture doc)
│
├── tech-lead-agent/
│   ├── .claude-plugin/plugin.json
│   └── commands/lead.md
│
├── frontend-agent/
│   ├── .claude-plugin/plugin.json
│   └── commands/frontend.md
│
├── backend-agent/
│   ├── .claude-plugin/plugin.json
│   └── commands/backend.md
│
├── qa-agent/
│   ├── .claude-plugin/plugin.json
│   └── commands/qa.md
│
├── autonomous-admin-agent/
│   ├── .claude-plugin/plugin.json
│   └── commands/agent.md
│
├── deploy-guardian/
│   ├── .claude-plugin/plugin.json
│   └── commands/deploy.md
│
├── memory-system-monitor/
│   ├── .claude-plugin/plugin.json
│   └── commands/memory-health.md
│
└── mcp-server-manager/
    ├── .claude-plugin/plugin.json
    └── commands/mcp.md
```

## Next Steps

1. **Deploy agents:**
   - Run command: `ekkOS: Deploy Admin Agents to Claude Code`

2. **Test with simple task:**
   - `/lead plan "Fix typo in README"`

3. **Build feature:**
   - `/lead plan "Your feature"`
   - `/lead assign all`

4. **Start autonomous monitoring:**
   - `/agent start --background`

## Documentation

- Full architecture: `AGENT_TEAM_PROPOSALS.md`
- User plugins: `../claude-plugins/README.md`
- ekkOS docs: https://docs.ekkos.dev

---

**Your AI Dev Team. Build 10x faster.** 🚀
