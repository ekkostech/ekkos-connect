# QA Agent

**ADMIN ONLY** - AI QA Engineer specialized in testing, quality assurance, test automation, coverage analysis, and ensuring production-ready code quality.

## Overview

The QA Agent is your testing expert. It:
- Writes comprehensive test suites (unit, integration, E2E)
- Ensures high test coverage (90%+ target)
- Tests edge cases and error conditions
- Performs regression testing
- Reviews code quality and identifies bugs
- Automates testing workflows

## Commands

### `/qa write`

Write tests for a feature, component, or API.

```bash
/qa write "Test target description"

# Examples
/qa write "Teams API endpoints"
/qa write "Teams dashboard component"
/qa write "Pattern search functionality"
```

**What happens:**

```
🧪 QA Agent: Writing Tests for "Teams API"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Test Planning
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Analyzing target...
✓ Found 5 API endpoints in apps/web/app/api/teams/
✓ Checked input validation schemas
✓ Reviewed RLS policies
✓ Identified edge cases

Test Types:
  • Unit tests (validation, utilities)
  • Integration tests (API endpoints)
  • E2E tests (user workflows)

Test Cases: 28 total
  • Happy path: 8
  • Error handling: 12
  • Edge cases: 6
  • Security: 2

Coverage Goal: 95%

Stack:
  • Vitest for unit/integration tests
  • Playwright for E2E tests
  • Testing Library for React components
  • Supertest for API testing

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 Writing Tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Creating apps/web/app/api/teams/__tests__/route.test.ts...

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '../route';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

// Mock Supabase
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({})),
}));

describe('POST /api/teams', () => {
  let mockSupabase: any;

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: vi.fn(),
      },
      from: vi.fn(() => mockSupabase),
      insert: vi.fn(() => mockSupabase),
      select: vi.fn(() => mockSupabase),
      single: vi.fn(),
    };

    vi.mocked(createRouteHandlerClient).mockReturnValue(mockSupabase);
  });

  describe('Happy Path', () => {
    it('should create a team with valid data', async () => {
      // Arrange
      const mockUser = { id: 'user-123' };
      const mockTeam = {
        id: 'team-123',
        name: 'Engineering Team',
        slug: 'engineering-team',
        owner_id: 'user-123',
        created_at: new Date().toISOString(),
      };

      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.single.mockResolvedValue({
        data: mockTeam,
        error: null,
      });

      const request = new NextRequest('http://localhost/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Engineering Team',
          description: 'Our amazing eng team',
        }),
      });

      // Act
      const response = await POST(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(data).toEqual(mockTeam);
      expect(mockSupabase.from).toHaveBeenCalledWith('teams');
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Engineering Team',
          slug: 'engineering-team',
          owner_id: 'user-123',
        })
      );
    });

    it('should create team without optional fields', async () => {
      const mockUser = { id: 'user-123' };
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockSupabase.single.mockResolvedValue({
        data: { id: 'team-123', name: 'Team', slug: 'team', owner_id: 'user-123' },
        error: null,
      });

      const request = new NextRequest('http://localhost/api/teams', {
        method: 'POST',
        body: JSON.stringify({ name: 'Team' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
    });
  });

  describe('Authentication', () => {
    it('should return 401 if user not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Not authenticated' },
      });

      const request = new NextRequest('http://localhost/api/teams', {
        method: 'POST',
        body: JSON.stringify({ name: 'Team' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('should return 401 if auth token expired', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Token expired' },
      });

      const request = new NextRequest('http://localhost/api/teams', {
        method: 'POST',
        body: JSON.stringify({ name: 'Team' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });
  });

  describe('Validation', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });
    });

    it('should reject team name shorter than 3 characters', async () => {
      const request = new NextRequest('http://localhost/api/teams', {
        method: 'POST',
        body: JSON.stringify({ name: 'AB' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toBeDefined();
    });

    it('should reject team name longer than 50 characters', async () => {
      const longName = 'A'.repeat(51);
      const request = new NextRequest('http://localhost/api/teams', {
        method: 'POST',
        body: JSON.stringify({ name: longName }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should reject team name with invalid characters', async () => {
      const request = new NextRequest('http://localhost/api/teams', {
        method: 'POST',
        body: JSON.stringify({ name: 'Team@#$%' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should reject invalid avatar URL', async () => {
      const request = new NextRequest('http://localhost/api/teams', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Engineering Team',
          avatar_url: 'not-a-url',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });

    it('should reject empty request body', async () => {
      const request = new NextRequest('http://localhost/api/teams', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);

      expect(response.status).toBe(400);
    });
  });

  describe('Edge Cases', () => {
    beforeEach(() => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });
    });

    it('should handle duplicate team name (409)', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: '23505', message: 'Duplicate key' },
      });

      const request = new NextRequest('http://localhost/api/teams', {
        method: 'POST',
        body: JSON.stringify({ name: 'Engineering Team' }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('already exists');
    });

    it('should generate slug from name with special characters', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'team-123',
          name: 'Team - Engineering & Design',
          slug: 'team-engineering-design',
          owner_id: 'user-123',
        },
        error: null,
      });

      const request = new NextRequest('http://localhost/api/teams', {
        method: 'POST',
        body: JSON.stringify({ name: 'Team - Engineering & Design' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: 'team-engineering-design',
        })
      );
    });

    it('should handle database connection failure', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'Connection timeout', code: 'CONNECTION_ERROR' },
      });

      const request = new NextRequest('http://localhost/api/teams', {
        method: 'POST',
        body: JSON.stringify({ name: 'Team' }),
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });

  describe('Security', () => {
    it('should prevent SQL injection in team name', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      const request = new NextRequest('http://localhost/api/teams', {
        method: 'POST',
        body: JSON.stringify({
          name: "Team'; DROP TABLE teams; --",
        }),
      });

      const response = await POST(request);

      // Should either validate or safely handle
      expect([400, 201]).toContain(response.status);
      // If 201, verify Supabase client escaped the input
    });

    it('should prevent XSS in team description', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-123' } },
        error: null,
      });

      mockSupabase.single.mockResolvedValue({
        data: { id: 'team-123', name: 'Team', description: '<script>alert("xss")</script>' },
        error: null,
      });

      const request = new NextRequest('http://localhost/api/teams', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Team',
          description: '<script>alert("xss")</script>',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      // Note: Frontend should sanitize when displaying
    });
  });
});

describe('GET /api/teams', () => {
  // ... similar comprehensive tests for GET endpoint
  // (abbreviated for space)
});
```

Creating apps/web/app/api/teams/__tests__/integration.test.ts...

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Integration tests with real Supabase (test database)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

describe('Teams API Integration', () => {
  let testUserId: string;
  let testTeamId: string;
  let authToken: string;

  beforeAll(async () => {
    // Create test user
    const { data: { user } } = await supabase.auth.admin.createUser({
      email: 'test@example.com',
      password: 'test-password-123',
      email_confirm: true,
    });
    testUserId = user!.id;

    // Sign in to get auth token
    const { data: { session } } = await supabase.auth.signInWithPassword({
      email: 'test@example.com',
      password: 'test-password-123',
    });
    authToken = session!.access_token;
  });

  afterAll(async () => {
    // Cleanup: delete test data
    if (testTeamId) {
      await supabase.from('teams').delete().eq('id', testTeamId);
    }
    await supabase.auth.admin.deleteUser(testUserId);
  });

  it('should create, read, update, and delete a team (CRUD)', async () => {
    // CREATE
    const createResponse = await fetch('http://localhost:3000/api/teams', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: 'Integration Test Team',
        description: 'Created by integration test',
      }),
    });

    expect(createResponse.status).toBe(201);
    const createdTeam = await createResponse.json();
    testTeamId = createdTeam.id;

    expect(createdTeam.name).toBe('Integration Test Team');
    expect(createdTeam.owner_id).toBe(testUserId);

    // READ (list)
    const listResponse = await fetch('http://localhost:3000/api/teams', {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });

    expect(listResponse.status).toBe(200);
    const teams = await listResponse.json();
    expect(teams).toContainEqual(expect.objectContaining({ id: testTeamId }));

    // READ (single)
    const getResponse = await fetch(`http://localhost:3000/api/teams/${testTeamId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
    });

    expect(getResponse.status).toBe(200);
    const team = await getResponse.json();
    expect(team.id).toBe(testTeamId);

    // UPDATE
    const updateResponse = await fetch(`http://localhost:3000/api/teams/${testTeamId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        name: 'Updated Team Name',
      }),
    });

    expect(updateResponse.status).toBe(200);
    const updatedTeam = await updateResponse.json();
    expect(updatedTeam.name).toBe('Updated Team Name');

    // DELETE
    const deleteResponse = await fetch(`http://localhost:3000/api/teams/${testTeamId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authToken}` },
    });

    expect(deleteResponse.status).toBe(200);

    // Verify soft delete
    const { data: deletedTeam } = await supabase
      .from('teams')
      .select('deleted_at')
      .eq('id', testTeamId)
      .single();

    expect(deletedTeam.deleted_at).not.toBeNull();
  });

  it('should enforce RLS policies (no access to other users teams)', async () => {
    // Create second user
    const { data: { user: user2 } } = await supabase.auth.admin.createUser({
      email: 'test2@example.com',
      password: 'test-password-456',
      email_confirm: true,
    });

    const { data: { session: session2 } } = await supabase.auth.signInWithPassword({
      email: 'test2@example.com',
      password: 'test-password-456',
    });

    // Try to access user1's team with user2's token
    const response = await fetch(`http://localhost:3000/api/teams/${testTeamId}`, {
      headers: { 'Authorization': `Bearer ${session2!.access_token}` },
    });

    expect(response.status).toBe(404); // RLS blocks access

    // Cleanup user2
    await supabase.auth.admin.deleteUser(user2!.id);
  });
});
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Tests Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Test Files Created: 2
  ✓ route.test.ts (unit tests)
  ✓ integration.test.ts (integration tests)

Test Cases Written: 28
  ✓ Happy path: 8 tests
  ✓ Authentication: 2 tests
  ✓ Validation: 5 tests
  ✓ Edge cases: 3 tests
  ✓ Security: 2 tests
  ✓ Integration: 8 tests

Coverage: 96% (exceeds 90% goal) ✅

Running tests...

```bash
$ npm run test apps/web/app/api/teams

 ✓ apps/web/app/api/teams/__tests__/route.test.ts (28 tests)
   ✓ POST /api/teams (18 tests) 1245ms
     ✓ Happy Path (2 tests) 145ms
     ✓ Authentication (2 tests) 89ms
     ✓ Validation (5 tests) 234ms
     ✓ Edge Cases (3 tests) 178ms
     ✓ Security (2 tests) 123ms
   ✓ GET /api/teams (10 tests) 567ms

 ✓ apps/web/app/api/teams/__tests__/integration.test.ts (2 tests) 3456ms
   ✓ Teams API Integration (2 tests) 3456ms

Test Files: 2 passed (2)
     Tests: 30 passed (30)
  Duration: 4.8s

Coverage:
  apps/web/app/api/teams/route.ts:    96.42% (54/56 lines)
  apps/web/app/api/teams/[id]/route.ts: 95.83% (46/48 lines)
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Next Steps:
  • Run full test suite: npm run test
  • Add E2E tests: /qa e2e "Teams workflow"
  • Review code quality: /lead review all
```

### `/qa test`

Run existing tests and analyze results.

```bash
/qa test

# Run specific tests
/qa test "teams"

# Run with coverage
/qa test --coverage

# Run integration tests only
/qa test --integration
```

**What happens:**

```
🧪 QA Agent: Running Tests
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Running test suite...

 ✓ apps/web/app/api/teams (30 tests) 4821ms
 ✓ apps/web/app/api/patterns (45 tests) 5234ms
 ✓ apps/web/components/teams (18 tests) 2345ms
 ✓ apps/memory/lib/brain (67 tests) 8934ms

Test Files: 12 passed (12)
     Tests: 412 passed (412)
  Duration: 32.4s

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Coverage Report
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Overall Coverage: 94.2% ✅ (meets 90% threshold)

By Directory:
  apps/web/app/api/         96.8% ✅
  apps/web/components/      92.3% ✅
  apps/memory/lib/brain/    95.1% ✅
  packages/shared/          89.4% 🟡 (below threshold)

Uncovered Lines: 24
  Most critical:
    • apps/web/lib/auth/refresh.ts:45-48 (error recovery)
    • packages/shared/utils/retry.ts:67-70 (timeout handling)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ All Tests Passed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Status: Ready for deployment ✅

Recommendations:
  • Increase coverage in packages/shared (currently 89.4%)
  • Add tests for error recovery in auth/refresh.ts
  • Consider adding performance tests for memory/lib/brain
```

### `/qa regression`

Run regression tests to ensure no existing functionality broke.

```bash
/qa regression

# Test specific area
/qa regression "authentication"
```

### `/qa e2e`

Write and run end-to-end tests for user workflows.

```bash
/qa e2e "User workflow description"

# Examples
/qa e2e "Create team and invite member"
/qa e2e "Sign up, forge pattern, verify in dashboard"
```

**What happens:**

```
🧪 QA Agent: E2E Test for "Create Team Workflow"
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Creating e2e/teams/create-team.spec.ts...

```typescript
import { test, expect } from '@playwright/test';

test.describe('Create Team Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in
    await page.goto('http://localhost:3000/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'test-password');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
  });

  test('should create a team successfully', async ({ page }) => {
    // Navigate to teams
    await page.goto('http://localhost:3000/teams');

    // Click create team button
    await page.click('button:has-text("Create Team")');

    // Fill form
    await page.fill('[name="name"]', 'E2E Test Team');
    await page.fill('[name="description"]', 'Created by E2E test');

    // Submit
    await page.click('button[type="submit"]:has-text("Create Team")');

    // Verify success
    await expect(page.locator('text=Team created successfully')).toBeVisible();
    await expect(page.locator('text=E2E Test Team')).toBeVisible();

    // Verify in database
    const teamName = await page.locator('[data-testid="team-name"]').textContent();
    expect(teamName).toBe('E2E Test Team');
  });

  test('should show validation error for short name', async ({ page }) => {
    await page.goto('http://localhost:3000/teams');
    await page.click('button:has-text("Create Team")');

    await page.fill('[name="name"]', 'AB'); // Too short
    await page.click('button[type="submit"]');

    await expect(page.locator('text=Team name must be at least 3 characters')).toBeVisible();
  });

  test('should close modal on cancel', async ({ page }) => {
    await page.goto('http://localhost:3000/teams');
    await page.click('button:has-text("Create Team")');

    await expect(page.locator('role=dialog')).toBeVisible();

    await page.click('button:has-text("Cancel")');

    await expect(page.locator('role=dialog')).not.toBeVisible();
  });
});
```

Running E2E tests with Playwright...

```bash
$ npx playwright test e2e/teams/create-team.spec.ts

Running 3 tests using 1 worker

  ✓ Create Team Workflow > should create a team successfully (2.3s)
  ✓ Create Team Workflow > should show validation error for short name (1.1s)
  ✓ Create Team Workflow > should close modal on cancel (0.8s)

 3 passed (4.2s)
```

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ E2E Tests Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Test File: e2e/teams/create-team.spec.ts
Tests: 3 passed (3)
Duration: 4.2s

All user workflows verified ✅
```

## MCP Tools Used

The QA Agent uses:

- `ekkOS_Search` - Find similar test patterns
- `ekkOS_Codebase` - Search code to understand what to test
- `ekkOS_Forge` - Save testing patterns
- `Read` - Read code to test
- `Write` - Write test files
- `Bash` - Run test commands (npm test, playwright)
- `supabase_execute_sql` - Setup test data

## Best Practices

### Test the Unhappy Path

```typescript
// ✅ Good: Tests both happy and unhappy paths
it('should create team with valid data', async () => { /* ... */ });
it('should reject invalid data', async () => { /* ... */ });
it('should handle database errors', async () => { /* ... */ });

// ❌ Bad: Only tests happy path
it('should create team', async () => { /* ... */ });
```

### Use Descriptive Test Names

```typescript
// ✅ Good: Clear what is being tested
it('should return 401 if user not authenticated', async () => { /* ... */ });

// ❌ Bad: Unclear
it('should work', async () => { /* ... */ });
```

### Test Edge Cases

```typescript
// ✅ Good: Tests edge cases
it('should handle duplicate team name', async () => { /* ... */ });
it('should handle database connection timeout', async () => { /* ... */ });
it('should prevent SQL injection', async () => { /* ... */ });

// ❌ Bad: Only basic scenarios
```

## Integration with Other Agents

QA Agent works closely with:

- **Frontend Agent** - Tests UI components
- **Backend Agent** - Tests APIs and database
- **Tech Lead** - Reports test results for reviews

## Troubleshooting

### Tests Failing

**Problem:** Tests failing unexpectedly
**Check:** `/qa test` to see failures
**Fix:** Agent analyzes failures and suggests fixes

### Low Coverage

**Problem:** Coverage below 90% threshold
**Check:** Coverage report
**Fix:** Agent writes tests for uncovered lines

---

## Summary

The QA Agent is your testing expert that:

✅ **Writes** - Comprehensive test suites
✅ **Runs** - Tests with coverage analysis
✅ **Validates** - Edge cases and security
✅ **Reports** - Quality metrics and issues

**Ship with confidence.**

```bash
/qa write "Your feature here"
```

---

**Test early. Test often. Ship quality.** 🧪
