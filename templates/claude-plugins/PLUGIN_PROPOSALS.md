# Additional Plugin Proposals for ekkOS Users

**Based on 31 MCP Tools + Multi-Tool Combinations**

This document proposes 10 additional user-focused plugins beyond the 5 core plugins (Memory Lens, Pattern Coach, Learning Tracker, Golden Loop Monitor, Project Schema Validator).

---

## Current Plugin Coverage (5 Plugins)

| Plugin | Commands | MCP Tools Used | Golden Loop Phase |
|--------|----------|----------------|-------------------|
| Memory Lens | `/memory-search` | ekkOS_Search, ekkOS_Stats | RETRIEVE |
| Pattern Coach | `/forge` | ekkOS_Forge, ekkOS_Directive, ekkOS_Search | LEARN |
| Learning Tracker | `/my-patterns` | ekkOS_Stats, ekkOS_Search | Monitor (Growth) |
| Golden Loop Monitor | `/loop-status` | ekkOS_Summary, ekkOS_Stats, ekkOS_Search | Monitor (Health) |
| Project Schema Validator | `/validate-schema` | ekkOS_IndexSchema, ekkOS_GetSchema, ekkOS_Codebase | APPLY |

**MCP Tools Covered:** 8/31 (26%)

**Tools NOT yet used in plugins (but ALL are user-facing):**
- ekkOS_Context
- ekkOS_Capture (manual event capture)
- ekkOS_Outcome (manual outcome tracking)
- ekkOS_Detect (show detected patterns)
- ekkOS_Conflict
- ekkOS_Recall
- ekkOS_Track (manual pattern tracking)
- ekkOS_Reflect
- ekkOS_Export/Import
- ekkOS_Plan family (8 tools - ALL user-facing, not admin)
- ekkOS_Secret family (5 tools)

**IMPORTANT:** All 31 MCP tools are user-facing tools attached to user IDs, not admin tools. Plan management, tracking, and capture tools are meant for users to manage their own work.

**SECURITY:** While all tools are user-facing, plugins MUST ensure data isolation:
- Only show data for the authenticated user (user_id scoped)
- Never expose other users' patterns, plans, secrets, or memory
- Never expose ekkOS internal/admin data
- Use `user_only` filters in ekkOS_Search
- Verify user_id matches on all operations
- Secrets remain encrypted and user-scoped

---

## Proposed Additional Plugins (11)

### 1. 🕰️ Time Travel Debugger

**Command:** `/time-travel`

**Purpose:** "What was I working on when this bug appeared? What changed since then?"

**User Need:** Developers need to reconstruct context from past work to understand when/why bugs were introduced.

**Multi-Tool Combination:**
- `ekkOS_Recall` - Get conversations from specific timeframe
- `ekkOS_Search` - Find patterns related to the bug
- `ekkOS_Codebase` - Search code changes
- `ekkOS_Summary` - Recent activity summary

**Example Usage:**
```bash
# Recall what happened 2 days ago
/time-travel --days-ago 2

# Find when you last worked on auth
/time-travel "authentication" --last-week

# Debug: "When did I change the login flow?"
/time-travel "login flow changes"
```

**Example Output:**
```
🕰️ Time Travel: 2 days ago (Jan 5, 2026)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 Conversations on Jan 5:

10:30 AM - "Fix JWT expiration bug"
  • You discovered JWT tokens expiring too early
  • Changed expiration from 1h to 24h
  • Forged pattern: "Set JWT expiration to 24h for web apps"

2:15 PM - "Add user profile API endpoint"
  • Created /api/users/[id]/profile
  • Added profile image upload
  • Modified User model: added profileImageUrl

4:45 PM - "Database migration for profiles"
  • Added profileImageUrl to users table
  • IMPORTANT: Changed avatarUrl → profileImageUrl

───────────────────────────────────────────────────────────────────
🔍 Related Patterns Forged That Day:

1. "JWT tokens should be 24h for web, 7d for mobile"
2. "Always update TypeScript types after Prisma schema changes"
3. "Use signed URLs for S3 uploads, not public buckets"

───────────────────────────────────────────────────────────────────
💡 Why This Matters Now:

Current bug: "Cannot access user.avatarUrl"

Cause: On Jan 5 at 4:45 PM, you renamed the field!
  Old: avatarUrl
  New: profileImageUrl

Fix: Update your code to use profileImageUrl instead.

───────────────────────────────────────────────────────────────────
🔗 Related Commands:

• See that day's patterns: /my-patterns --date 2026-01-05
• Check schema: /validate-schema users
• Fix field names: Update all avatarUrl → profileImageUrl
```

**Value:** Helps debug "when did this break?" questions by showing historical context.

---

### 2. 🔐 Secret Vault

**Command:** `/secrets`

**Purpose:** Manage all credentials, API keys, and sensitive config in one secure place.

**User Need:** Developers need a secure, convenient way to store and use API keys, tokens, passwords without hardcoding them.

**Multi-Tool Combination:**
- `ekkOS_StoreSecret` - Encrypt and save secrets
- `ekkOS_GetSecret` - Retrieve decrypted secrets
- `ekkOS_ListSecrets` - Show what's stored (metadata only)
- `ekkOS_RotateSecret` - Update secrets (key rotation)
- `ekkOS_DeleteSecret` - Remove secrets

**Example Usage:**
```bash
# Store a secret
/secrets store github ghp_abc123xyz789

# List all secrets
/secrets list

# Get a secret
/secrets get github

# Rotate a secret (update)
/secrets rotate github ghp_NEW_KEY

# Delete a secret
/secrets delete github
```

**Example Output:**
```
🔐 Secret Vault
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Your Stored Secrets:

1. ✅ github
   Type: API Key
   Stored: 2 weeks ago
   Last accessed: 3 hours ago
   Expiry: Never

2. ✅ openai
   Type: API Key
   Stored: 1 month ago
   Last accessed: Today
   Expiry: Never

3. ✅ stripe
   Type: API Key
   Stored: 3 days ago
   Last accessed: 2 days ago
   Expiry: Never

4. ⚠️  aws-access-key
   Type: Credential
   Stored: 6 months ago
   Last accessed: Never
   Expiry: STALE (recommend rotation)

5. ✅ database-url
   Type: Connection String
   Stored: 1 week ago
   Last accessed: Today
   Expiry: Never

───────────────────────────────────────────────────────────────────
🔒 Security Status: GOOD

All secrets encrypted with AES-256-GCM.
No secrets exposed in code or logs.

⚠️  1 stale secret detected (aws-access-key)
   → Run: /secrets rotate aws-access-key

───────────────────────────────────────────────────────────────────
📖 Quick Actions:

• Add new secret: /secrets store <name> <value>
• Get secret: /secrets get <name>
• View secret (masked): /secrets get <name> --masked
• Rotate key: /secrets rotate <name> <new-value>
• Delete: /secrets delete <name>

───────────────────────────────────────────────────────────────────
💡 Best Practices:

✅ Store all API keys here (never hardcode)
✅ Use masked mode to check without revealing
✅ Rotate keys every 90 days
✅ Delete unused secrets
❌ Don't share secrets via chat/email
❌ Don't commit .env files with real keys
```

**Value:** Secure, convenient credential management with audit trail.

---

### 3. ⚠️ Pre-Flight Checker

**Command:** `/check`

**Purpose:** "Is it safe to run this command? Will I break something?"

**User Need:** Developers need confidence before running destructive operations (delete, deploy, drop database, etc.).

**Multi-Tool Combination:**
- `ekkOS_Conflict` - Check against user directives
- `ekkOS_Search` - Find past incidents with this action
- `ekkOS_Directive` - Show relevant NEVER/MUST rules
- `ekkOS_Recall` - "Last time I did this..."

**Example Usage:**
```bash
# Check before deleting
/check "delete all files in /tmp"

# Check before deploy
/check "deploy to production"

# Check before migration
/check "drop users table"

# Check command safety
/check "rm -rf node_modules"
```

**Example Output - Safe:**
```
⚠️  Pre-Flight Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Proposed Action: "rm -rf node_modules"

───────────────────────────────────────────────────────────────────
✅ SAFE TO PROCEED

No conflicts or warnings detected.

───────────────────────────────────────────────────────────────────
📊 Analysis:

✅ No user directives prohibit this action
✅ No past incidents with this command
✅ Standard node.js operation
✅ Can be recovered (npm install)

───────────────────────────────────────────────────────────────────
💡 Recommendation:

This is safe. Deleting node_modules is a common troubleshooting step.

After deletion, run: npm install
```

**Example Output - Dangerous:**
```
⚠️  Pre-Flight Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Proposed Action: "deploy to production"

───────────────────────────────────────────────────────────────────
🚨 STOP! Issues Detected

❌ 3 conflicts found

───────────────────────────────────────────────────────────────────
❌ Conflict #1: User Directive (NEVER)

Rule: "Never deploy to production on Friday"
Created: 3 months ago (after production incident)
Reason: "Fridays = no one around for weekend issues"

Current day: Friday, Jan 7, 2026

⛔ This action violates your rule!

───────────────────────────────────────────────────────────────────
❌ Conflict #2: Past Incident

Date: Dec 15, 2025 (3 weeks ago)
Incident: "Production deploy broke authentication"
Pattern forged: "Always run tests before deploying"

Have you run tests? If not, DON'T deploy yet.

───────────────────────────────────────────────────────────────────
❌ Conflict #3: User Directive (MUST)

Rule: "Must have code review before production deploy"
Created: 2 months ago

Current PR status: No reviews yet

⛔ Get review first!

───────────────────────────────────────────────────────────────────
🔧 Required Steps Before Proceeding:

[ ] 1. Wait until Monday (or override if emergency)
[ ] 2. Run full test suite: npm test
[ ] 3. Get code review approval on PR
[ ] 4. Verify staging environment works
[ ] 5. Have rollback plan ready

───────────────────────────────────────────────────────────────────
🚨 High Risk Action

If you proceed anyway, you're ignoring:
  • Your own rules (set for a reason!)
  • Past incidents (already broke prod once)
  • Best practices (untested code to production)

Recommendation: DON'T DEPLOY until requirements met.

───────────────────────────────────────────────────────────────────
❓ Emergency Override?

If this is truly urgent:
  1. /check --override "Reason for emergency deploy"
  2. Document why you're overriding safety checks
  3. Be prepared to rollback if needed
```

**Value:** Prevents repeating past mistakes, enforces safety rules, builds institutional knowledge.

---

### 4. 📈 Pattern Quality Coach

**Command:** `/improve-patterns`

**Purpose:** "Which of my patterns are low-quality? How can I make them better?"

**User Need:** Users want to improve their pattern library quality over time.

**Multi-Tool Combination:**
- `ekkOS_Search` - Get all user patterns
- `ekkOS_Stats` - Get success rates
- `ekkOS_Outcome` - Outcome tracking data
- `ekkOS_Reflect` - Analyze pattern quality
- `ekkOS_Forge` - Update patterns

**Example Usage:**
```bash
# Analyze all patterns
/improve-patterns

# Show only low-quality patterns
/improve-patterns --low-quality

# Analyze specific pattern
/improve-patterns pat_abc123

# Get improvement suggestions
/improve-patterns --suggest
```

**Example Output:**
```
📈 Pattern Quality Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Analyzing your 42 patterns...

───────────────────────────────────────────────────────────────────
✅ High Quality (30 patterns)

Average success rate: 91%
These patterns are working great! Keep using them.

───────────────────────────────────────────────────────────────────
⚠️  Needs Improvement (7 patterns)

1. "Fix webpack build errors" - 45% success ⭐⭐☆☆☆
   Problem: Too vague, applies to many different errors

   Suggestion:
     • Split into specific patterns:
       - "Fix webpack module not found"
       - "Fix webpack CSS loader issues"
       - "Fix webpack memory errors"
     • Add "works_when" conditions
     • Include example error messages

   Action: /forge --update pat_abc123

2. "API timeout handling" - 58% success ⭐⭐⭐☆☆
   Problem: Missing implementation details

   Current pattern:
     "Handle API timeouts gracefully"

   Improved pattern should include:
     • Specific timeout value (5s? 30s?)
     • Retry logic (exponential backoff?)
     • Error message to show user
     • Which APIs this applies to

   Action: /forge --update pat_def456

3. "Database connection issue" - 52% success ⭐⭐⭐☆☆
   Problem: No anti-patterns listed

   What NOT to do:
     ❌ Don't increase pool size infinitely
     ❌ Don't retry without delay
     ❌ Don't ignore connection errors

   Add anti-patterns to make this more valuable.

   Action: /forge --update pat_ghi789

[... 4 more patterns ...]

───────────────────────────────────────────────────────────────────
❌ Low Quality (5 patterns)

These patterns have < 50% success. Consider archiving or rewriting.

1. "Fix the bug" - 12% success ⭐☆☆☆☆
   Problem: WAY too vague. What bug? How to fix?

   Recommendation: Archive this and create specific patterns instead.

   Action: /my-patterns --archive pat_jkl012

2. "Update config" - 23% success ⭐☆☆☆☆
   Problem: No details about which config or what to update

   Recommendation: Replace with specific config patterns:
     • "Update CORS config to allow subdomain"
     • "Update rate limit to 100 req/min"

   Action: /forge --update pat_mno345

[... 3 more patterns ...]

───────────────────────────────────────────────────────────────────
📊 Quality Metrics

Average pattern success rate: 84%
├─ High quality (>80%): 30 patterns
├─ Medium quality (50-80%): 7 patterns
└─ Low quality (<50%): 5 patterns

───────────────────────────────────────────────────────────────────
🎯 Improvement Goals

Target: 90% average success rate

If you:
  • Update 7 medium-quality patterns → 88% avg
  • Archive 5 low-quality patterns → 91% avg ✅

───────────────────────────────────────────────────────────────────
💡 Pattern Quality Checklist

High-quality patterns have:
  ✅ Specific problem statement
  ✅ Clear solution with steps
  ✅ "Works when" conditions
  ✅ Anti-patterns (what NOT to do)
  ✅ Example code or commands
  ✅ Tags for categorization

Low-quality patterns are:
  ❌ Vague ("fix the bug")
  ❌ Missing context
  ❌ No success conditions
  ❌ Too broad or too narrow
  ❌ Never used (0 applications)

───────────────────────────────────────────────────────────────────
🔗 Quick Actions

• Update pattern: /forge --update <pattern_id>
• Archive pattern: /my-patterns --archive <pattern_id>
• View pattern details: /memory-search <pattern_title>
• Check pattern usage: /my-patterns --pattern <pattern_id>
```

**Value:** Helps users continuously improve their pattern library quality.

---

### 5. 🚀 Project Onboarding

**Command:** `/onboard`

**Purpose:** "I'm starting a fresh project. Help me set up best practices from the start."

**User Need:** New projects need structure, and users want to apply proven patterns from day 1.

**Multi-Tool Combination:**
- `ekkOS_Plan` - Create project setup plan
- `ekkOS_Generate` - AI-generate plan from project type
- `ekkOS_Templates` - Use proven project templates
- `ekkOS_Search` - Find relevant patterns for project type
- `ekkOS_Forge` - Create project-specific patterns

**Example Usage:**
```bash
# Start new project
/onboard

# Specific project type
/onboard --type nextjs

# With tech stack
/onboard --stack "nextjs,prisma,tailwind"

# Resume onboarding
/onboard --resume
```

**Example Output:**
```
🚀 Project Onboarding Wizard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Let's set up your new project with best practices from the start!

───────────────────────────────────────────────────────────────────
📋 Project Details

Project type: Next.js + TypeScript + Prisma
Framework: Next.js 14 (App Router)
Database: PostgreSQL (via Supabase)
Styling: Tailwind CSS
Auth: Next-Auth

───────────────────────────────────────────────────────────────────
🎯 Onboarding Plan (8 steps)

Based on proven patterns from 23 successful projects.

✅ 1. Initialize Next.js project
      Status: Complete
      Time: 2 minutes

✅ 2. Setup TypeScript with strict mode
      Status: Complete
      Applied pattern: "Always use TypeScript strict mode"

⏳ 3. Configure Prisma + PostgreSQL
      Status: In Progress

      Steps:
        [✅] npm install prisma @prisma/client
        [✅] npx prisma init
        [⏳] Configure DATABASE_URL in .env
        [ ] Define initial schema
        [ ] Run first migration

      💡 Pattern applied: "Use Supabase for managed PostgreSQL"

      Next: Add DATABASE_URL to .env

[ ] 4. Setup authentication (Next-Auth)
      Pattern: "Use Next-Auth with JWT for Next.js apps"
      Estimated: 15 minutes

[ ] 5. Configure Tailwind CSS
      Pattern: "Use Tailwind with custom design system"
      Estimated: 5 minutes

[ ] 6. Setup ESLint + Prettier
      Pattern: "Enforce code style with ESLint + Prettier"
      Estimated: 5 minutes

[ ] 7. Add environment variable validation
      Pattern: "Validate env vars at build time with Zod"
      Estimated: 10 minutes

[ ] 8. Configure deployment (Vercel)
      Pattern: "Deploy Next.js to Vercel with preview URLs"
      Estimated: 10 minutes

───────────────────────────────────────────────────────────────────
📚 Patterns Applied (3 so far)

1. ⭐⭐⭐⭐⭐ "TypeScript strict mode for all projects"
   Success: 98% (from 41 projects)
   Why: Catches type errors at build time

2. ⭐⭐⭐⭐⭐ "Use Supabase for managed PostgreSQL"
   Success: 95% (from 28 projects)
   Why: No database management overhead

3. ⭐⭐⭐⭐☆ "Next-Auth with JWT for authentication"
   Success: 92% (from 34 projects)
   Why: Industry standard, well-documented

───────────────────────────────────────────────────────────────────
⚠️  Common Pitfalls Avoided

✅ Avoided: "Using 'any' type in TypeScript"
   Why: Type safety is the whole point of TypeScript

✅ Avoided: "Self-hosting PostgreSQL for first project"
   Why: Adds unnecessary complexity early on

✅ Avoided: "Rolling your own auth"
   Why: Security is hard, use battle-tested library

───────────────────────────────────────────────────────────────────
💡 Next Steps

Current step: Configure DATABASE_URL

1. Go to Supabase dashboard
2. Create new project (or use existing)
3. Copy connection string from Settings > Database
4. Add to .env:
   ```
   DATABASE_URL="postgresql://..."
   ```
5. Run: npx prisma migrate dev --name init

After completing, run: /onboard --continue

───────────────────────────────────────────────────────────────────
📊 Progress: 25% Complete (2/8 steps)

Estimated time remaining: 45 minutes

You're building on proven patterns from 23 successful projects!
Keep going! 🚀
```

**Value:** Saves hours of setup time, applies best practices from day 1, avoids common mistakes.

---

### 6. 🧠 Memory Health Dashboard

**Command:** `/health`

**Purpose:** "Is my ekkOS memory working well? Any issues?"

**User Need:** Users want visibility into their memory system health.

**Multi-Tool Combination:**
- `ekkOS_Stats` - Get all statistics
- `ekkOS_Summary` - Recent activity
- `ekkOS_Search` - Test search functionality
- `ekkOS_Reflect` - Analyze memory quality

**Example Usage:**
```bash
# Full health check
/health

# Quick status
/health --quick

# Detailed diagnostics
/health --detailed
```

**Example Output:**
```
🧠 ekkOS Memory Health Dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Overall Health: 87/100 (Excellent) ✅

───────────────────────────────────────────────────────────────────
📊 11-Layer Memory Status

Layer 1 (Working):     ✅ Active (current session)
Layer 2 (Episodic):    ✅ 234 conversations stored
Layer 3 (Semantic):    ✅ 1,456 semantic links
Layer 4 (Patterns):    ✅ 42 patterns (84% avg success)
Layer 5 (Procedural):  ⚠️  3 workflows (consider adding more)
Layer 6 (Collective):  ✅ 8 patterns promoted
Layer 7 (Meta):        ✅ Tracking effectiveness
Layer 8 (Codebase):    ✅ 5 projects indexed
Layer 9 (Directives):  ✅ 12 rules (MUST/NEVER/PREFER)
Layer 10 (Conflict):   ✅ Auto-resolving contradictions
Layer 11 (Secrets):    ✅ 5 secrets stored securely

───────────────────────────────────────────────────────────────────
🔄 Golden Loop Performance

RETRIEVE: 95% (Excellent) ✅
  • Patterns retrieved when relevant
  • Fast response time (110ms avg)
  • High relevance score

APPLY: 84% (Good) ✅
  • Patterns actually used 84% of the time
  • User engagement is strong

MEASURE: 72% (Good) ⚠️
  • Outcomes tracked for 72% of applications
  • Could be better (aim for 80%+)

LEARN: 48% (Moderate) ⚠️
  • 48% of solutions forged as patterns
  • Aim for 60%+ capture rate

Overall Loop Efficiency: 75% (Good, room for improvement)

───────────────────────────────────────────────────────────────────
📈 Growth Trends (Last 30 Days)

Patterns: 34 → 42 (+8) 📈
Episodes: 187 → 234 (+47) 📈
Pattern applications: 823 → 1,041 (+218) 📈
Success rate: 82% → 84% (+2%) 📈

You're learning and growing! 🌱

───────────────────────────────────────────────────────────────────
⚠️  Areas for Improvement

1. LEARN Phase (48%)
   Issue: Not forging enough patterns
   Impact: Repeated problem-solving
   Fix: Use /forge after solving problems
   Target: 60% capture rate

2. MEASURE Phase (72%)
   Issue: Some outcomes not tracked
   Impact: Pattern success rates incomplete
   Fix: Hooks configured correctly? Check /loop-status

3. Procedural Patterns (3 total)
   Issue: Few multi-step workflows captured
   Impact: Missing reusable processes
   Fix: Use /forge for complex workflows
   Target: 10+ procedural patterns

───────────────────────────────────────────────────────────────────
✅ What's Working Well

• Pattern quality is high (84% success avg)
• Search is fast and accurate
• Good engagement (you use retrieved patterns)
• Steady growth in all metrics
• No conflicts or errors detected

───────────────────────────────────────────────────────────────────
🎯 Recommendations

1. 🎉 Great job maintaining high pattern quality!
2. ⚒️  Try forging more often (especially procedural workflows)
3. 📊 Check outcome tracking: /loop-status --test-measure
4. 🌟 Consider promoting patterns to collective (help others!)

───────────────────────────────────────────────────────────────────
📊 Comparison to Average User

Your memory health: 87/100
Average user: 71/100

You're in the top 15% of ekkOS users! 🏆

Keep it up and you'll be in top 10% soon.
```

**Value:** Visibility into memory health, actionable improvement suggestions, motivation to keep learning.

---

### 7. 📦 Knowledge Backup Manager

**Command:** `/backup`

**Purpose:** "Backup my patterns, share with team, sync across devices."

**User Need:** Users want to backup their memory and share knowledge.

**Multi-Tool Combination:**
- `ekkOS_Export` - Export all memory data
- `ekkOS_Import` - Import from backup
- `ekkOS_Stats` - Show what's being backed up
- `ekkOS_Summary` - Summary of exported data

**Example Usage:**
```bash
# Export everything
/backup export

# Export only patterns
/backup export --patterns-only

# Import from backup
/backup import ~/ekkos-backup.json

# Sync to team
/backup share --team
```

**Example Output:**
```
📦 Knowledge Backup Manager
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Creating backup of your ekkOS memory...

───────────────────────────────────────────────────────────────────
📊 Backup Contents

✅ Patterns (Layer 4):       42 patterns
✅ Procedural (Layer 5):     3 workflows
✅ Directives (Layer 9):     12 rules
✅ Plans:                    5 active plans
✅ Secrets (encrypted):      5 credentials
✅ Codebase schemas:         5 projects

Total: 67 memory items

───────────────────────────────────────────────────────────────────
💾 Exporting...

[████████████████████████████████] 100%

✅ Export Complete!

File: ~/Downloads/ekkos-backup-2026-01-07.json
Size: 2.3 MB
Format: JSON (portable)

───────────────────────────────────────────────────────────────────
🔒 Security

Secrets are encrypted with AES-256-GCM.
Safe to store in cloud storage or share with team.

───────────────────────────────────────────────────────────────────
📤 Sharing Options

1. Team Share (Share with your team)
   → Exports patterns + directives (no secrets)
   → Team members can import to learn from your knowledge
   → Use: /backup share --team

2. Device Sync (Sync to another device)
   → Full export including secrets
   → Import on new machine: /backup import <file>
   → All memory preserved

3. Cloud Backup (Auto-backup to cloud)
   → Automatic daily backups
   → Restore from any date
   → Requires Pro tier

───────────────────────────────────────────────────────────────────
💡 Next Steps

Your backup is ready!

• Store safely: Move to cloud storage or backup drive
• Sync devices: Transfer file and run /backup import on new device
• Share with team: /backup share --team
• Schedule backups: /backup auto --daily (Pro tier)
```

**Value:** Peace of mind, knowledge sharing, easy migration across devices.

---

### 8. 🔮 Smart Context Builder

**Command:** `/context`

**Purpose:** "Give me everything I need to know about this task."

**User Need:** Developers want deep context assembled automatically.

**Multi-Tool Combination:**
- `ekkOS_Context` - Get task-specific context
- `ekkOS_Codebase` - Search project code
- `ekkOS_Search` - Find relevant patterns
- `ekkOS_Recall` - Past related discussions
- `ekkOS_GetSchema` - Schema information

**Example Usage:**
```bash
# Build context for task
/context "implement user profile page"

# Context for debugging
/context "fix authentication bug"

# Context for refactoring
/context "refactor API layer"
```

**Example Output:**
```
🔮 Smart Context Builder
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Task: "Implement user profile page"

Building comprehensive context...

───────────────────────────────────────────────────────────────────
📚 Relevant Patterns (5 found)

1. ⭐⭐⭐⭐⭐ "User profile page layout (Next.js)"
   Success: 95%
   When to use: Building profile pages in Next.js apps

2. ⭐⭐⭐⭐☆ "Fetch user data with React Query"
   Success: 92%
   When to use: Client-side data fetching in React

3. ⭐⭐⭐⭐☆ "Handle profile image uploads"
   Success: 88%
   When to use: File upload functionality

[... 2 more patterns ...]

───────────────────────────────────────────────────────────────────
🗂️ Relevant Code (from your project)

Found in codebase:

1. src/api/users/[id]/route.ts
   Existing user API endpoint
   → Can reuse for profile data

2. src/components/Avatar.tsx
   Avatar component already exists
   → Use for profile picture

3. prisma/schema.prisma
   User model definition
   → Shows available fields

───────────────────────────────────────────────────────────────────
🗄️ Database Schema: users

Available fields:
  • id (String, required)
  • email (String, required, unique)
  • userName (String, required)
  • firstName (String, nullable)
  • lastName (String, nullable)
  • bio (String, nullable)
  • profileImageUrl (String, nullable)
  • createdAt (DateTime)
  • updatedAt (DateTime)

───────────────────────────────────────────────────────────────────
💬 Past Discussions

3 related conversations found:

1. Jan 3, 2026 - "Added user profile API endpoint"
   → You already built the backend API!
   → Located at: /api/users/[id]/profile

2. Dec 28, 2025 - "Profile image upload flow"
   → Discussed using S3 signed URLs
   → Implementation pattern exists

3. Dec 15, 2025 - "User data fetching strategy"
   → Decided on React Query for client-side
   → Pattern forged: "Use React Query for user data"

───────────────────────────────────────────────────────────────────
📜 User Directives (2 apply)

1. MUST: "Always add loading states to data fetching"
   → Remember to show skeleton while loading

2. PREFER: "Use Tailwind for styling, not CSS-in-JS"
   → Style with Tailwind classes

───────────────────────────────────────────────────────────────────
🎯 Implementation Plan

Based on patterns + existing code:

1. Create profile page component
   File: src/app/profile/[id]/page.tsx
   Pattern: "User profile page layout (Next.js)"

2. Fetch user data with React Query
   Pattern: "Fetch user data with React Query"
   Reuse: Existing API at /api/users/[id]/profile

3. Display profile information
   Components: <Avatar>, <UserInfo>, <UserBio>
   Reuse: src/components/Avatar.tsx

4. Add edit functionality (if needed)
   Pattern: "Inline editing for profile fields"

5. Handle image upload
   Pattern: "Handle profile image uploads"
   Use: S3 signed URLs (as discussed Dec 28)

───────────────────────────────────────────────────────────────────
⚠️  Potential Issues

Anti-patterns to avoid:

❌ "Don't fetch user data on every render"
   → Use React Query caching

❌ "Don't allow profile access without auth check"
   → Verify user is authenticated first

───────────────────────────────────────────────────────────────────
✅ Ready to Implement!

You have everything you need:
  • 5 relevant patterns with high success rates
  • Existing API endpoint to reuse
  • Database schema defined
  • Past decisions documented
  • User preferences captured

Estimated time: 2-3 hours (based on pattern data)

───────────────────────────────────────────────────────────────────
🚀 Next Steps

1. Create page: src/app/profile/[id]/page.tsx
2. Apply pattern: "User profile page layout"
3. Test with existing API
4. Use /forge if you discover improvements!

Good luck! 🎉
```

**Value:** Saves hours of context gathering, applies relevant patterns automatically.

---

### 9. ❌ Anti-Pattern Tracker

**Command:** `/anti-patterns`

**Purpose:** "What should I NOT do? What mistakes have I made before?"

**User Need:** Learning from failures is as important as successes.

**Multi-Tool Combination:**
- `ekkOS_Search` - Find anti-patterns
- `ekkOS_Forge` - Create anti-patterns from failures
- `ekkOS_Outcome` - Track pattern failures
- `ekkOS_Directive` - Create NEVER rules

**Example Usage:**
```bash
# Show all anti-patterns
/anti-patterns

# For specific category
/anti-patterns --category typescript

# Create anti-pattern from failure
/anti-patterns create "Using var in TypeScript breaks type narrowing"
```

**Example Output:**
```
❌ Anti-Pattern Tracker
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your Failure Knowledge: 7 anti-patterns

These are things you've learned NOT to do.

───────────────────────────────────────────────────────────────────
🔴 TypeScript Anti-Patterns (3)

1. ❌ "Using 'var' keyword in TypeScript"
   Why it fails: Breaks type narrowing, unexpected hoisting
   Last encountered: 2 weeks ago
   Times prevented: 5

   Correct approach:
     ✅ Use const for immutable values
     ✅ Use let for mutable values
     ❌ Never use var

2. ❌ "Using 'any' type to bypass errors"
   Why it fails: Defeats purpose of TypeScript, runtime errors
   Last encountered: 1 week ago
   Times prevented: 12

   Correct approach:
     ✅ Use unknown and type guards
     ✅ Use proper type definitions
     ✅ Use generics for flexible typing
     ❌ Don't use any

3. ❌ "Not checking for null/undefined"
   Why it fails: "Cannot read property 'X' of undefined"
   Last encountered: 3 days ago
   Times prevented: 23 (most common!)

   Correct approach:
     ✅ Use optional chaining: obj?.prop
     ✅ Use nullish coalescing: value ?? default
     ✅ Check before accessing: if (obj) { obj.prop }

───────────────────────────────────────────────────────────────────
🔴 API & Backend Anti-Patterns (2)

1. ❌ "No timeout on API requests"
   Why it fails: Requests hang forever, bad UX
   Last encountered: 1 month ago
   Times prevented: 7

   Correct approach:
     ✅ Always set timeout (5-30 seconds)
     ✅ Show loading state with timeout warning
     ✅ Retry with exponential backoff

2. ❌ "Hardcoding API keys in code"
   Why it fails: Security risk, keys leaked to git
   Last encountered: 2 months ago (close call!)
   Times prevented: 3

   Correct approach:
     ✅ Use environment variables
     ✅ Use ekkOS Secret Vault: /secrets store
     ✅ Add .env to .gitignore
     ❌ NEVER commit keys

───────────────────────────────────────────────────────────────────
🔴 Database Anti-Patterns (2)

1. ❌ "Running migrations on production without backup"
   Why it fails: Data loss if migration fails
   Last encountered: 3 months ago (disaster!)
   Times prevented: 8 (phew!)

   Correct approach:
     ✅ Always backup before migration
     ✅ Test migration on staging first
     ✅ Have rollback plan ready
     ❌ Don't YOLO production migrations

2. ❌ "N+1 query in loop"
   Why it fails: 1000 rows = 1000 queries = slow
   Last encountered: 2 weeks ago
   Times prevented: 4

   Correct approach:
     ✅ Use include/join to fetch relations
     ✅ Batch queries with Promise.all
     ✅ Use DataLoader for GraphQL
     ❌ Don't query inside loop

───────────────────────────────────────────────────────────────────
📊 Prevention Stats

Anti-patterns have prevented mistakes 62 times!

Most prevented: "Not checking null/undefined" (23 times)
Most dangerous: "No backup before migration" (1 disaster averted)

Time saved by not repeating mistakes: ~18 hours

───────────────────────────────────────────────────────────────────
💡 Keep Learning from Failures

When something DOESN'T work:

1. Run: /anti-patterns create "<what failed>"
2. Explain WHY it failed
3. Document correct approach
4. Next time → ekkOS warns you!

Failures are valuable. Capture them! 📝
```

**Value:** Prevents repeating mistakes, builds "what NOT to do" knowledge base.

---

### 10. 🚨 Deployment Safety Net

**Command:** `/deploy-check`

**Purpose:** "Is it safe to deploy? Did I forget anything?"

**User Need:** Pre-deployment checklist based on past incidents.

**Multi-Tool Combination:**
- `ekkOS_Conflict` - Check for conflicts
- `ekkOS_Search` - Past deployment incidents
- `ekkOS_Recall` - Recent changes
- `ekkOS_Directive` - Deployment rules
- `ekkOS_Plan` - Deployment checklist

**Example Usage:**
```bash
# Check before deploy
/deploy-check

# Check specific environment
/deploy-check --env production

# Override if emergency
/deploy-check --override "Critical security fix"
```

**Example Output:**
```
🚨 Deployment Safety Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Environment: Production
Time: Friday, Jan 7, 2026, 4:45 PM

Running comprehensive pre-flight checks...

───────────────────────────────────────────────────────────────────
⚠️  STOP! Issues Detected

🚨 4 blockers found

───────────────────────────────────────────────────────────────────
🚫 Blocker #1: Dangerous Deploy Time

Rule: "Never deploy to production on Friday after 3 PM"
Created: 3 months ago
Reason: Weekend incidents with no one available

Current: Friday, 4:45 PM ← VIOLATION!

Past incident: Dec 15, 2025
  • Deployed at 4:30 PM Friday
  • Auth broke over weekend
  • 2 days of downtime
  • 1,000+ users affected

Recommendation: Wait until Monday

───────────────────────────────────────────────────────────────────
🚫 Blocker #2: Tests Not Passing

Directive: MUST run tests before production deploy

Test status: ❌ 3 failing tests

Failing:
  • test/api/users.test.ts - "GET /api/users returns 200"
  • test/auth/login.test.ts - "Login with valid credentials"
  • test/db/connection.test.ts - "Database connection pool"

These are CRITICAL tests. Don't deploy with failing tests!

Fix: Run npm test and fix failures

───────────────────────────────────────────────────────────────────
🚫 Blocker #3: No Code Review

Directive: MUST have code review before production

PR Status: No reviews yet

Changes since last deploy:
  • 47 files changed
  • +2,345 lines added
  • -892 lines removed
  • Includes auth system changes (high risk!)

This is a large change set. Get review first!

───────────────────────────────────────────────────────────────────
🚫 Blocker #4: Environment Variables Changed

Detection: .env.production.local modified

Changed variables:
  • DATABASE_URL (modified 2 hours ago)
  • JWT_SECRET (modified 2 hours ago)
  • API_KEY (modified 2 hours ago)

⚠️  High risk! Database and auth config changed.

Recommendation:
  1. Double-check these values are correct
  2. Test on staging first
  3. Have rollback plan ready

───────────────────────────────────────────────────────────────────
📋 Pre-Deployment Checklist

Required before proceeding:

[ ] ❌ Wait until Monday (or justify override)
[ ] ❌ Fix 3 failing tests
[ ] ❌ Get code review approval
[ ] ❌ Verify environment variables are correct
[ ] ❌ Test on staging environment
[ ] ❌ Prepare rollback plan
[ ] ❌ Notify team of upcoming deploy
[ ] ❌ Database backup created

0/8 checks passed ← NOT READY!

───────────────────────────────────────────────────────────────────
🔍 Past Incidents (3 found)

This safety check exists because of these past incidents:

1. Dec 15, 2025 - "Friday deploy broke auth"
   → Created rule: No Friday evening deploys

2. Nov 3, 2025 - "Deployed with failing tests, broke payment processing"
   → Created rule: Tests must pass

3. Oct 12, 2025 - "No code review, missed critical bug"
   → Created rule: Code review required

Don't repeat history! 📚

───────────────────────────────────────────────────────────────────
🚨 RECOMMENDATION: DO NOT DEPLOY

Risk Level: HIGH

This deploy has:
  • Bad timing (Friday evening)
  • Failing tests (3 critical)
  • No code review
  • Env var changes (risky)

If you deploy anyway:
  • High chance of incident
  • No one available for weekend fixes
  • Could affect 1,000+ users
  • Will violate your own safety rules

───────────────────────────────────────────────────────────────────
✅ Safe Alternative

Wait until Monday, then:

1. Monday morning: Fix failing tests
2. Monday afternoon: Get code review
3. Monday 2 PM: Verify env vars on staging
4. Monday 3 PM: Deploy to production
5. Monitor for 2 hours
6. Team available if issues occur

This is the SAFE approach. ✅

───────────────────────────────────────────────────────────────────
🆘 Emergency Override?

If this is truly a critical emergency (security patch, site down, etc.):

/deploy-check --override "Reason: Critical security fix CVE-2026-1234"

This will:
  • Document why you're overriding safety checks
  • Alert team of emergency deploy
  • Require manual confirmation
  • Create incident report for later review

Only use for REAL emergencies!

───────────────────────────────────────────────────────────────────
📞 Need Help?

Talk to team before proceeding:
  • #deployments channel
  • @oncall-engineer
  • support@yourcompany.com

Don't deploy alone if unsure! 🤝
```

**Value:** Prevents production incidents, enforces safety rules, learns from past mistakes.

---

### 11. 📋 Plan Manager

**Command:** `/plans`

**Purpose:** "What am I working on? How do I track multi-step tasks?"

**User Need:** Users need to create, manage, and track complex multi-step plans attached to their user ID.

**Multi-Tool Combination:**
- `ekkOS_Plan` - Create new structured plans
- `ekkOS_Plans` - List user's plans
- `ekkOS_PlanStatus` - Update plan status (draft/in_progress/completed/archived)
- `ekkOS_PlanStep` - Mark individual steps complete
- `ekkOS_Generate` - AI-generate plan from description
- `ekkOS_SaveTemplate` - Save successful plans as reusable templates
- `ekkOS_Templates` - Browse available plan templates
- `ekkOS_FromTemplate` - Create new plan from template

**Example Usage:**
```bash
# List all your plans
/plans

# Create new plan
/plans create "Implement user authentication"

# AI-generate plan from description
/plans generate "Build REST API for blog"

# Show specific plan
/plans show plan_abc123

# Mark step complete
/plans complete plan_abc123 --step 3

# Save as template
/plans template plan_abc123 --category "authentication"

# Create from template
/plans from-template "authentication-setup"
```

**Example Output:**
```
📋 Your Plans
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Active Plans (2):

1. 🔄 Implement User Authentication
   Status: In Progress (60% complete)
   Created: 2 days ago
   Steps: 3/5 completed

   [✅] 1. Setup Next-Auth
   [✅] 2. Configure providers
   [✅] 3. Add login page
   [ ] 4. Add protected routes
   [ ] 5. Add session management

   Next: Complete step 4 - Add protected routes

2. 🔄 Build REST API
   Status: In Progress (25% complete)
   Created: 1 week ago
   Steps: 2/8 completed

   [✅] 1. Setup Express server
   [✅] 2. Configure database connection
   [ ] 3. Define API routes
   [ ] 4. Add validation middleware
   [...5 more steps...]

   Next: Define API routes

───────────────────────────────────────────────────────────────────
Completed Plans (3):

✅ Setup Development Environment (3 days ago)
✅ Implement Dark Mode (1 week ago)
✅ Add Email Verification (2 weeks ago)

───────────────────────────────────────────────────────────────────
Draft Plans (1):

📝 Refactor Database Layer
   Created: 3 days ago
   Status: Draft (not started)
   Steps: 6 planned

───────────────────────────────────────────────────────────────────
📊 Stats:

Total Plans: 6
├─ Active: 2
├─ Completed: 3
└─ Draft: 1

Completion Rate: 50%
Average Time to Complete: 5 days

───────────────────────────────────────────────────────────────────
💡 Quick Actions:

• Create plan: /plans create "title"
• Generate plan: /plans generate "description"
• Mark step done: /plans complete <plan_id> --step <#>
• Save template: /plans template <plan_id>
• Use template: /plans from-template "name"

───────────────────────────────────────────────────────────────────
📚 Available Templates (5):

1. "Authentication Setup" (used 23 times, 95% success)
2. "REST API Implementation" (used 18 times, 90% success)
3. "Database Migration" (used 12 times, 88% success)
4. "CI/CD Pipeline Setup" (used 9 times, 92% success)
5. "Testing Strategy" (used 7 times, 85% success)

Create from template: /plans from-template "authentication-setup"
```

**Example - Creating Plan:**
```bash
/plans create "Implement search feature"

🎯 Creating Plan: "Implement search feature"

Let me generate steps for you...

Generated Plan (6 steps):

1. [ ] Define search requirements and scope
2. [ ] Design search API endpoint
3. [ ] Implement backend search logic
4. [ ] Add search UI component
5. [ ] Integrate with existing UI
6. [ ] Add search analytics

Looks good? (yes/no/edit)
> yes

✅ Plan created! (plan_abc123)

Status: Draft
To start: /plans start plan_abc123
```

**Example - AI-Generated Plan:**
```bash
/plans generate "Build a blog with comments and likes"

🤖 Generating Plan...

Analyzing your request...
Searching for relevant patterns...
Building optimal step sequence...

✅ Plan Generated: "Build blog with comments and likes"

12 Steps (estimated 2-3 weeks):

Phase 1: Core Blog (4 steps)
  1. [ ] Create blog post model & database schema
  2. [ ] Build blog post CRUD API
  3. [ ] Add markdown rendering
  4. [ ] Create blog post UI

Phase 2: Comments (4 steps)
  5. [ ] Create comment model & API
  6. [ ] Add comment threading logic
  7. [ ] Build comment UI component
  8. [ ] Add comment moderation

Phase 3: Engagement (4 steps)
  9. [ ] Add like/unlike functionality
  10. [ ] Create like counter UI
  11. [ ] Add notification system
  12. [ ] Implement activity feed

Applied Patterns (3):
  • "REST API with CRUD operations"
  • "Markdown rendering with syntax highlighting"
  • "Comment threading with nested replies"

Save this plan? (yes/save-as-template/edit/cancel)
> yes

✅ Plan saved! (plan_def456)
Ready to start: /plans start plan_def456
```

**Example - Using Template:**
```bash
/plans from-template "authentication-setup"

📚 Using Template: "Authentication Setup"

This template has been used 23 times with 95% success rate.

Steps from template:
  1. [ ] Install authentication library
  2. [ ] Configure auth providers
  3. [ ] Create login/signup pages
  4. [ ] Add protected route middleware
  5. [ ] Implement session management
  6. [ ] Add password reset flow

Customize for your project:
  Auth library: (NextAuth/Auth0/Supabase)
  > NextAuth

  Providers: (Google/GitHub/Email/All)
  > Google, Email

✅ Plan created from template! (plan_ghi789)

Customized for:
  • NextAuth with Google + Email
  • Next.js 14 App Router
  • Your project structure

Ready to start: /plans start plan_ghi789
```

**Example - Marking Steps:**
```bash
/plans complete plan_abc123 --step 1

✅ Step 1 marked complete!

Plan: "Implement search feature"
Progress: 1/6 steps (17%)

Completed:
  [✅] 1. Define search requirements and scope

Next step:
  [ ] 2. Design search API endpoint

Keep going! 🚀
```

**Value:**
- Organize complex multi-step work
- AI-generated plans from patterns
- Reusable templates for common workflows
- Track progress across sessions
- Learn from successful plan templates
- All plans attached to user ID (portable across projects)

**Why This is Essential:**
- **IMPORTANT:** All Plan tools (ekkOS_Plan, ekkOS_Plans, ekkOS_PlanStatus, etc.) are USER-FACING tools attached to user IDs
- Users should have direct UI for plan management
- Plans persist across sessions and projects
- Templates enable knowledge sharing
- Combines with Project Onboarding for fresh projects

---

## Summary of Proposed Plugins

| # | Plugin Name | Commands | MCP Tools | Value Proposition |
|---|------------|----------|-----------|-------------------|
| 6 | Time Travel Debugger | `/time-travel` | Recall, Search, Codebase, Summary | Debug "when did X break?" |
| 7 | Secret Vault | `/secrets` | StoreSecret, GetSecret, ListSecrets, RotateSecret, DeleteSecret | Secure credential management |
| 8 | Pre-Flight Checker | `/check` | Conflict, Search, Directive, Recall | Prevent destructive actions |
| 9 | Pattern Quality Coach | `/improve-patterns` | Search, Stats, Outcome, Reflect, Forge | Improve pattern library quality |
| 10 | Project Onboarding | `/onboard` | Plan, Generate, Templates, Search, Forge | Fresh project setup wizard |
| 11 | Memory Health Dashboard | `/health` | Stats, Summary, Search, Reflect | Memory system health check |
| 12 | Knowledge Backup Manager | `/backup` | Export, Import, Stats, Summary | Backup and share knowledge |
| 13 | Smart Context Builder | `/context` | Context, Codebase, Search, Recall, GetSchema | Automatic context assembly |
| 14 | Anti-Pattern Tracker | `/anti-patterns` | Search, Forge, Outcome, Directive | Learn from failures |
| 15 | Deployment Safety Net | `/deploy-check` | Conflict, Search, Recall, Directive, Plan | Pre-deployment safety checks |
| 16 | Plan Manager | `/plans` | Plan, Plans, PlanStatus, PlanStep, Generate, SaveTemplate, Templates, FromTemplate | Multi-step task management |

---

## MCP Tool Coverage After All 16 Plugins (5 Core + 11 Proposed)

**Tools Used Across All Plugins:**

✅ ekkOS_Search (used in 12 plugins)
✅ ekkOS_Forge (used in 5 plugins)
✅ ekkOS_Stats (used in 4 plugins)
✅ ekkOS_Summary (used in 5 plugins)
✅ ekkOS_Directive (used in 5 plugins)
✅ ekkOS_Recall (used in 4 plugins)
✅ ekkOS_Codebase (used in 3 plugins)
✅ ekkOS_Conflict (used in 3 plugins)
✅ ekkOS_Context (used in 1 plugin)
✅ ekkOS_Outcome (used in 2 plugins)
✅ ekkOS_Reflect (used in 3 plugins)
✅ ekkOS_IndexSchema (used in 1 plugin)
✅ ekkOS_GetSchema (used in 2 plugins)
✅ ekkOS_Export (used in 1 plugin)
✅ ekkOS_Import (used in 1 plugin)
✅ ekkOS_Plan (used in 4 plugins)
✅ ekkOS_Plans (used in 1 plugin)
✅ ekkOS_PlanStatus (used in 1 plugin)
✅ ekkOS_PlanStep (used in 1 plugin)
✅ ekkOS_Generate (used in 2 plugins)
✅ ekkOS_SaveTemplate (used in 1 plugin)
✅ ekkOS_Templates (used in 2 plugins)
✅ ekkOS_FromTemplate (used in 1 plugin)
✅ ekkOS_StoreSecret (used in 1 plugin)
✅ ekkOS_GetSecret (used in 1 plugin)
✅ ekkOS_ListSecrets (used in 1 plugin)
✅ ekkOS_RotateSecret (used in 1 plugin)
✅ ekkOS_DeleteSecret (used in 1 plugin)

**Tools NOT used in plugins (but available via MCP):**
- ekkOS_Capture (auto-managed by hooks, could add manual interface)
- ekkOS_Detect (auto-managed by hooks, could add manual interface)
- ekkOS_Track (auto-managed by hooks, could add manual interface)

**Coverage: 28/31 tools (90%) actively used in user-facing plugins**

**Note:** The 3 remaining tools (Capture, Detect, Track) are primarily auto-managed by hooks but could potentially have manual user-facing interfaces added if needed.

---

## Prioritization for Implementation

### Tier 1: Must-Have (Implement First)
1. **Plan Manager** - Exposes ALL 8 plan management tools, essential for multi-step work
2. **Secret Vault** - Critical for security, immediate value
3. **Pre-Flight Checker** - Prevents disasters, high ROI
4. **Time Travel Debugger** - Unique capability, high value

### Tier 2: High Value (Implement Next)
5. **Project Onboarding** - Great for new users, fresh projects
6. **Smart Context Builder** - Saves significant time
7. **Deployment Safety Net** - Prevents production incidents

### Tier 3: Polish & Enhancement (Later)
8. **Memory Health Dashboard** - Nice to have, less urgent
9. **Pattern Quality Coach** - Continuous improvement
10. **Knowledge Backup Manager** - Important but not urgent
11. **Anti-Pattern Tracker** - Educational value

---

## Next Steps

1. **Implement Tier 1 plugins first (4 plugins)** - Plan Manager, Secret Vault, Pre-Flight Checker, Time Travel Debugger
2. **Ensure proper data isolation** - All plugins must scope to user_id, never expose other users' data
3. **Update extension.ts deployment array** to include new plugins
4. **Test each plugin** with real user scenarios and security review
5. **Gather feedback** from early users
6. **Iterate based on usage data**

With these 11 additional plugins, users will have comprehensive tools covering:
- **Task Management** (Plan Manager - 8 plan tools)
- **Security** (Secret Vault, Pre-Flight Checker)
- **Debugging** (Time Travel, Context Builder)
- **Onboarding** (Project Onboarding)
- **Safety** (Deployment Safety Net, Pre-Flight Checker)
- **Learning** (Pattern Quality Coach, Anti-Pattern Tracker)
- **Maintenance** (Memory Health, Knowledge Backup)

**Total: 16 user-focused plugins covering 90% of MCP tools (28/31)!**

**Critical Security Note:** All plugins must implement proper user_id scoping to prevent data leakage between users.
