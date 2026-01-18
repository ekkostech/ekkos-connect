# ekkOS Custom Agents for Claude Code

**USER-FOCUSED | PORTABLE | UNIVERSAL**

Custom agent plugins that help developers use ekkOS memory effectively - designed for YOUR USERS, not for admins deploying infrastructure.

## 🎯 Design Philosophy

### What Changed?

**OLD Design (Admin-focused):**
- ❌ Deploy Guardian - Vercel vs Railway (ekkOS infrastructure)
- ❌ Schema Sentinel - ekkOS database schemas (internal)
- ❌ Memory Archaeologist - System maintenance (admin task)

**NEW Design (User-focused):**
- ✅ Memory Lens - "What does ekkOS know about my problem?"
- ✅ Pattern Coach - "Help me forge this solution"
- ✅ Learning Tracker - "Show me my growth"
- ✅ Golden Loop Monitor - "Is ekkOS working for me?"

### Why This Matters

**Users don't care about:**
- ekkOS's internal infrastructure
- How ekkOS deploys its own services
- ekkOS's database schemas

**Users care about:**
- "Did ekkOS find patterns for MY problem?"
- "How do I remember THIS solution?"
- "What has ekkOS learned from ME?"
- "Is the Golden Loop working for MY codebase?"

These plugins are **100% portable** - they work for ANY developer on ANY codebase.

---

## 🔌 The 5 Core Plugins

### 1. 🔍 Memory Lens

**Command:** `/memory-search`

**Purpose:** Search and explore what ekkOS remembers

**User Need:** *"Before I solve this problem, does ekkOS already know the solution?"*

**What it does:**
- Searches all 11 layers of memory
- Shows relevant patterns with success rates
- Explains WHY each pattern was retrieved
- User-friendly output (no technical jargon)
- Shows Golden Loop status
- Guides next steps

**Example Use Case:**
```
User encounters: "TypeError: Cannot read property 'map' of undefined"

/memory-search "undefined map error"

→ Shows 3 past solutions with success rates
→ Recommends trying pattern with 98% success first
→ If no patterns found, tells user to forge after solving
```

**Calls:** `ekkOS_Search`, `ekkOS_Stats`

---

### 2. ⚒️ Pattern Coach

**Command:** `/forge`

**Purpose:** Interactive pattern forging assistant

**User Need:** *"I just solved a problem - how do I make sure ekkOS remembers it?"*

**What it does:**
- Detects problem/solution from conversation
- Asks clarifying questions interactively
- Validates pattern quality
- Checks for duplicates
- Forges pattern to memory
- Captures failures as anti-patterns
- Creates MUST/NEVER directives

**Example Use Case:**
```
User fixes bug by adding optional chaining

/forge

→ Detects: "Fixed undefined error with ?.operator"
→ Asks: "What was the problem?" (pre-filled)
→ Asks: "When does this apply?" (helps future matching)
→ Previews pattern before forging
→ Forges to Layer 4 (Patterns)
→ Pattern available immediately for future retrievals
```

**Modes:**
- `/forge` - Interactive (recommended)
- `/forge quick` - Auto-detect from conversation
- `/forge failure` - Capture anti-pattern
- `/forge rule` - Create MUST/NEVER directive

**Calls:** `ekkOS_Forge`, `ekkOS_Directive`, `ekkOS_Search` (check duplicates)

---

### 3. 📊 Learning Tracker

**Command:** `/my-patterns`

**Purpose:** Personal learning dashboard

**User Need:** *"What has ekkOS learned from me? Am I getting smarter over time?"*

**What it does:**
- Lists all YOUR patterns
- Shows success rates for each
- Tracks usage statistics
- Highlights top performers
- Identifies patterns needing attention
- Shows growth metrics over time
- Contribution to collective (if Pro)

**Example Use Case:**
```
User wants to see their progress

/my-patterns

→ Shows 42 patterns forged
→ Top 5 by success rate (with stars ⭐)
→ Patterns by category (TypeScript, API, React)
→ Identifies 1 low-success pattern (needs updating)
→ Shows 3 stale patterns (30+ days unused)
→ Growth: 8 patterns this month
→ Golden Loop efficiency: 76%
→ Recommendations for improvement
```

**Modes:**
- `/my-patterns` - Full dashboard
- `/my-patterns --successful` - Only high-success patterns
- `/my-patterns --category typescript` - Filter by category
- `/my-patterns --recent` - Recent patterns only

**Calls:** `ekkOS_Stats`, `ekkOS_Search` (user_only filter)

---

### 4. 🔄 Golden Loop Monitor

**Command:** `/loop-status`

**Purpose:** Monitor and troubleshoot the Golden Loop

**User Need:** *"Is ekkOS working correctly? Why aren't patterns being retrieved?"*

**What it does:**
- Tests each loop phase (RETRIEVE → APPLY → MEASURE → LEARN)
- Shows recent activity
- Identifies bottlenecks
- Diagnoses issues
- Provides actionable fixes
- Real-time health check

**Example Use Cases:**

**Healthy Loop:**
```
/loop-status

→ ✅ All phases working
→ Shows recent RETRIEVE/APPLY/MEASURE/LEARN events
→ Performance metrics: 76% efficiency (Good)
→ Bottleneck: LEARN phase at 45% (could forge more)
→ Recommendations: Use /forge after solving problems
```

**Loop Issues:**
```
/loop-status

→ ⚠️ Issues detected
→ RETRIEVE: Working ✅
→ APPLY: Low (12%) ⚠️
→ MEASURE: Broken ❌
→ LEARN: Never ❌

→ Diagnosis:
  - Hooks not configured
  - No patterns forged yet
  - MCP connection issues

→ Fixes (step-by-step checklist):
  1. Run: "ekkOS: Setup Global Hooks"
  2. Forge first pattern: /forge
  3. Test connection: /loop-status --test-mcp
```

**Modes:**
- `/loop-status` - Overall status
- `/loop-status --detailed` - Verbose diagnostics
- `/loop-status --test-retrieve` - Test specific phase
- `/loop-status --last-session` - Recent activity only

**Calls:** `ekkOS_Summary`, `ekkOS_Stats`, `ekkOS_Search` (test), API health check

---

### 5. 🛡️ Project Schema Validator

**Command:** `/validate-schema`

**Purpose:** Validate schemas in YOUR project (not ekkOS database)

**User Need:** *"Are my TypeScript types in sync with my database? Will I get field name errors?"*

**What it does:**
- Indexes your project schemas (TypeScript, Prisma, GraphQL, Supabase)
- Validates field names across your codebase
- Detects schema drift (types out of sync with database)
- Catches type errors before runtime
- Suggests fixes with exact line numbers
- Stores schemas in ekkOS for future reference

**Example Use Cases:**

**First Time Setup:**
```
/validate-schema

→ Scans project for schema files
→ Found: Prisma schema, TypeScript types, GraphQL schema
→ Indexes 18 models with 150 fields
→ Validates field usage across codebase
→ ✅ No issues found! (or shows specific errors with fixes)
→ Stored in ekkOS Layer 8 (Codebase)
```

**Schema Drift Detected:**
```
/validate-schema --compare

→ ⚠️ SCHEMA DRIFT DETECTED!
→ Database has: User.phoneNumber
→ TypeScript: Missing!
→ Fix: Add phoneNumber: string | null to interface
→ Run: npx prisma generate to sync types
```

**Fresh Project:**
```
/validate-schema

→ ℹ️ Fresh Project Detected
→ No schemas found yet - that's OK!
→ Shows setup guide (Prisma vs Supabase)
→ Explains why schema validation matters
→ Offers to help after setup
```

**Modes:**
- `/validate-schema` - Index all schemas and validate
- `/validate-schema users` - Check specific table/type
- `/validate-schema --compare` - Compare database vs TypeScript
- `/validate-schema --show` - Show indexed schemas

**Calls:** `ekkOS_IndexSchema`, `ekkOS_GetSchema`, `ekkOS_Codebase`, `ekkOS_Search`, `ekkOS_Forge`

**What Makes This Different from Admin "Schema Sentinel":**
- **This:** Validates YOUR project schemas (portable to any codebase)
- **Admin tool:** Validates ekkOS internal database (ekkOS-specific)

**Value:** Prevents runtime errors like "Cannot read property 'username'" when field is actually 'userName'. Catches field name mismatches, type errors, and schema drift BEFORE they cause bugs.

---

## 🚀 Installation & Usage

### For Users

1. **Install ekkos-connect** from VS Code marketplace
2. **Authenticate**: Run "ekkOS: Connect Account"
3. **Deploy Plugins**: Run "ekkOS: Deploy Custom Agents to Claude Code"
4. **Restart Claude Code**
5. **Use Commands**:
   ```bash
   /memory-search "your problem"
   /forge
   /my-patterns
   /loop-status
   /validate-schema
   ```

Plugins install to `~/.claude/plugins/ekkos/`

### For Developers

```bash
cd extensions/ekkos-connect

# Build extension
npm install
npm run compile
vsce package

# Install locally
code --install-extension ekkos-connect-*.vsix

# Deploy plugins (via Command Palette)
"ekkOS: Deploy Custom Agents to Claude Code"

# Test in Claude Code
claude
> /memory-search test
```

---

## 🎓 User Workflows

### Workflow 1: New Problem (No Pattern Exists)

```
1. User encounters error
2. /memory-search "error description"
3. No patterns found
4. User solves problem (research, experiment, docs)
5. /forge (captures solution)
6. Pattern now in memory
7. Next time → pattern retrieved automatically!
```

### Workflow 2: Existing Pattern

```
1. User encounters error
2. /memory-search "error description"
3. 3 patterns found (98%, 95%, 92% success)
4. User tries pattern #1
5. Works! (ekkOS auto-tracks success)
6. Pattern success rate updated: 98% → 99%
```

### Workflow 3: Learning from Failure

```
1. User tries approach that doesn't work
2. /forge failure
3. "What didn't work?" → Using var in TypeScript
4. "Why failed?" → Type narrowing breaks
5. "Correct approach?" → Use const/let
6. Anti-pattern forged
7. Optional: Create NEVER directive
8. Next time → ekkOS warns against var
```

### Workflow 4: Checking Progress

```
1. User wants to see growth
2. /my-patterns
3. Dashboard shows:
   - 42 patterns forged
   - 84% avg success rate
   - 8 patterns this month
   - Top 5 performers
   - 3 patterns need attention
4. User feels motivated! 🎉
```

### Workflow 5: Troubleshooting

```
1. ekkOS not retrieving patterns
2. /loop-status
3. Diagnosis: Hooks not configured
4. Fix: Run "ekkOS: Setup Global Hooks"
5. /loop-status (verify fixed)
6. ✅ All phases working
```

---

## 💡 Why These 5 Plugins?

### Coverage of Golden Loop

```
RETRIEVE → /memory-search (Memory Lens)
APPLY    → /validate-schema (Project Schema Validator)
MEASURE  → Automatic (hooks track outcomes)
LEARN    → /forge (Pattern Coach)

Monitor  → /loop-status (Golden Loop Monitor)
Growth   → /my-patterns (Learning Tracker)
```

Every phase of the Golden Loop has a corresponding user-facing tool.

### Universal & Portable

- ✅ Works on ANY codebase (not ekkOS-specific)
- ✅ Works for ANY language (TypeScript, Python, Rust, etc.)
- ✅ Works for ANY problem domain (API, frontend, backend, etc.)
- ✅ No dependencies on ekkOS infrastructure

### User-Centric Design

Each plugin answers a core user question:

1. "Does ekkOS know this?" → **Memory Lens**
2. "How do I forge this?" → **Pattern Coach**
3. "What has ekkOS learned?" → **Learning Tracker**
4. "Is ekkOS working?" → **Golden Loop Monitor**
5. "Are my types correct?" → **Project Schema Validator**

---

## 🔧 Technical Details

### Plugin Structure

```
plugin-name/
├── .claude-plugin/
│   └── plugin.json          # Manifest
└── commands/
    └── command-name.md      # Command implementation guide
```

### How Commands Work

1. User types `/memory-search` in Claude Code
2. Claude loads `~/.claude/plugins/ekkos/memory-lens/commands/memory-search.md`
3. Command file tells Claude:
   - What to do (call ekkOS_Search with user query)
   - How to format output (user-friendly, with stars/emojis)
   - What to suggest next (/forge if no patterns found)
4. Claude executes via ekkOS MCP (configured by ekkos-connect)
5. Results displayed to user

### MCP Tools Used

All plugins use the **same ekkOS MCP server** configured by ekkos-connect:

- `ekkOS_Search` - Search memory substrate
- `ekkOS_Forge` - Create patterns
- `ekkOS_Directive` - Create MUST/NEVER rules
- `ekkOS_Stats` - Get memory statistics
- `ekkOS_Summary` - Get recent activity
- `ekkOS_Outcome` - Track pattern success (auto)
- `ekkOS_Track` - Track pattern applications (auto)

No duplication - single MCP instance powers everything!

---

## 🆚 Admin vs User Plugins

### User Plugins (This Directory)

**Purpose:** Help developers USE ekkOS memory

**Target:** ANY developer using ekkOS

**Scope:** Portable, universal, works on any codebase

**Plugins:**
- Memory Lens - Search patterns
- Pattern Coach - Forge patterns
- Learning Tracker - View growth
- Golden Loop Monitor - Troubleshoot

**Location:** `templates/claude-plugins/`

**Deployed to:** `~/.claude/plugins/ekkos/` (user's machine)

### Admin Plugins (Separate - Not for Users)

**Purpose:** Help ekkOS TEAM manage infrastructure

**Target:** ekkOS administrators only

**Scope:** ekkOS-specific (Vercel, Railway, Supabase)

**Plugins:**
- Deploy Guardian - Vercel/Railway deployment safety
- Schema Sentinel - Database migration validation
- System Monitor - KPIs, health checks, metrics

**Location:** `templates/claude-plugins-admin/` (not deployed to users)

**Usage:** Internal ekkOS team only

---

## 📊 Success Metrics

### User Engagement

- % of users who deploy plugins
- Average commands per week per user
- Most popular command (likely /forge)

### Golden Loop Efficiency

- RETRIEVE → APPLY rate (target: 80%+)
- APPLY → MEASURE rate (target: 70%+)
- MEASURE → LEARN rate (target: 50%+)

### User Growth

- Patterns forged per user (target: 20+)
- Average pattern success rate (target: 80%+)
- Users with 50+ patterns (power users)

### Loop Health

- % of users with healthy loops (target: 90%+)
- Average time to diagnose issues (target: < 2 minutes)
- Issue resolution rate (target: 95%+)

---

## 🚀 Next Steps

### Phase 1: Launch (Current)

- ✅ 4 core user plugins
- ✅ One-click deployment via ekkos-connect
- ✅ Comprehensive documentation
- ✅ User-friendly command outputs

### Phase 2: Enhancements

- Pattern sharing between team members
- Plugin marketplace for community plugins
- Auto-suggestions (Claude proactively runs /memory-search)
- Slack/Discord integrations

### Phase 3: Advanced

- Pattern versioning and evolution
- Team-specific plugins
- Custom plugin generator
- Analytics dashboard

---

## 📞 Support

- Documentation: https://docs.ekkos.dev/plugins
- Discord: https://discord.gg/ekkos
- Email: support@ekkos.dev
- Issues: https://github.com/ekkostech/ekkos-connect/issues

---

## 🎉 Summary

**These 4 plugins complete the Golden Loop user experience:**

1. **Memory Lens** - Find what ekkOS knows
2. **Pattern Coach** - Capture what you learn
3. **Learning Tracker** - See your growth
4. **Golden Loop Monitor** - Ensure it's working

**Portable. Universal. User-focused.**

Every developer using ekkOS gets these tools automatically.
No infrastructure knowledge required.
No ekkOS-specific context needed.

**Just forge patterns and get smarter over time.** 🧠⚡

---

**Built with ❤️ by the ekkOS team**

*Designed for YOUR users, not for infrastructure admins.*
