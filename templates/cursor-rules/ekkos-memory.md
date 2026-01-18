---
description: "ekkOS Memory - 11-layer cognitive memory with 31 MCP tools"
alwaysApply: true
---

# ekkOS Memory System

You have access to **ekkOS memory** via 31 MCP tools. This is an 11-layer cognitive memory system that makes AI smarter over time by learning from past sessions.

## MANDATORY RULES

### RULE 1: SEARCH BEFORE ANSWERING
Before answering ANY technical question, call `ekkOS_Search` first.
Do not skip this. Do not assume you know the answer.

### RULE 2: ACKNOWLEDGE RETRIEVED PATTERNS
When patterns are retrieved, acknowledge each one:
```
[ekkOS_SELECT]
- id: <pattern_id>
  reason: <why using this>
  confidence: <0.0-1.0>
[/ekkOS_SELECT]

[ekkOS_SKIP]
- id: <pattern_id>
  reason: <why not relevant>
[/ekkOS_SKIP]
```

### RULE 3: FORGE WHAT YOU LEARN
When you fix a bug, get corrected, or learn something new, call `ekkOS_Forge` immediately.

### RULE 4: FAILURES ARE VALUABLE
When something DOES NOT work, forge it as an anti-pattern.

## MCP Tools (31 Total)

### Core Memory Tools
| Tool | Description |
|------|-------------|
| `ekkOS_Search` | Search across all 11 memory layers |
| `ekkOS_Context` | Get relevant context for a task |
| `ekkOS_Capture` | Capture memory events |
| `ekkOS_Forge` | Create pattern from learned solution |
| `ekkOS_Directive` | Create MUST/NEVER/PREFER/AVOID rules |
| `ekkOS_Outcome` | Track if pattern worked or failed |
| `ekkOS_Detect` | Auto-detect which patterns were used |
| `ekkOS_Summary` | Get summary of recent MCP activity |
| `ekkOS_Conflict` | Check for directive/pattern conflicts |
| `ekkOS_Recall` | Recall past conversations by time |
| `ekkOS_Codebase` | Search project code embeddings |
| `ekkOS_Stats` | Get statistics for all layers |
| `ekkOS_Track` | Track when pattern is applied |
| `ekkOS_Reflect` | Analyze response for improvements |

### Schema Awareness Tools
| Tool | Description |
|------|-------------|
| `ekkOS_IndexSchema` | Index database schemas (Supabase/Prisma/TS) |
| `ekkOS_GetSchema` | Get schema for a specific table/type |

### Portability Tools
| Tool | Description |
|------|-------------|
| `ekkOS_Export` | Export your memory data as portable JSON backup |
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
| `ekkOS_StoreSecret` | Encrypt and store sensitive data |
| `ekkOS_GetSecret` | Retrieve and decrypt a secret |
| `ekkOS_ListSecrets` | List secrets metadata (no values) |
| `ekkOS_DeleteSecret` | Permanently delete a secret |
| `ekkOS_RotateSecret` | Update secret with new value |

## 11-Layer Architecture

| # | Layer | Purpose |
|---|-------|---------|
| 1 | Working | Current session state |
| 2 | Episodic | Past conversations |
| 3 | Semantic | Embeddings/knowledge |
| 4 | Patterns | Proven solutions |
| 5 | Procedural | Step-by-step guides |
| 6 | Collective | Cross-project wisdom |
| 7 | Meta | Pattern effectiveness |
| 8 | Codebase | Project-specific code |
| 9 | Directives | MUST/NEVER/PREFER/AVOID rules |
| 10 | Conflict Resolution | Auto-resolves contradictions |
| 11 | Secrets | Encrypted credentials (AES-256-GCM) |

## FORGE TRIGGERS

Call `ekkOS_Forge` when you:
- Fix a bug (especially non-obvious)
- Discover a better approach
- Find a pitfall or gotcha
- Get corrected by the user
- Solve auth/config issues
- Make architectural decisions
- Debug non-trivially
- Find something that DOESN'T work

Call `ekkOS_Directive` when user says:
- "always..." → MUST
- "never..." → NEVER
- "I prefer..." → PREFER
- "don't..." / "avoid..." → AVOID

## Response Format

End every response with:
```
---
🧠 **ekkOS_™** · 📅 YYYY-MM-DD H:MM AM/PM TZ
```

























































