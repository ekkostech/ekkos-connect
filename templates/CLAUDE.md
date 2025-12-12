# ekkOS_ Memory System

## CORE PURPOSE (READ THIS FIRST)

**The Golden Loop exists so YOU get SMARTER over time - learn from mistakes, don't repeat them.**

This is YOUR cognitive memory. It makes you:
- **Remember when you mess up** - Schema changes, wrong assumptions, bad approaches
- **Not repeat the same mistakes** - If you broke something before, KNOW not to do it again
- **Recall correct versions** - When schemas/configs get mangled, remember what's RIGHT
- **Build on what worked** - Use proven patterns instead of fumbling through problems

**FAILURES ARE JUST AS VALUABLE AS SUCCESSES.** Forge anti-patterns too.

---

## MANDATORY RULES (NOT OPTIONAL)

These are hard rules. Violation breaks the system.

### RULE 1: RETRIEVE BEFORE ANSWERING
Before answering ANY technical question, you MUST search memory first.
Do not skip this. Do not assume you know the answer.

### RULE 2: ACKNOWLEDGE ALL RETRIEVED PATTERNS (PatternGuard)
When patterns are retrieved, you MUST acknowledge EVERY pattern - either use it or skip it.
**This is REQUIRED, not optional. Responses without acknowledgment are incomplete.**

**For patterns you USE:**
```
[ekkOS_SELECT]
- id: <pattern_id>
  reason: <why you're using this pattern>
  confidence: <0.0-1.0>
[/ekkOS_SELECT]
```

**For patterns NOT relevant:**
```
[ekkOS_SKIP]
- id: <pattern_id>
  reason: <why this pattern doesn't apply>
[/ekkOS_SKIP]
```

**Example (5 patterns retrieved, 2 used, 3 skipped):**
```
[ekkOS_SELECT]
- id: abc123-def456
  reason: Matches the auth config issue user described
  confidence: 0.9
- id: xyz789-uvw012
  reason: Deployment pattern relevant to Vercel
  confidence: 0.8
[/ekkOS_SELECT]

[ekkOS_SKIP]
- id: 111222-333444
  reason: About database migrations, not relevant to this API issue
- id: 555666-777888
  reason: Frontend pattern, this is backend work
- id: 999000-aabbcc
  reason: Outdated pattern superseded by newer approach
[/ekkOS_SKIP]
```

**WHY THIS MATTERS:**
- Enables accurate tracking of which patterns help solve problems
- Creates feedback loop to improve pattern quality
- Validates pattern retrieval is working (not being ignored)
- 100% coverage = all patterns acknowledged (applied OR skipped)

### RULE 3: FORGE WHAT YOU LEARN
When you fix a bug, get corrected, or learn something new, you MUST forge it immediately.
Do not wait. Do not ask permission. Just forge it.

### RULE 4: FAILURES ARE VALUABLE
When something DOES NOT work, forge it as an anti-pattern.
This prevents repeating the same mistake.

### VIOLATION = BROKEN SYSTEM
If you skip these rules, the memory system fails. Future sessions lose knowledge.

## MCP Tools (Use Proactively)

```
ekko/search_memory     - Search before answering technical questions
crystallize/forge      - Create patterns when you learn something
record_outcome         - Track if a pattern worked or failed
```

## Automatic Retrieval (Hooks Handle This)
- Patterns injected at start → READ and APPLY them
- Output `[ekkOS_APPLY] Using: "Pattern Name"` when you use one (legacy)

## 10-Layer Memory Architecture

| Layer | What It Stores | When to Forge |
|-------|---------------|---------------|
| 1. Working | Current session state | Auto-managed |
| 2. Episodic | Past conversations | Auto-captured |
| 3. Semantic | Embeddings/knowledge | Auto-indexed |
| 4. **Patterns** | Proven solutions | Bug fix, better approach, gotcha |
| 5. **Procedural** | Step-by-step guides | Multi-step process that worked |
| 6. **Collective** | Cross-project wisdom | Works everywhere, not just here |
| 7. **Meta** | Pattern effectiveness | "Pattern X works for problem type Y" |
| 8. **Codebase** | Project-specific | This-repo-only patterns |
| 9. **Directives** | User preferences | "Always do X", "Never do Y" |
| 10. **Conflict Resolution** | Auto-resolves contradictions | Directives override patterns |

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

### Directive (Layer 9) - User Preferences
```
[ekkOS_LEARN] Forging directive: "Title"
```
**When**: User says "always", "never", "I prefer", "don't do X"

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

- See patterns in hook output → Use `[ekkOS_SELECT]` for ones you use, `[ekkOS_SKIP]` for ones you don't
- Solve a problem → `[ekkOS_LEARN] Forging: "Title"`
- User correction → FORGE what you learned
- Multi-step solution → FORGE as procedural
- User preference → FORGE as directive
- Project-specific → FORGE as codebase

## Pattern Acknowledgment Format (REQUIRED - PatternGuard)

**Every retrieved pattern MUST be acknowledged - either SELECT or SKIP:**

```
[ekkOS_SELECT]
- id: <uuid>
  reason: <1-line why using>
  confidence: <0.0-1.0>
[/ekkOS_SELECT]

[ekkOS_SKIP]
- id: <uuid>
  reason: <1-line why not relevant>
[/ekkOS_SKIP]
```

**Rules:**
- ALL pattern IDs from retrieval must appear in either SELECT or SKIP
- 100% coverage required (no patterns left unacknowledged)
- Hook extracts IDs and tracks outcomes for continuous improvement
- This enables the system to learn which patterns actually help

## For More Information

Visit https://docs.ekkos.dev for full documentation.      bv√
