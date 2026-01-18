# Memory System Monitor

**ADMIN ONLY** - Monitor and manage the 11-layer ekkOS memory architecture.

## Overview

The Memory System Monitor provides deep visibility into ekkOS's memory layers, data integrity, performance metrics, and system health.

## 11-Layer Architecture

| Layer | Name | Storage | Purpose |
|-------|------|---------|---------|
| L1 | Working | RAM | Current session state |
| L2 | Episodic | PostgreSQL | Past conversations |
| L3 | Semantic | Vector DB | Embeddings & knowledge |
| L4 | Patterns | PostgreSQL | Proven solutions |
| L5 | Procedural | PostgreSQL | Step-by-step guides |
| L6 | Collective | PostgreSQL | Cross-user wisdom |
| L7 | Meta | PostgreSQL | Pattern effectiveness |
| L8 | Codebase | Vector DB | Project-specific patterns |
| L9 | Directives | PostgreSQL | User preferences |
| L10 | Conflict | In-memory | Contradiction resolution |
| L11 | Secrets | PostgreSQL (encrypted) | Credentials |

## Commands

### `/memory-health`

Comprehensive health check of all memory layers.

```bash
# Check all layers
/memory-health

# Check specific layer
/memory-health --layer 4

# Detailed diagnostics
/memory-health --detailed

# Check data integrity
/memory-health --integrity
```

**Example Output:**
```
🧠 ekkOS Memory System Health
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Overall Health: 92/100 (Excellent) ✅

───────────────────────────────────────────────────────────────────
📊 Layer-by-Layer Status

L1 (Working Memory)
  Status: ✅ Healthy
  Active Sessions: 1,245
  Memory Usage: 2.3 GB / 8 GB
  Performance: Excellent (< 10ms access)

L2 (Episodic Memory)
  Status: ✅ Healthy
  Total Episodes: 45,892
  Growth: +234 this week
  Oldest: 6 months ago
  Performance: Good (45ms avg query)

L3 (Semantic Memory)
  Status: ✅ Healthy
  Total Embeddings: 123,456
  Vector Dimensions: 1536
  Index Size: 4.2 GB
  Performance: Excellent (< 100ms search)

L4 (Patterns)
  Status: ✅ Healthy
  Total Patterns: 3,452
  Success Rate: 84% avg
  Active Patterns: 2,987 (87%)
  Stale Patterns: 465 (13%)
  Performance: Excellent (< 50ms query)

L5 (Procedural)
  Status: ⚠️  Warning
  Total Workflows: 89
  Issue: 12 workflows have > 30% step failure rate
  Recommendation: Review and update failing workflows
  Performance: Good (80ms avg)

L6 (Collective)
  Status: ✅ Healthy
  Collective Patterns: 856
  Contributors: 234 users
  K-Anonymity: Maintained (k=5)
  Performance: Good (120ms avg)

L7 (Meta)
  Status: ✅ Healthy
  Effectiveness Tracking: Active
  Success Metrics: Updated daily
  Pattern Evolution: 23 patterns evolved this week
  Performance: Excellent

L8 (Codebase)
  Status: ✅ Healthy
  Indexed Projects: 1,456
  Total Schemas: 8,923
  Indexing Current: No
  Performance: Good (150ms avg)

L9 (Directives)
  Status: ✅ Healthy
  Total Directives: 4,567
  ├─ MUST: 1,234
  ├─ NEVER: 892
  ├─ PREFER: 1,678
  └─ AVOID: 763
  Conflicts Detected: 3 (auto-resolved)
  Performance: Excellent (< 20ms)

L10 (Conflict Resolution)
  Status: ✅ Healthy
  Active Conflicts: 3
  Resolved Today: 12
  Resolution Rate: 98%
  Performance: Immediate (in-memory)

L11 (Secrets)
  Status: 🔒 Secure
  Total Secrets: 892
  Encryption: AES-256-GCM ✅
  Stale Secrets (90+ days): 23
  Recommendation: Rotate stale secrets
  Performance: Excellent (< 30ms decrypt)

───────────────────────────────────────────────────────────────────
⚠️  Issues Requiring Attention

1. Layer 5 (Procedural)
   • 12 workflows with high failure rates
   • Review with: /memory-health --layer 5 --show-failing

2. Layer 11 (Secrets)
   • 23 stale secrets (90+ days old)
   • Rotate with: /memory-health --rotate-stale-secrets

───────────────────────────────────────────────────────────────────
📈 Performance Metrics

Query Performance:
  • Fastest: L1 Working (< 10ms)
  • Slowest: L8 Codebase (150ms avg)
  • Overall: Excellent

Storage Efficiency:
  • Total Storage: 24.5 GB
  • Growth Rate: +1.2 GB/month
  • Optimization: Well-indexed

Memory Growth:
  • Patterns: +45/week
  • Episodes: +234/week
  • Embeddings: +892/week
  • Trend: Healthy growth

───────────────────────────────────────────────────────────────────
🔧 Recommended Actions

1. Review failing workflows in L5
2. Rotate 23 stale secrets in L11
3. Archive stale patterns in L4 (465 candidates)
4. Run optimization: /memory-optimize

Next health check recommended: Tomorrow
```

### `/memory-stats`

Detailed statistics for specific layer.

```bash
# Stats for patterns
/memory-stats patterns

# Stats for specific user
/memory-stats --user user_abc123

# Stats for all layers
/memory-stats --all

# Export stats to file
/memory-stats --export stats.json
```

**Example:**
```bash
/memory-stats patterns

🧠 Layer 4: Patterns - Detailed Statistics
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Patterns: 3,452

───────────────────────────────────────────────────────────────────
📊 By Success Rate

⭐⭐⭐⭐⭐ (90-100%): 1,456 patterns (42%)
⭐⭐⭐⭐☆ (80-90%):  892 patterns (26%)
⭐⭐⭐☆☆ (70-80%):  534 patterns (15%)
⭐⭐☆☆☆ (60-70%):  245 patterns (7%)
⭐☆☆☆☆ (< 60%):    325 patterns (9%)

Average Success Rate: 84%

───────────────────────────────────────────────────────────────────
📈 By Usage

Highly Used (50+ times): 234 patterns
Moderately Used (10-50): 1,245 patterns
Low Use (1-10): 1,508 patterns
Never Used: 465 patterns (13%)

───────────────────────────────────────────────────────────────────
🏷️ By Category

TypeScript: 892 patterns (26%)
API/Backend: 678 patterns (20%)
React/Frontend: 534 patterns (15%)
Database: 423 patterns (12%)
DevOps: 312 patterns (9%)
Security: 289 patterns (8%)
Testing: 178 patterns (5%)
Other: 146 patterns (4%)

───────────────────────────────────────────────────────────────────
👥 By Contributor

Top Contributors:
  1. user_xyz123: 456 patterns (94% success)
  2. user_abc789: 389 patterns (89% success)
  3. user_def456: 312 patterns (87% success)
  [... top 10 ...]

Total Contributors: 234 users

───────────────────────────────────────────────────────────────────
📅 By Age

This Week: 45 patterns
This Month: 189 patterns
This Quarter: 567 patterns
This Year: 2,134 patterns
Older: 1,318 patterns

───────────────────────────────────────────────────────────────────
⚠️  Quality Issues

Low Success Rate (< 60%): 325 patterns
Never Applied: 465 patterns
Stale (90+ days unused): 234 patterns

Recommendations:
  • Archive stale patterns
  • Update low-success patterns
  • Promote high-success to collective
```

### `/memory-optimize`

Optimize memory system performance.

```bash
# Run all optimizations
/memory-optimize

# Optimize specific layer
/memory-optimize --layer 4

# Dry run (show what would be done)
/memory-optimize --dry-run

# Force full optimization
/memory-optimize --force
```

**What it does:**
- Archives stale patterns
- Rebuilds indexes
- Vacuums PostgreSQL tables
- Optimizes vector searches
- Removes orphaned data
- Compacts storage

**Example:**
```bash
/memory-optimize

🔧 Memory System Optimization
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Starting optimization...

───────────────────────────────────────────────────────────────────
L4 (Patterns)

[████████░░░░░░░░░░░░] 40% - Archiving stale patterns...
  • Archived 465 stale patterns
  • Freed 234 MB

[████████████░░░░░░░░] 60% - Rebuilding indexes...
  • Rebuilt pattern_title_idx
  • Rebuilt pattern_tags_idx
  • Query performance: +15%

[████████████████░░░░] 80% - Vacuuming tables...
  • Vacuumed learning_patterns
  • Reclaimed 89 MB

[████████████████████] 100% - Complete!

L3 (Semantic Memory)

[████████████████████] 100% - Optimizing vector index...
  • Reindexed 123,456 vectors
  • Search performance: +8%

───────────────────────────────────────────────────────────────────
✅ Optimization Complete!

Performance Improvements:
  • Pattern queries: +15% faster
  • Vector searches: +8% faster
  • Storage freed: 323 MB

Next optimization recommended: 1 week
```

### `/memory-integrity`

Check data integrity across layers.

```bash
# Check all layers
/memory-integrity

# Check specific layer
/memory-integrity --layer 4

# Fix issues automatically
/memory-integrity --fix

# Show details
/memory-integrity --verbose
```

**What it checks:**
- Referential integrity (foreign keys)
- Data consistency
- Orphaned records
- Missing embeddings
- Duplicate patterns
- Corrupted data

**Example:**
```bash
/memory-integrity

🔍 Data Integrity Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Scanning all layers...

───────────────────────────────────────────────────────────────────
✅ L1 (Working): No issues

✅ L2 (Episodic): No issues

⚠️  L3 (Semantic): Minor issues found
  • 12 embeddings without source records
  • Fix: Delete orphaned embeddings
  • Impact: Minimal

✅ L4 (Patterns): No issues

⚠️  L5 (Procedural): Minor issues found
  • 3 workflows reference deleted patterns
  • Fix: Update workflow references
  • Impact: Low

✅ L6-L11: No issues

───────────────────────────────────────────────────────────────────
📊 Summary

Total Issues: 2 minor
Critical: 0
Warnings: 2
Info: 0

Recommended: Run /memory-integrity --fix

───────────────────────────────────────────────────────────────────
🔧 Auto-Fix Available

Run this to fix all issues:
  /memory-integrity --fix

Or fix manually:
  • L3: DELETE FROM embeddings WHERE source_id NOT IN (SELECT id FROM sources)
  • L5: UPDATE workflows SET pattern_ids = ... WHERE ...
```

### `/memory-query`

Advanced querying across memory layers.

```bash
# Query patterns by criteria
/memory-query patterns --success-rate ">90" --usage ">50"

# Find patterns by user
/memory-query patterns --user user_xyz123

# Find secrets expiring soon
/memory-query secrets --expiring-within 30days

# Complex query
/memory-query patterns --tags "typescript,api" --created-after "2025-01-01"
```

### `/memory-export`

Export memory data for backup or analysis.

```bash
# Export all layers
/memory-export --all

# Export specific layer
/memory-export --layer 4

# Export for specific user
/memory-export --user user_xyz123

# Export with encryption
/memory-export --encrypted --password "..."
```

### `/memory-import`

Import memory data from backup.

```bash
# Import from file
/memory-import backup.json

# Import specific layer
/memory-import backup.json --layer 4

# Merge strategy
/memory-import backup.json --merge skip-existing
```

## PM2 Worker Management

### Brain Workers (via Railway)

| Worker | Purpose | Schedule |
|--------|---------|----------|
| `brain-decay` | Pattern cleanup & decay | Daily 1 AM |
| `judge-queue` | Episode judging | Daily 2 AM |
| `pattern-stats-recalc` | Recalculate success rates | Daily 1 AM |
| `pattern-generalize-grok` | Generalize patterns | Daily 2 AM |
| `pattern-promote-collective` | Promote to collective | Weekly Sun 3 AM |
| `pattern-cluster-hdbscan` | Cluster duplicates | Weekly Sun 4 AM |

**Check worker status:**
```bash
/memory-health --workers

# Shows:
# - Last run time
# - Success/failure
# - Next scheduled run
# - Logs/errors
```

## MCP Tools Used

- `ekkOS_Stats` - Get memory layer statistics
- `ekkOS_Search` - Query patterns and data
- `ekkOS_Export` - Export memory data
- `ekkOS_Import` - Import memory data
- `ekkOS_Summary` - Recent activity summary
- `Bash` - Execute database queries and PM2 commands
- `supabase_execute_sql` - Direct database access

## Database Queries

The plugin can execute Supabase queries for deep inspection:

```sql
-- Find stale patterns
SELECT id, title, last_used_at
FROM learning_patterns
WHERE last_used_at < NOW() - INTERVAL '90 days';

-- Pattern success rates
SELECT
  title,
  success_count,
  failure_count,
  (success_count::float / NULLIF(success_count + failure_count, 0)) * 100 as success_rate
FROM learning_patterns
ORDER BY success_rate DESC
LIMIT 20;

-- User contribution stats
SELECT
  user_id,
  COUNT(*) as pattern_count,
  AVG(success_rate) as avg_success
FROM learning_patterns
GROUP BY user_id
ORDER BY pattern_count DESC
LIMIT 10;
```

## Troubleshooting

### High Memory Usage

**Problem:** L1 (Working) using too much RAM
**Check:** /memory-health --layer 1
**Fix:**
- Reduce active sessions
- Increase RAM allocation
- Optimize session cleanup

### Slow Pattern Queries

**Problem:** L4 queries taking > 500ms
**Check:** /memory-health --layer 4 --performance
**Fix:**
- Run optimization: /memory-optimize --layer 4
- Rebuild indexes
- Archive stale patterns

### Missing Embeddings

**Problem:** Patterns without semantic embeddings
**Check:** /memory-integrity --layer 3
**Fix:**
- Regenerate embeddings
- Check embedding service status
- Backfill missing vectors

### Worker Failures

**Problem:** Brain-decay worker failing
**Check:** /memory-health --workers
**Fix:**
- Check Railway logs
- Verify database connection
- Restart worker: pm2 restart brain-decay

---

**Monitor deeply. Optimize regularly. Maintain integrity.** 🧠
