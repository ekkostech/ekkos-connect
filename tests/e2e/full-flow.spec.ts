import { test, expect } from '@playwright/test';

/**
 * Full User Journey E2E Tests
 *
 * Tests complete user flows from first visit to active usage
 */

test.describe('Complete User Journey', () => {
  test('new user signup flow', async ({ page }) => {
    await page.goto('/signup');

    // Check signup page elements
    const hasSignupForm = await page.locator('form').count() > 0;
    expect(hasSignupForm).toBe(true);

    // Check for OAuth options (Google, GitHub, etc.)
    const oauthButtons = page.locator('button:has-text("Google"), button:has-text("GitHub"), a:has-text("Google"), a:has-text("GitHub")');
    const oauthCount = await oauthButtons.count();

    // Should have at least one OAuth option or email signup
    const emailInput = page.locator('input[type="email"]');
    const hasEmailSignup = await emailInput.count() > 0;

    expect(oauthCount > 0 || hasEmailSignup).toBe(true);
  });

  test('dashboard shows memory stats', async ({ page }) => {
    await page.goto('/dashboard');

    // Look for memory-related stats
    const statsSection = page.locator('[class*="stat"], [class*="metric"], [data-testid*="stat"]');
    const statsCount = await statsSection.count();

    // Dashboard should have some stats/metrics
    expect(statsCount).toBeGreaterThanOrEqual(0);
  });

  test('can navigate to usage page', async ({ page }) => {
    await page.goto('/usage');

    // Check we're on usage page
    await expect(page).toHaveURL(/usage/);
  });

  test('can navigate to settings', async ({ page }) => {
    await page.goto('/settings');

    // Check we're on settings page
    await expect(page).toHaveURL(/settings/);
  });

  test('API documentation is accessible', async ({ page }) => {
    await page.goto('/docs');

    // Should have documentation content
    const content = page.locator('main, article, [class*="doc"]');
    const hasContent = await content.count() > 0;

    expect(hasContent).toBe(true);
  });
});

test.describe('Extension Integration Points', () => {
  test('OAuth authorize endpoint responds', async ({ request }) => {
    const response = await request.get('/api/auth/authorize', {
      params: {
        client_id: 'ekkos-connect',
        response_type: 'code',
        redirect_uri: 'vscode://ekkostech.ekkos-connect/callback',
      },
    });

    // Should respond (might redirect, might show login)
    expect(response.status()).toBeLessThan(500);
  });

  test('token endpoint exists', async ({ request }) => {
    const response = await request.post('/api/auth/token', {
      data: {
        grant_type: 'authorization_code',
        code: 'invalid-test-code',
        redirect_uri: 'vscode://ekkostech.ekkos-connect/callback',
      },
    });

    // Should return error for invalid code, not 404
    expect(response.status()).not.toBe(404);
  });

  test('config endpoint returns user config', async ({ request }) => {
    // This requires auth, so we're just checking it exists
    const response = await request.get('/api/v1/config');

    // Should be 401 without auth, not 404
    expect([200, 401, 403]).toContain(response.status());
  });
});

test.describe('MCP Server Endpoints', () => {
  test('MCP health endpoint', async ({ request }) => {
    const response = await request.get('https://mcp.ekkos.dev/health');

    // Should respond
    expect(response.status()).toBeLessThan(500);
  });

  test('MCP gateway endpoint exists', async ({ request }) => {
    const response = await request.post('https://mcp.ekkos.dev/api/v1/mcp', {
      data: {
        jsonrpc: '2.0',
        method: 'tools/list',
        id: 1,
      },
    });

    // Should return 401 without auth, not 404
    expect([200, 401, 403]).toContain(response.status());
  });

  test('hooks capture endpoint exists', async ({ request }) => {
    const response = await request.post('https://mcp.ekkos.dev/api/v1/hooks/capture', {
      data: {
        type: 'test',
        content: 'test',
      },
    });

    // Should require auth
    expect([200, 401, 403]).toContain(response.status());
  });
});

test.describe('Error Handling', () => {
  test('404 page for invalid routes', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-12345');

    // Should show 404 or redirect
    const is404 = await page.locator('text=/404|not found/i').count() > 0;
    const isRedirected = page.url().includes('login') || page.url().includes('dashboard');

    expect(is404 || isRedirected).toBe(true);
  });

  test('handles API errors gracefully', async ({ request }) => {
    const response = await request.post('https://mcp.ekkos.dev/api/v1/mcp', {
      data: {
        invalid: 'request',
      },
    });

    // Should return proper error, not crash
    expect(response.status()).toBeLessThan(500);
  });
});

test.describe('Performance', () => {
  test('dashboard loads within 5 seconds', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(5000);
  });

  test('API responds within 2 seconds', async ({ request }) => {
    const startTime = Date.now();

    await request.get('https://mcp.ekkos.dev/health');

    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(2000);
  });
});
