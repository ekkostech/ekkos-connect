---
trigger: always_on
description: ekkOS Memory - 11-layer cognitive memory with 31 MCP tools
---

# ekkOS Memory System

You have access to **ekkOS memory** via 31 MCP tools. This is an 11-layer cognitive memory system that makes AI smarter over time by learning from past sessions.

## MANDATORY RULES

### RULE 1: SEARCH BEFORE ANSWERING
Before answering ANY technical question, call `ekkOS_Search` first.

### RULE 2: ACKNOWLEDGE RETRIEVED PATTERNS
When patterns are retrieved:
```
[ekkOS_SELECT]
- id: <pattern_id>
  reason: <why using>
  confidence: <0.0-1.0>
[/ekkOS_SELECT]

[ekkOS_SKIP]
- id: <pattern_id>
  reason: <why not relevant>
[/ekkOS_SKIP]
```

### RULE 3: FORGE WHAT YOU LEARN
When you fix a bug or learn something new, call `ekkOS_Forge` immediately.

### RULE 4: FAILURES ARE VALUABLE
When something DOESN'T work, forge it as an anti-pattern.

## MCP Tools (31 Total)

### Core Memory Tools
| Tool | Description |
|------|-------------|
| `ekkOS_Search` | Search all 11 memory layers |
| `ekkOS_Context` | Get relevant task context |
| `ekkOS_Capture` | Capture memory events |
| `ekkOS_Forge` | Create pattern from solution |
| `ekkOS_Directive` | Create MUST/NEVER/PREFER/AVOID rules |
| `ekkOS_Outcome` | Track success/failure |
| `ekkOS_Detect` | Auto-detect pattern usage |
| `ekkOS_Summary` | Get activity summary |
| `ekkOS_Conflict` | Check for conflicts |
| `ekkOS_Recall` | Recall past conversations |
| `ekkOS_Codebase` | Search code embeddings |
| `ekkOS_Stats` | Get layer statistics |
| `ekkOS_Track` | Track pattern application |
| `ekkOS_Reflect` | Analyze response for improvements |

### Schema Awareness Tools
| Tool | Description |
|------|-------------|
| `ekkOS_IndexSchema` | Index database schemas (Supabase/Prisma/TS) |
| `ekkOS_GetSchema` | Get schema for a specific table/type |

### Portability
| Tool | Description |
|------|-------------|
| `ekkOS_Export` | Export data as portable backup |
| `ekkOS_Import` | Import from backup |

### Plan Management
| Tool | Description |
|------|-------------|
| `ekkOS_Plan` | Create task plan |
| `ekkOS_Plans` | List user plans |
| `ekkOS_PlanStatus` | Update plan status |
| `ekkOS_PlanStep` | Mark step done |
| `ekkOS_Generate` | AI-generate plan |
| `ekkOS_SaveTemplate` | Save as template |
| `ekkOS_Templates` | List templates |
| `ekkOS_FromTemplate` | Create from template |

### Secrets (Layer 11)
| Tool | Description |
|------|-------------|
| `ekkOS_StoreSecret` | Encrypt and store |
| `ekkOS_GetSecret` | Retrieve and decrypt |
| `ekkOS_ListSecrets` | List metadata |
| `ekkOS_DeleteSecret` | Delete secret |
| `ekkOS_RotateSecret` | Rotate value |

## 11-Layer Architecture

| # | Layer | Purpose |
|---|-------|---------|
| 1 | Working | Current session |
| 2 | Episodic | Past conversations |
| 3 | Semantic | Embeddings |
| 4 | Patterns | Proven solutions |
| 5 | Procedural | Step-by-step guides |
| 6 | Collective | Cross-project wisdom |
| 7 | Meta | Pattern effectiveness |
| 8 | Codebase | Project code |
| 9 | Directives | User rules |
| 10 | Conflict | Auto-resolution |
| 11 | Secrets | Encrypted credentials (AES-256-GCM) |

## FORGE TRIGGERS

**forge_pattern** when you:
- Fix a bug
- Find better approach
- Discover gotcha
- Get corrected
- Solve auth/config
- Make architecture decision
- Debug non-trivially
- Find anti-pattern

**forge_directive** when user says:
- "always..." → MUST
- "never..." → NEVER
- "I prefer..." → PREFER
- "don't..." → AVOID

## Response Format

End every response with:
```
---
🧠 **ekkOS_™** · 📅 YYYY-MM-DD H:MM AM/PM TZ
```
