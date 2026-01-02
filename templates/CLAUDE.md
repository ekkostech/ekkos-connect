# ekkOS_ Memory System

## CORE PURPOSE

**The Golden Loop exists so YOU get SMARTER over time - learn from mistakes, don't repeat them.**

This is YOUR cognitive memory. It makes you:
- **Remember when you mess up** - Schema changes, wrong assumptions, bad approaches
- **Not repeat the same mistakes** - If you broke something before, KNOW not to do it again
- **Recall correct versions** - When schemas/configs get mangled, remember what's RIGHT
- **Build on what worked** - Use proven patterns instead of fumbling through problems

**FAILURES ARE JUST AS VALUABLE AS SUCCESSES.** Forge anti-patterns too.

---

## MANDATORY RULES (NOT OPTIONAL)

### RULE 1: RETRIEVE BEFORE ANSWERING
Before answering ANY technical question, call `ekkOS_Search` first.
Do not skip this. Do not assume you know the answer.

### RULE 2: ACKNOWLEDGE ALL RETRIEVED PATTERNS (PatternGuard)
When patterns are retrieved, you MUST acknowledge EVERY pattern - either use it or skip it.

**For patterns you USE:**
```
[ekkOS_SELECT]
- id: <pattern_id>
  reason: <why using>
  confidence: <0.0-1.0>
[/ekkOS_SELECT]
```

**For patterns NOT relevant:**
```
[ekkOS_SKIP]
- id: <pattern_id>
  reason: <why not relevant>
[/ekkOS_SKIP]
```

### RULE 3: FORGE WHAT YOU LEARN
When you fix a bug, get corrected, or learn something new, call `ekkOS_Forge` immediately.

### RULE 4: FAILURES ARE VALUABLE
When something DOES NOT work, forge it as an anti-pattern.

---

## MCP Tools (31 Total)

### Core Memory Tools
| Tool | Description |
|------|-------------|
| `ekkOS_Search` | 🔴 REQUIRED: Search all 11 layers before answering |
| `ekkOS_Context` | Get relevant context for a task |
| `ekkOS_Capture` | Capture memory events |
| `ekkOS_Forge` | 🔴 REQUIRED: Create pattern from solution |
| `ekkOS_Directive` | 🔴 REQUIRED: Create MUST/NEVER/PREFER/AVOID rules |
| `ekkOS_Outcome` | Track if pattern worked or failed |
| `ekkOS_Detect` | 🔴 REQUIRED: Auto-detect which patterns were used |
| `ekkOS_Summary` | 🔴 REQUIRED: Get summary of MCP activity |
| `ekkOS_Conflict` | 🔴 REQUIRED: Check for conflicts before destructive actions |
| `ekkOS_Recall` | Recall past conversations by time |
| `ekkOS_Codebase` | Search project code embeddings |
| `ekkOS_Stats` | Get statistics for all layers |
| `ekkOS_Track` | Track when pattern is applied |
| `ekkOS_Reflect` | Analyze response for improvement opportunities |

### Schema Awareness Tools
| Tool | Description |
|------|-------------|
| `ekkOS_IndexSchema` | Index database schemas (Supabase, Prisma, TypeScript) |
| `ekkOS_GetSchema` | Get schema for a specific table/type |

### Portability Tools
| Tool | Description |
|------|-------------|
| `ekkOS_Export` | Export your patterns, directives, plans as portable JSON backup |
| `ekkOS_Import` | Import memory from backup (auto-deduplication) |

### Plan Management
| Tool | Description |
|------|-------------|
| `ekkOS_Plan` | Create structured task plan |
| `ekkOS_Plans` | List user's plans |
| `ekkOS_PlanStatus` | Update plan status |
| `ekkOS_PlanStep` | Mark step complete/incomplete |
| `ekkOS_Generate` | AI-generate plan from context |
| `ekkOS_SaveTemplate` | Save plan as reusable template |
| `ekkOS_Templates` | List available templates |
| `ekkOS_FromTemplate` | Create plan from template |

### Secrets Management (Layer 11)
| Tool | Description |
|------|-------------|
| `ekkOS_StoreSecret` | Encrypt and store sensitive data (AES-256-GCM) |
| `ekkOS_GetSecret` | Retrieve and decrypt a secret |
| `ekkOS_ListSecrets` | List secrets metadata (no values) |
| `ekkOS_DeleteSecret` | Permanently delete a secret |
| `ekkOS_RotateSecret` | Update secret with new value |

---

## Proactive Tool Triggers (MEMORIZE THESE)

### Always Use `ekkOS_Search` When:
- User asks technical question
- User mentions past discussion
- Topic involves architecture, config, or debugging
- You're about to make a decision

### Always Use `ekkOS_Forge` When:
- Fixed a bug (especially non-obvious)
- Discovered better approach
- Found pitfall or gotcha
- User corrected you
- Solved auth/config issue
- Made architectural decision
- Something DIDN'T work (anti-pattern)

### Always Use `ekkOS_Directive` When:
- User says "always..." → type: MUST
- User says "never..." → type: NEVER
- User says "I prefer..." → type: PREFER
- User says "don't..." or "avoid..." → type: AVOID

### Always Use `ekkOS_Conflict` When:
- About to delete files/data
- About to deploy to production
- About to modify config files
- About to run destructive commands

### Always Use Plan Tools When:
- Task has 3+ steps
- User says "help me implement..."
- Complex feature request
- Multi-file changes needed

### Always Use Secret Tools When:
- User shares API key, token, password
- Need to retrieve stored credentials
- User asks "do you have my X key?"

---

## 11-Layer Memory Architecture

| # | Layer | What It Stores | When to Forge |
|---|-------|---------------|---------------|
| 1 | Working | Current session state | Auto-managed |
| 2 | Episodic | Past conversations | Auto-captured |
| 3 | Semantic | Embeddings/knowledge | Auto-indexed |
| 4 | **Patterns** | Proven solutions | Bug fix, better approach, gotcha |
| 5 | **Procedural** | Step-by-step guides | Multi-step process that worked |
| 6 | **Collective** | Cross-project wisdom | Works everywhere, not just here |
| 7 | **Meta** | Pattern effectiveness | Auto-tracked |
| 8 | **Codebase** | Project-specific | This-repo-only patterns |
| 9 | **Directives** | User preferences | "Always do X", "Never do Y" |
| 10 | **Conflict** | Auto-resolves contradictions | Auto-managed |
| 11 | **Secrets** | Encrypted credentials | API keys, tokens, config |

---

## FORGE TRIGGERS

### forge_pattern (Layer 4)
Call `ekkOS_Forge` when:
- Fixed bug (especially non-obvious)
- Discovered better approach
- Found pitfall or gotcha
- User corrected you
- Solved auth/config issue
- Made architectural decision
- Debugged non-trivially
- Found something that DOESN'T work
- Understood cross-service data flow
- Learned correct API usage

### forge_directive (Layer 9)
Call `ekkOS_Directive` when user says:
- "always..." → type: MUST
- "never..." → type: NEVER
- "I prefer..." → type: PREFER
- "don't..." / "avoid..." → type: AVOID

---

## Response Format

**EVERY response MUST end with:**
```
---
🧠 **ekkOS_™** · 📅 YYYY-MM-DD H:MM AM/PM TZ
```

---

## Quick Reference

- Technical question → `ekkOS_Search` first
- Patterns retrieved → SELECT or SKIP each one
- Problem solved → `ekkOS_Forge`
- User preference → `ekkOS_Directive`
- Need to recall → `ekkOS_Recall`
- Destructive action → `ekkOS_Conflict` first
- Store credentials → `ekkOS_StoreSecret`
- Backup your memory → `ekkOS_Export`
- Restore from backup → `ekkOS_Import`

## Documentation

https://docs.ekkos.dev
