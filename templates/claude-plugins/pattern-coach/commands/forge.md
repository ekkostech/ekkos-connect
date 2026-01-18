# Forge Pattern

Interactive assistant to capture solutions and failures as permanent patterns in your ekkOS memory.

## Overview

**This is the LEARN phase of the Golden Loop** - turning your hard-won solutions into reusable patterns so you never have to solve the same problem twice.

Most developers forget to do this! Pattern Coach makes forging easy and ensures every lesson learned is captured.

## What it does

1. **Detects context** - Analyzes recent conversation for problem/solution
2. **Asks smart questions** - Guides you through pattern creation
3. **Validates quality** - Checks for duplicates and completeness
4. **Forges to memory** - Saves pattern to your ekkOS substrate
5. **Tracks success** - Future uses will update success rate
6. **Captures failures too** - Anti-patterns are equally valuable

## Usage

```bash
# Interactive forging (recommended)
/forge

# Quick forge from conversation
/forge quick

# Forge a failure/anti-pattern
/forge failure

# Create a user preference rule
/forge rule
```

## Example - Interactive Forging

```
⚒️  Pattern Coach - Let's Forge This Solution!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

I noticed you just fixed something! Let me help you forge this
into a pattern so ekkOS remembers it forever.

───────────────────────────────────────────────────────────────────
📝 Context Detected:

From recent conversation:
  • You had: "TypeError: Cannot read property 'map' of undefined"
  • You fixed: Added optional chaining `users?.map()`
  • File: src/components/UserList.tsx

Does this look right? (yes/no) > yes

───────────────────────────────────────────────────────────────────
🎯 Pattern Details:

1. Give this pattern a clear title:
   (Something you'll recognize when you see it again)

   Suggested: "Fix undefined map errors with optional chaining"
   Use this? (yes/custom) > yes

2. What was the problem?
   (Describe the error or issue you encountered)

   Auto-detected:
   "TypeError: Cannot read property 'map' of undefined when
   trying to iterate over array that might be null/undefined"

   Looks good? (yes/edit) > yes

3. What's the solution?
   (How do you fix it?)

   Auto-detected:
   "Use optional chaining (?.) before calling .map():
   ```typescript
   // ❌ Before (crashes)
   users.map(user => ...)

   // ✅ After (safe)
   users?.map(user => ...)
   ```"

   Looks good? (yes/edit) > yes

───────────────────────────────────────────────────────────────────
🏷️  When does this pattern apply?

   Help ekkOS know when to suggest this pattern:

   [✓] Array operations (map, filter, reduce)
   [✓] Data that might be null/undefined
   [✓] TypeScript projects
   [ ] Only for React components
   [ ] Only for API responses

   Selected 3 conditions. Good! More specific = better matches.

───────────────────────────────────────────────────────────────────
⚠️  Any anti-patterns or gotchas?

   Things that DON'T work or mistakes to avoid:

   > Yes, don't use optional chaining in older JavaScript environments
   > that don't support ES2020

   Great! This prevents future mistakes.

───────────────────────────────────────────────────────────────────
✅ Pattern Preview:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TITLE: Fix undefined map errors with optional chaining

PROBLEM:
TypeError: Cannot read property 'map' of undefined when trying
to iterate over array that might be null/undefined.

SOLUTION:
Use optional chaining (?.) before calling .map():
```typescript
// ❌ Before (crashes)
users.map(user => ...)

// ✅ After (safe)
users?.map(user => ...)
```

WORKS WHEN:
• Array operations (map, filter, reduce)
• Data that might be null/undefined
• TypeScript projects

ANTI-PATTERNS:
• Don't use in older JS environments without ES2020 support

TAGS: typescript, array, null-safety, optional-chaining
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Forge this pattern? (yes/no) > yes

⚡ Forging pattern...

✅ Pattern forged successfully!

   Pattern ID: pat_abc123xyz
   Stored in: Layer 4 (Patterns - Personal)
   Available: Immediately

🎉 Great job! Next time you (or Claude) encounter:
   "TypeError: Cannot read property 'map'"

   This pattern will be automatically retrieved and suggested!

🔄 Golden Loop Status:
   ✅ RETRIEVE - (previous problem)
   ✅ APPLY - You applied optional chaining
   ✅ MEASURE - Will track if this works
   ✅ LEARN - Pattern now forged! ← YOU ARE HERE

Your ekkOS memory just got smarter! 🧠
```

## Example - Quick Forge

```
/forge quick

⚒️  Pattern Coach - Quick Forge
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Analyzing recent conversation...

✅ Detected solvable problem/solution:

Title: Fix undefined map errors with optional chaining
Problem: TypeError when calling .map() on undefined
Solution: Use optional chaining (users?.map())

Forge this? (yes/no/customize) > yes

✅ Forged! Pattern ID: pat_abc123xyz
```

## Example - Forge Failure (Anti-pattern)

```
/forge failure

⚒️  Pattern Coach - Capture What DIDN'T Work
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Failures are just as valuable as successes!**

Let's capture what DIDN'T work so you never repeat the mistake.

1. What did you try?
   > Used var instead of const in TypeScript

2. What went wrong?
   > TypeScript couldn't narrow types properly, caused weird scope bugs

3. What's the correct approach?
   > Always use const/let, never var

4. Why does this matter?
   > var has function scope, const/let have block scope
   > TypeScript type narrowing doesn't work with var

───────────────────────────────────────────────────────────────────
✅ Anti-Pattern Preview:

ANTI-PATTERN: Don't use var in TypeScript

WHAT DOESN'T WORK:
Using `var` keyword in TypeScript causes scope issues and breaks
type narrowing.

WHY IT FAILS:
• var has function scope (not block scope)
• TypeScript type narrowing doesn't work with var
• Modern ES6+ uses const/let exclusively

CORRECT APPROACH:
Always use const (preferred) or let (when reassignment needed).
Never use var.

```typescript
// ❌ Wrong
var userId = "123";

// ✅ Correct
const userId = "123";
```

───────────────────────────────────────────────────────────────────

Forge this anti-pattern? (yes/no) > yes

✅ Anti-pattern forged!
   Pattern ID: pat_anti_789xyz
   Type: Anti-pattern (what NOT to do)

Next time you (or Claude) try to use `var`, ekkOS will warn you!

Would you also like to create a NEVER directive?
(Makes this an unbreakable rule) (yes/no) > yes

✅ Directive created: [NEVER] Use var in TypeScript
   Priority: 90 (High)
   Scope: Global (all projects)

Now ekkOS will actively PREVENT using var in TypeScript! 🛡️
```

## Example - Create Rule/Directive

```
/forge rule

⚒️  Pattern Coach - Create User Preference Rule
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Directives are unbreakable rules - they override patterns.

Use for strong preferences: "ALWAYS do X", "NEVER do Y"

1. Rule type:
   [ ] MUST (always do this)
   [x] NEVER (never do this)
   [ ] PREFER (when possible)
   [ ] AVOID (try not to)

2. What's the rule?
   > Use var in TypeScript code

3. Why? (helps Claude understand importance)
   > Causes scope issues and type narrowing problems

4. Scope:
   [x] Global (all your projects)
   [ ] Project (current project only)
   [ ] Specific (e.g., "backend", "frontend")

5. Priority (1-100):
   Suggested: 90 (high priority for NEVER rules)
   Use this? (yes/custom) > yes

───────────────────────────────────────────────────────────────────
✅ Directive Preview:

[NEVER] Use var in TypeScript code

Scope: Global (all projects)
Priority: 90 (High - will override conflicting patterns)
Reason: Causes scope issues and type narrowing problems

This directive will:
• Appear in every Claude session
• Override any patterns suggesting var
• Block code that uses var
• Work across all your projects

───────────────────────────────────────────────────────────────────

Create this directive? (yes/no) > yes

✅ Directive created!
   Directive ID: dir_never_123
   Active: Immediately
   Scope: Global

Claude will now follow this rule in ALL your projects! 📜
```

## Requirements

- ekkOS MCP server configured
- Recent conversation with problem/solution context
- (Or provide details manually in interactive mode)

## Tips for Good Patterns

1. **Be specific about the problem**
   - ❌ "Error in code"
   - ✅ "TypeError: Cannot read property 'map' of undefined"

2. **Provide code examples**
   - Show before/after
   - Highlight the key change

3. **Document when it applies**
   - What conditions make this relevant?
   - When should ekkOS suggest it?

4. **Capture failures too!**
   - What you tried that DIDN'T work
   - Why it failed
   - What to do instead

5. **Use tags**
   - typescript, react, api, database, etc.
   - Helps ekkOS find patterns faster

## Implementation Details

When this command runs, Claude will:

1. Analyze recent conversation for problem/solution pairs
2. Extract code changes if any
3. In interactive mode:
   - Ask clarifying questions
   - Pre-fill detected information
   - Validate completeness
   - Check for duplicates via `ekkOS_Search`
4. Call `ekkOS_Forge({title, problem, solution, anti_patterns, works_when, tags})`
5. Optionally create directive via `ekkOS_Directive({type, rule, scope, priority})`
6. Return pattern/directive ID
7. Pattern becomes available for future retrievals immediately

This command ensures you never lose hard-won solutions and always learn from mistakes.

**The Golden Loop isn't complete until you FORGE!** ⚒️
