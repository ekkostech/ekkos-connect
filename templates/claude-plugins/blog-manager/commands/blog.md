# Blog Manager

Editorial enforcement system for ekkOS blog. Create, research, and publish thought leadership content with built-in credibility guardrails.

## Overview

**This is not a blog generator. It is an institutional credibility engine.**

The ekkOS blog exists to educate, not to sell. Every post must:
- Teach first, mention ekkOS last
- Ground claims in evidence or explicit qualifiers
- Acknowledge trade-offs and limitations
- Position ekkOS as one option, not the only option

## Editorial Philosophy: "Teach First, Sell Last"

**Content Ratio:** 80% problem + solutions landscape, 15% practical how-to, 5% ekkOS mention

**The Rule:** ekkOS should only appear in a dedicated section titled "How we think about this at ekkOS_" — 3-6 sentences max, placed near the end.

## Usage

```bash
# Dashboard - see all posts and their status
/blog

# Create new post with guided workflow
/blog new [topic]

# Edit existing post
/blog edit [slug]

# Preview post with frontmatter validation
/blog preview [slug]

# Generate cover image with FLUX 2 Max
/blog image [slug]

# Schedule post for future publication
/blog schedule [slug] [date]

# Publish immediately
/blog publish [slug]

# SEO optimization (problem-oriented, not product-oriented)
/blog seo [slug]

# Research trending topics with Perplexity Sonar Pro
/blog research [topic]

# Generate topic ideas relevant to ekkOS mission
/blog ideas

# Editorial QA - salesiness score, banned words, truthfulness
/blog tonecheck [slug]

# Extract and audit all claims
/blog claims [slug]
```

---

## Example - Dashboard (`/blog`)

```
📰 ekkOS Blog Dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Status Overview:
   Published: 7 posts
   Scheduled: 0 posts
   Drafts: 0 posts

───────────────────────────────────────────────────────────────────
✅ Published Posts (newest first):

1. patterns-that-learn.md
   "Patterns That Learn — How AI Memory Should Actually Work"
   📅 2026-01-14 · 📖 5 min · 🏷️ patterns, feedback-loops, learning

2. instruction-hierarchy-problem.md
   "The Instruction Hierarchy Problem in AI Safety"
   📅 2026-01-12 · 📖 6 min · 🏷️ safety, directives, architecture

3. one-memory-five-tools.md
   "One Memory, Five Tools — Why Platform Matters"
   📅 2026-01-10 · 📖 5 min · 🏷️ integration, tools, platform

4. why-jailbreaks-work-and-how-persistent-memory-fixes-them.md
   "Why Jailbreaks Work (And How Persistent Memory Fixes Them)"
   📅 2026-01-08 · 📖 4 min · 🏷️ security, jailbreaks, memory

5. your-ai-forgot-again.md
   "Your AI Forgot Again — The Context Window Crisis"
   📅 2026-01-06 · 📖 4 min · 🏷️ context, memory, limitations

6. why-rag-isnt-memory.md
   "Why RAG Isn't Memory"
   📅 2026-01-04 · 📖 5 min · 🏷️ RAG, memory, architecture

7. welcome-to-ekkos-blog.md
   "Welcome to the ekkOS Blog"
   📅 2026-01-02 · 📖 2 min · 🏷️ announcement

───────────────────────────────────────────────────────────────────
Commands:
  /blog new [topic]     Create new post
  /blog edit [slug]     Edit existing post
  /blog tonecheck [slug] Run editorial QA
  /blog research [topic] Research with Perplexity
```

---

## Example - New Post (`/blog new`)

```
/blog new "Why Most AI Memory Solutions Miss the Point"

📝 New Post Workflow
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Topic: "Why Most AI Memory Solutions Miss the Point"

───────────────────────────────────────────────────────────────────
📋 Step 1: Choose Template

Which template fits this topic?

[A] Pain Point Deep Dive (recommended)
    • Why this problem exists (systems + incentives)
    • Where teams usually get misled
    • Failure modes and measurement
    • 2-3 approaches with trade-offs
    • "Where ekkOS_ fits (and where it doesn't)"
    • Practical next steps checklist

[B] Field Guide
    • Definitions
    • Decision tree
    • Implementation pitfalls
    • Minimal reference architecture
    • Validation plan
    • Optional ekkOS_ sidebar

[C] Research Commentary
    • What the source says (quoted minimally, cited)
    • What it gets right
    • What it misses in deployment reality
    • Your framework or implementation interpretation
    • ekkOS_ positioning as practical path

> A

───────────────────────────────────────────────────────────────────
📋 Step 2: Evidence vs Hypothesis

What can we claim WITH evidence?
(Benchmarks, citations, public docs, internal metrics with scope)

> Vector DBs don't track outcome success rates (cite LangChain docs)
> RAG systems retrieve but don't learn (cite industry surveys)
> Pattern-based retrieval improves over time (internal: 84% success rate)

What must be framed as HYPOTHESIS or EXPERIENCE?

> "In our deployments, we've seen..." (scope: 50+ users)
> "Teams often struggle with..." (experience, not universal)

───────────────────────────────────────────────────────────────────
📋 Step 3: Trade-offs

What are the top 3 trade-offs of ekkOS's approach?

> 1. Requires user adoption of pattern forging habits
> 2. Cold start problem - needs initial patterns to be useful
> 3. Verification adds latency vs pure retrieval

───────────────────────────────────────────────────────────────────
📋 Step 4: Where We Don't Fit

Write the "where ekkOS_ doesn't fit" paragraph:

> ekkOS_ is not the right choice if you need: (a) pure vector search
> without learning, (b) one-shot retrieval without feedback loops,
> or (c) systems where patterns don't repeat across sessions.

───────────────────────────────────────────────────────────────────
📋 Step 5: Generate Metadata

Title: "Why Most AI Memory Solutions Miss the Point"
Slug: why-most-ai-memory-solutions-miss-the-point
Description: "Vector databases store context. RAG retrieves it.
But neither learns from outcomes. Here's what's missing."
Tags: ["memory", "RAG", "vector-db", "learning", "architecture"]
Author: ekkOS Team

───────────────────────────────────────────────────────────────────
✅ Creating post...

Created: apps/blog/content/why-most-ai-memory-solutions-miss-the-point.md

📝 Post created as DRAFT. Next steps:
   /blog edit why-most-ai-memory-solutions-miss-the-point
   /blog tonecheck why-most-ai-memory-solutions-miss-the-point
   /blog image why-most-ai-memory-solutions-miss-the-point
   /blog publish why-most-ai-memory-solutions-miss-the-point
```

---

## Example - Tone Check (`/blog tonecheck`)

```
/blog tonecheck patterns-that-learn

📝 Tone Check: patterns-that-learn.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Salesiness Score: 8% ✅ (threshold: <15%)

   Metrics:
   • ekkOS mentions: 3 (all in final section) ✅
   • First mention: line 142 (87% into post) ✅
   • Product density: 2.1% ✅
   • Banned words found: 0 ✅
   • "Simply/Just" found: 0 ✅

───────────────────────────────────────────────────────────────────
✅ Truthfulness Checklist:

   [✓] Numeric claims sourced
       • "60-70% drop" → The Hacker News (cited line 38)

   [✓] Comparisons qualified
       • "in many setups" used appropriately

   [✓] No unqualified roadmap claims

   [✓] Has "Trade-offs" section (line 98)

───────────────────────────────────────────────────────────────────
⚠️ Warnings (advisory, not blocking):

   • Line 45: "often fails" → Consider adding scope qualifier
   • Consider adding explicit "Limitations" subsection

───────────────────────────────────────────────────────────────────
🚫 Blockers: None

Overall: PASS ✅

Ready to publish? Run: /blog publish patterns-that-learn
```

---

## Example - Claims Audit (`/blog claims`)

```
/blog claims patterns-that-learn

📋 Claims Audit: patterns-that-learn.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Found 7 claims (declarative, numeric, or comparative):

───────────────────────────────────────────────────────────────────
1. "False positives drop by 60-70% in first feedback cycle"

   Type: OBSERVED ✅
   Source: The Hacker News (cited line 38) ✅
   Status: Valid

───────────────────────────────────────────────────────────────────
2. "Most knowledge bases don't track which solutions work"

   Type: EXPERIENCE ⚠️
   Qualifier: Missing scope

   Suggested fix:
   "In our analysis of 20+ knowledge base implementations,
   most don't track which solutions actually work."

───────────────────────────────────────────────────────────────────
3. "ekkOS patterns surface more effective solutions over time"

   Type: COMPARATIVE ⚠️
   Issue: Needs conditions defined

   Suggested fix:
   "In systems with active feedback loops, ekkOS patterns
   surface more effective solutions over time, as measured
   by success rate improvements in our internal deployments."

───────────────────────────────────────────────────────────────────
4. "Pattern success rates improve with feedback"

   Type: OBSERVED ✅
   Source: Internal metrics (labeled line 112) ✅
   Status: Valid

───────────────────────────────────────────────────────────────────
5. "Static knowledge bases don't learn"

   Type: OBSERVED ✅
   Source: Architectural definition (self-evident) ✅
   Status: Valid

───────────────────────────────────────────────────────────────────
6. "The principle applies directly to development knowledge"

   Type: EXPERIENCE ✅
   Qualifier: "The principle" (referential, scoped) ✅
   Status: Valid

───────────────────────────────────────────────────────────────────
7. "Without this, your knowledge base is just a filing cabinet"

   Type: COMPARATIVE ✅
   Qualifier: Metaphor, clearly rhetorical ✅
   Status: Valid

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Summary:
   ✅ Valid: 5 claims
   ⚠️ Needs qualifier: 2 claims
   🚫 Invalid: 0 claims

Actions Required:
   [ ] Add scope to claim #2
   [ ] Define conditions for claim #3
```

---

## Example - Research (`/blog research`)

```
/blog research "AI agent memory systems January 2026"

📡 Researching with Perplexity Sonar Pro...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔍 Query: "AI agent memory systems developments January 2026"
📅 Recency: Last 30 days

───────────────────────────────────────────────────────────────────
📰 Key Findings:

1. **OpenAI Agents SDK Update** (Jan 5, 2026)
   Native memory persistence announced for multi-turn agents
   Source: [OpenAI Blog](https://openai.com/blog/agents-sdk-memory)

   Gap: Still retrieval-only, no verified learning loop

2. **LangChain Memory Module v0.3** (Jan 3, 2026)
   New ConversationBufferMemory with persistence
   Source: [LangChain Docs](https://docs.langchain.com/memory)

   Gap: Storage without outcome tracking

3. **Stanford HAI Paper: "Memory-Augmented Agents"** (Dec 28, 2025)
   Research on episodic memory for LLM agents
   Source: [arXiv](https://arxiv.org/abs/2512.xxxxx)

   Insight: Validates feedback-driven pattern evolution

4. **Hacker News Discussion: "RAG is Not Memory"** (Jan 2, 2026)
   200+ comments on memory vs retrieval distinction
   Source: [HN Thread](https://news.ycombinator.com/item?id=xxxxx)

   Angle: Community already understands the problem

───────────────────────────────────────────────────────────────────
💡 ekkOS Blog Angles (aligned with editorial stance):

1. "What OpenAI's Agents SDK Gets Right About Memory (And What's Missing)"
   Template: Research Commentary
   Angle: Acknowledge progress, identify verification gap
   ekkOS fit: Where feedback loops matter

2. "The Stanford HAI Paper Validates What We've Been Building"
   Template: Research Commentary
   Angle: Academic support for pattern evolution
   ekkOS fit: Implementation of their research direction

3. "Why the HN Community is Right: RAG Really Isn't Memory"
   Template: Pain Point Deep Dive
   Angle: Expand on community insight with architecture depth
   ekkOS fit: One approach to the problem they identified

───────────────────────────────────────────────────────────────────
📋 Claim Validation Opportunities:

Before writing, validate with Perplexity:
• "What benchmarks exist for agent memory systems?"
• "Criticisms of RAG-only approaches in production"
• "Failure modes of LangChain memory in long sessions"

Would you like to create a post on any of these topics?
```

---

## Example - Topic Ideas (`/blog ideas`)

```
/blog ideas

💡 Topic Ideas for ekkOS Blog
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Based on: ekkOS mission, current trends, content gaps

───────────────────────────────────────────────────────────────────
🔥 High Priority (trending + aligned):

1. "The Verification Gap in AI Agent Memory"
   Why: OpenAI/LangChain memory lacks outcome tracking
   Template: Pain Point Deep Dive
   Evidence available: Yes (public docs, benchmarks)

2. "How Feedback Loops Change AI Knowledge Management"
   Why: Academic research supports this direction
   Template: Research Commentary
   Evidence available: Yes (Stanford HAI paper)

3. "What Enterprise Teams Get Wrong About RAG"
   Why: Perplexity shows enterprise RAG struggles
   Template: Field Guide
   Evidence available: Yes (industry surveys)

───────────────────────────────────────────────────────────────────
📚 Educational (evergreen):

4. "A Field Guide to AI Memory Architectures"
   Why: Foundational content, drives organic search
   Template: Field Guide
   Evidence available: Yes (architectural definitions)

5. "Measuring AI Agent Improvement Over Time"
   Why: Practical how-to, unique to learning systems
   Template: Field Guide
   Evidence available: Internal metrics + methodology

───────────────────────────────────────────────────────────────────
⚠️ Avoid (too promotional or unsubstantiated):

• "Why ekkOS is Better Than LangChain" (comparative without conditions)
• "The Future of AI Memory" (aspirational, no evidence)
• "ekkOS Success Stories" (case study needs real customers)

───────────────────────────────────────────────────────────────────
Ready to write? Run: /blog new "[topic]"
```

---

## Example - SEO Optimization (`/blog seo`)

```
/blog seo patterns-that-learn

🔍 SEO Optimization: patterns-that-learn.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current metadata:
   Title: "Patterns That Learn — How AI Memory Should Actually Work"
   Description: "Static knowledge bases don't improve. Feedback
   loops do. Here's how patterns can evolve based on whether they
   actually solve problems."

───────────────────────────────────────────────────────────────────
✅ SEO Compliance Check:

   [✓] Title is problem-oriented (not product-oriented)
   [✓] Description promises learning (not product outcomes)
   [✓] Tags are topical: patterns, feedback-loops, learning, architecture
   [✓] No brand-heavy tags

───────────────────────────────────────────────────────────────────
💡 Optimization Suggestions:

   Title alternatives (A/B test candidates):
   • "Why Static Knowledge Bases Don't Learn (And What Does)"
   • "Feedback Loops for AI Knowledge: A Practical Guide"
   • "The Missing Piece in AI Knowledge Management"

   Description alternatives:
   • "Most knowledge bases just store information. They don't know
     which solutions actually work. Here's how to fix that with
     feedback-driven patterns."

   Additional tags to consider:
   • knowledge-management
   • developer-tools
   • ai-infrastructure

───────────────────────────────────────────────────────────────────
🚫 SEO Anti-patterns (avoided):

   ✓ Not using: "ekkOS" in title
   ✓ Not using: "best", "ultimate", "revolutionary"
   ✓ Not promising: product outcomes in description

Update metadata? (yes/no)
```

---

## Frontmatter Reference

All posts use this schema:

```yaml
---
title: "Post Title Here"
description: "SEO description under 160 characters. Promise learning, not product outcomes."
date: "2026-01-14T09:00:00-05:00"  # ISO 8601, controls publication
author: "ekkOS Team"
tags: ["tag1", "tag2", "tag3"]  # Topical, not brand-heavy
image: "/images/blog/slug-name.png"
imageAlt: "Descriptive alt text for accessibility"
draft: true  # Optional - hides from public until removed
---
```

**Publication Logic:**
- `draft: true` → Hidden from public, visible at /preview
- `date > now` → Scheduled, hidden until date passes
- `draft: false && date <= now` → Published

---

## Banned Words and Constructions

**Hard ban (will fail tonecheck):**
- revolutionary
- game-changing
- unparalleled
- best-in-class
- world-class
- ultimate

**Soft ban (warnings):**
- "Simply..." (minimizes complexity)
- "Just..." (minimizes complexity)
- "Our solution is better than..." (unqualified comparative)

**Preferred language:**
- trade-offs
- failure modes
- constraints
- what to measure
- how to validate
- in practice
- in many setups
- depends on

---

## Claim Categories

Every claim in a post should fall into one of these categories:

| Category | Definition | Requirement |
|----------|------------|-------------|
| **Observed** | Backed by citation, benchmark, public doc | Must cite source |
| **Experience** | "We've seen..." or "In our deployments..." | Must include scope |
| **Aspirational** | Planned features or roadmap | Must label "planned" or "in progress" |
| **Comparative** | "X is better than Y" | Must define conditions |

**Rule:** If a paragraph includes a product claim, it must include either (a) a citation, (b) a concrete constraint, or (c) an explicit "depends on" qualifier.

---

## Competitor Mentions

When mentioning other tools (LangChain, LlamaIndex, etc.):

**Do:**
- Critique approaches, not teams
- Use "in many setups" and "often" rather than absolutes
- Acknowledge what they do well
- Identify gaps that appear at scale

**Don't:**
- Assert intent or competence of another team
- Make unqualified "better than" claims
- Use dismissive language

**Pattern:**
"Here's what [tool] is strong at; here's the gap that shows up at scale; here's one way to address it."

---

## The "ekkOS_ Promo with Class" Formula

Every post gets ONE small section with this structure:

**Section title:** "How we think about this at ekkOS_"

**Contents (3-6 sentences max):**
1. One concrete capability
2. One explicit constraint or trade-off
3. One "how to evaluate" suggestion

**Example:**
> ### How we think about this at ekkOS_
>
> We address this by tracking outcome success rates for every pattern retrieved.
> When a pattern helps solve a problem, its weight increases; when it doesn't, it
> decreases. This requires users to close the feedback loop, which adds friction
> but enables genuine learning. If you're evaluating memory systems, ask: "Does
> this system know which of its suggestions actually worked?"

---

## Implementation Details

When this command runs, Claude will:

**For `/blog` (dashboard):**
1. Use `Glob` to find all `*.md` files in `apps/blog/content/`
2. Use `Read` to parse frontmatter from each file
3. Categorize by status (published/scheduled/draft)
4. Display sorted by date

**For `/blog new`:**
1. Guide through template selection
2. Ask evidence vs hypothesis questions
3. Ask trade-offs questions
4. Ask "where we don't fit" question
5. Generate slug from title
6. Use `Write` to create markdown file with frontmatter + template structure

**For `/blog tonecheck`:**
1. Use `Read` to get post content
2. Count ekkOS mentions and their positions
3. Check for banned words (regex match)
4. Verify truthfulness checklist items exist
5. Calculate salesiness score
6. Output advisory warnings + any blockers

**For `/blog claims`:**
1. Use `Read` to get post content
2. Extract declarative sentences, numeric claims, comparative phrases
3. Categorize each claim (Observed/Experience/Aspirational/Comparative)
4. Check for required citations or qualifiers
5. Output checklist with suggested fixes

**For `/blog research`:**
1. Call `mcp__perplexity__search` or `mcp__perplexity__reason` with topic
2. Parse results for trends, citations, gaps
3. Map findings to ekkOS blog angles
4. Suggest claim validation queries

**For `/blog image`:**
1. Read post to understand topic
2. Generate FLUX 2 Max prompt following blog image style
3. Run `apps/blog/scripts/generate-blog-images.mjs` or generate inline
4. Save to `apps/blog/public/images/blog/`

---

## Requirements

- ekkOS blog infrastructure in `apps/blog/`
- Perplexity MCP server configured (for research commands)
- FLUX 2 Max via Vercel AI Gateway (for image generation)
- File system access via Claude Code tools

---

## Content Location

- Posts: `apps/blog/content/*.md`
- Images: `apps/blog/public/images/blog/`
- Preview: Visit `/preview` route in running blog

---

## Quality Standards

This is an editorial enforcement system. The goal is thought leadership that builds credibility, not marketing copy that generates skepticism.

**The test:** Would a senior engineer at a competitor read this and think "that's a fair and useful analysis" rather than "that's just marketing"?

If yes, publish. If no, revise.
