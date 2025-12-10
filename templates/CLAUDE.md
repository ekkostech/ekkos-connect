# ekkOS_ Memory System

**CRITICAL**: You have access to a 10-layer memory system. USE IT.

## Automatic Retrieval (Hooks Handle This)
- Patterns injected at start → READ and APPLY them
- Output `[ekkOS_APPLY] Using: "Pattern Name"` when you use one

## 10-Layer Memory Architecture

| Layer | What It Stores | When to Forge |
|-------|---------------|---------------|
| 1. Working | Current session state | Auto-managed |
| 2. Episodic | Past conversations | Auto-captured |
| 3. Semantic | Embeddings/knowledge | Auto-indexed |
| 4. **Patterns** | Proven solutions | Bug fix, better approach, gotcha |
| 5. **Procedural** | Step-by-step guides | Multi-step process that worked |
| 6. **Collective** | Cross-project wisdom | Works everywhere |
| 7. Meta-Learning | Pattern effectiveness | Auto-managed |
| 8. **Codebase** | Project-specific | This-repo-only patterns |
| 9. **Directives** | User preferences | "Always do X", "Never do Y" |
| 10. Planning | Agent task plans | Auto-managed |

## FORGE TRIGGERS (YOU MUST DO THIS)

### Pattern (Layer 4) - Default
```
[ekkOS_LEARN] Forging pattern: "Title"
```
**When** (FORGE AGGRESSIVELY):
- Fixed bug (especially non-obvious)
- Discovered better approach
- Found pitfall or gotcha
- User corrected you
- Solved auth/config issue
- Made architectural decision (capture WHY)
- Wired systems together successfully
- Debugged non-trivially (capture METHOD)
- Discovered performance characteristics
- Found something that DOESN'T work
- Understood cross-service data flow
- Hit environment-specific behavior
- Formed useful mental model
- Established testing strategy
- Applied refactoring transformation
- Learned correct API usage

### Directive (Layer 9) - User Preferences
```
[ekkOS_LEARN] Forging directive: "Title"
```
**When**: User says "always", "never", "I prefer", "don't do X"

### Procedural (Layer 5) - How-To Guides
```
[ekkOS_LEARN] Forging procedural: "Title"
```
**When**: Built multi-step process, deployment workflow, setup sequence

### Codebase (Layer 8) - Project-Specific
```
[ekkOS_LEARN] Forging codebase pattern: "Title"
```
**When**: Pattern only applies to THIS project (file locations, conventions)

## Response Format

**EVERY response MUST end with:**
```
---
🧠 **ekkOS_™** · 📅 YYYY-MM-DD H:MM AM/PM TZ
```

Example: `🧠 **ekkOS_™** · 📅 2025-12-08 8:30 PM PST`

## Conditional Mid-Stream Triggers

When you detect these conditions mid-conversation, EXECUTE the action:

| Condition Detected | Action |
|-------------------|--------|
| Bug fixed | Output `[ekkOS_LEARN] Forging: "Title"` with problem + solution |
| User says "always/never" | Output `[ekkOS_LEARN] Forging directive: "Title"` with MUST/NEVER |
| Multi-step workflow complete | Output `[ekkOS_LEARN] Forging procedural: "Title"` |
| Pattern retrieved but failed | Report failure in response |

This is reactive forging - don't wait for end of session, forge as you go.

## Quick Reference

- See patterns in hook output → `[ekkOS_APPLY] Using: "Name"`
- Solve a problem → `[ekkOS_LEARN] Forging: "Title"`
- User correction → FORGE what you learned
- Multi-step solution → FORGE as procedural
- User preference → FORGE as directive
- Project-specific → FORGE as codebase

## For More Information

Visit https://docs.ekkos.dev for full documentation.
