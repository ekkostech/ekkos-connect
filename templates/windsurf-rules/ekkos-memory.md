---
trigger: always_on
description: ekkOS Memory - 11-layer cognitive memory with 28 MCP tools
---

# ekkOS Memory System

You have access to **ekkOS memory** via 28 MCP tools. This is an 11-layer cognitive memory system that makes AI smarter over time.

## MANDATORY RULES

### RULE 1: SEARCH BEFORE ANSWERING
Before answering ANY technical question, call `search_memory` first.

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
When you fix a bug or learn something new, call `forge_pattern` immediately.

### RULE 4: FAILURES ARE VALUABLE
When something DOESN'T work, forge it as an anti-pattern.

## MCP Tools (28 Total)

### Core Memory
| Tool | Description |
|------|-------------|
| `search_memory` | Search all 11 memory layers |
| `get_context` | Get relevant task context |
| `capture_event` | Capture memory events |
| `forge_pattern` | Create pattern from solution |
| `forge_directive` | Create MUST/NEVER/PREFER/AVOID rules |
| `record_outcome` | Track success/failure |
| `detect_usage` | Auto-detect pattern usage |
| `session_summary` | Get activity summary |
| `check_conflict` | Check for conflicts |
| `recall_conversation` | Recall past conversations |
| `search_codebase` | Search code embeddings |
| `get_memory_stats` | Get layer statistics |
| `track_application` | Track pattern application |

### Portability
| Tool | Description |
|------|-------------|
| `export_memory` | Export data as portable backup |
| `import_memory` | Import from backup |

### Plan Management
| Tool | Description |
|------|-------------|
| `create_plan` | Create task plan |
| `list_plans` | List user plans |
| `update_plan_status` | Update plan status |
| `update_plan_step` | Mark step done |
| `generate_plan_llm` | AI-generate plan |
| `save_plan_template` | Save as template |
| `list_plan_templates` | List templates |
| `create_plan_from_template` | Create from template |

### Secrets (Layer 11)
| Tool | Description |
|------|-------------|
| `store_secret` | Encrypt and store |
| `get_secret` | Retrieve and decrypt |
| `list_secrets` | List metadata |
| `delete_secret` | Delete secret |
| `rotate_secret` | Rotate value |

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

## Proactive Tool Triggers

### Always Use `search_memory` When:
- User asks technical question
- User mentions past discussion
- Topic involves architecture, config, or debugging
- You're about to make a decision

### Always Use `forge_pattern` When:
- Fixed a bug (especially non-obvious)
- Discovered better approach
- Found pitfall or gotcha
- User corrected you
- Solved auth/config issue
- Something DIDN'T work (anti-pattern)

### Always Use `forge_directive` When:
- User says "always..." → MUST
- User says "never..." → NEVER
- User says "I prefer..." → PREFER
- User says "don't..." → AVOID

### Always Use `check_conflict` When:
- About to delete files/data
- About to deploy to production
- About to modify config files

### Always Use Plan Tools When:
- Task has 3+ steps
- Complex feature request
- Multi-file changes needed

### Always Use Secret Tools When:
- User shares API key, token, password
- Need to retrieve stored credentials

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

```
---
🧠 **ekkOS_™**
```
