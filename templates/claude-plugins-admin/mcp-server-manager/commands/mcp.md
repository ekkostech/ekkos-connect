# MCP Server Manager

**ADMIN ONLY** - Manage the ekkOS MCP server (apps/memory deployed to api.ekkos.dev).

## Commands

### `/mcp status`
Check MCP server health and all 31 tools.

```bash
/mcp status

🔧 MCP Server Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Server: api.ekkos.dev (apps/memory)
Status: ✅ Healthy
Uptime: 15 days, 3 hours
Version: v2.45.1

Tool Health (31 total):
✅ 31/31 tools responding
⚡ Avg response time: 145ms

Recent Errors: 0 (last hour)
Active Connections: 1,245 users

Quick Actions:
- Restart: /mcp restart
- View logs: /mcp logs
- Test tools: /mcp test-tools
```

### `/mcp restart`
Restart MCP server (deploys latest from Vercel).

### `/mcp logs`
View MCP server logs and errors.

### `/mcp test-tools`
Test all 31 MCP tools are responding.

```bash
/mcp test-tools

Testing 31 MCP tools...
✅ ekkOS_Search (125ms)
✅ ekkOS_Forge (89ms)
✅ ekkOS_Directive (45ms)
[... all 31 tools ...]

Result: 31/31 passed ✅
```

### `/mcp debug`
Debug specific tool issues.

```bash
/mcp debug ekkOS_Search

🔍 Debugging: ekkOS_Search
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Last 10 calls:
✅ 145ms - query: "auth patterns"
✅ 123ms - query: "deploy errors"
❌ TIMEOUT - query: "schema validation" (> 30s)
✅ 98ms - query: "typescript"

Error details:
- Timeout on complex query
- Database connection pool exhausted
- Recommendation: Increase pool size or optimize query
```

## MCP Tools Used

- `ekkOS_Summary` - Get MCP activity
- `ekkOS_Stats` - Server statistics
- `Bash` - Execute server commands
- `supabase_get_logs` - View API logs

---

**Keep the MCP server healthy.** 🔧
