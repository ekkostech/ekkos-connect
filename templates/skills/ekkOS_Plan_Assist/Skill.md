---
name: ekkOS_Plan_Assist
description: Create structured plans for complex tasks. Activate when the user asks to implement a feature, build something with multiple steps, needs a project roadmap, or when a task has 3 or more distinct steps. This skill creates trackable plans with steps that can be marked complete.
allowed-tools:
  - mcp__ekkos-memory__ekkOS_Plan
  - mcp__ekkos-memory__ekkOS_Plans
  - mcp__ekkos-memory__ekkOS_PlanStatus
  - mcp__ekkos-memory__ekkOS_PlanStep
  - mcp__ekkos-memory__ekkOS_Generate
  - mcp__ekkos-memory__ekkOS_Templates
  - mcp__ekkos-memory__ekkOS_FromTemplate
  - mcp__ekkos-memory__ekkOS_SaveTemplate
  - mcp__ekkos-memory__ekkOS_Playbook
  - mcp__ekkos-memory__ekkOS_Search
---

# ekkOS_Plan_Assist

You are augmented with **ekkOS_ memory** - and you can create, track, and manage structured implementation plans.

## Why This Skill Exists

Complex tasks need structure:
- Multi-step implementations get lost without tracking
- Progress should persist across sessions
- Similar tasks can reuse templates

This skill creates persistent, trackable plans.

## When To Activate

This skill should trigger when:

| Trigger | Example |
|---------|---------|
| "Implement X" | "Implement user authentication" |
| "Build X" | "Build a payment integration" |
| "Help me with X" (complex) | "Help me refactor this service" |
| "Create a plan for X" | Explicit request |
| 3+ step task | Any task with multiple phases |
| "What's the roadmap?" | Needs structured approach |

## Instructions

### Step 1: Check for Existing Plans

```
ekkOS_Plans({
  status: "in_progress"
})
```

If relevant plan exists, offer to continue it.

### Step 2: Check for Templates

```
ekkOS_Templates({
  category: "auth"  // or relevant category
})
```

If template exists, use it as starting point.

### Step 3: Create the Plan

```
ekkOS_Plan({
  title: "Implement JWT Authentication",
  steps: [
    { label: "Set up auth dependencies", description: "Install jwt, bcrypt packages" },
    { label: "Create user model", description: "Database schema for users" },
    { label: "Implement registration", description: "POST /auth/register endpoint" },
    { label: "Implement login", description: "POST /auth/login with JWT generation" },
    { label: "Add middleware", description: "JWT verification middleware" },
    { label: "Protect routes", description: "Apply middleware to protected endpoints" },
    { label: "Add refresh tokens", description: "Token refresh logic" },
    { label: "Write tests", description: "Auth flow integration tests" }
  ],
  context: "Building auth for the API project"
})
```

### Step 4: Display the Plan

```
📋 Plan: Implement JWT Authentication

□ Step 1: Set up auth dependencies
  Install jwt, bcrypt packages

□ Step 2: Create user model
  Database schema for users

□ Step 3: Implement registration
  POST /auth/register endpoint

... (remaining steps)

Ready to start with Step 1?
```

### Step 5: Track Progress

As you complete steps:

```
ekkOS_PlanStep({
  plan_id: "plan-uuid",
  step_index: 0,
  completed: true
})
```

Updated display:
```
📋 Plan: Implement JWT Authentication [2/8 complete]

✓ Step 1: Set up auth dependencies
✓ Step 2: Create user model
→ Step 3: Implement registration (current)
□ Step 4: Implement login
...
```

## Example Scenarios

### Scenario 1: New Feature
```
User: "Help me implement a payment system"

You: *Check templates*
     ekkOS_Templates({ category: "payments" })
     → Template found: "Stripe Integration"

     "I found a template for Stripe integration. Should I:
      1. Use this template as starting point
      2. Create a custom plan
      3. See the template details first"

User: "Use the template"

You: ekkOS_FromTemplate({
       template_id: "stripe-template-id",
       context: "E-commerce payment integration"
     })

     "📋 Plan created from template:

      □ Configure Stripe SDK
      □ Create payment intent endpoint
      □ Build checkout UI component
      □ Handle webhooks
      □ Implement refund logic
      □ Add payment history
      □ Write tests

      Starting with Stripe SDK configuration..."
```

### Scenario 2: Continue Existing Plan
```
User: "What were we working on?"

You: ekkOS_Plans({ status: "in_progress" })

     "📋 You have an active plan:

      **API Refactoring** [4/7 complete]
      ✓ Extract user service
      ✓ Extract auth service
      ✓ Extract profile service
      ✓ Update imports
      → Create service interfaces (current)
      □ Add dependency injection
      □ Write integration tests

      Continue with service interfaces?"
```

### Scenario 3: Plan from Scratch
```
User: "Build a notification system"

You: ekkOS_Generate({
       context: "Build real-time notification system with push, email, and in-app"
     })

     "I'll create a plan:

      📋 Plan: Notification System

      □ Step 1: Design notification schema
        Database model for notifications

      □ Step 2: Create notification service
        Core logic for sending notifications

      □ Step 3: Implement in-app notifications
        WebSocket-based real-time delivery

      □ Step 4: Add email notifications
        Email template and delivery

      □ Step 5: Add push notifications
        FCM/APNs integration

      □ Step 6: Build notification preferences
        User settings for channels

      □ Step 7: Create notification center UI
        List and manage notifications

      □ Step 8: Write tests
        Unit and integration tests

      Should I start with Step 1?"
```

### Scenario 4: Save as Template
```
*After completing a plan successfully*

You: "This plan worked well. Save it as a template for future use?

      ekkOS_SaveTemplate({
        plan_id: "completed-plan-id",
        category: "notifications"
      })

      ✅ Template saved: 'Notification System'
      Category: notifications

      Next time you build notifications, I can use this as a starting point."
```

## Plan Status Flow

```
draft → in_progress → completed
                   ↘ archived (if abandoned)
```

Update status:
```
ekkOS_PlanStatus({
  plan_id: "...",
  status: "completed"  // or "archived"
})
```

## Playbooks (Ordered Pattern Sequences)

For workflows that use specific patterns in order:

```
ekkOS_Playbook({
  action: "create",
  name: "API Endpoint Creation",
  pattern_ids: [
    "route-pattern-id",
    "validation-pattern-id",
    "error-handling-pattern-id",
    "test-pattern-id"
  ],
  description: "Standard flow for adding new API endpoints"
})
```

Then use:
```
ekkOS_Playbook({
  action: "get",
  name: "API Endpoint Creation"
})
```

## Integration with Patterns

Search for patterns relevant to plan steps:

```
ekkOS_Search({
  query: "JWT authentication implementation",
  sources: ["patterns", "procedural"]
})
```

Link patterns to plan steps for richer context.

## Success Metrics

You're using this skill correctly when:
- Complex tasks are broken into steps
- Progress persists across sessions
- Templates speed up common tasks
- Users can see their progress visually
- Plans actually get completed (not abandoned)

---

**Mantra**: More than 3 steps? Make a plan. Track it. Complete it.
