import { test as setup, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

const authFile = path.join(__dirname, '../.auth/user.json');

/**
 * Authentication Setup
 *
 * This runs before all other tests to establish auth state.
 * Uses test credentials to authenticate with ekkOS platform.
 */
setup('authenticate with ekkOS', async ({ page }) => {
  // Ensure auth directory exists
  const authDir = path.dirname(authFile);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }

  // Check for test credentials
  const testEmail = process.env.EKKOS_TEST_EMAIL;
  const testPassword = process.env.EKKOS_TEST_PASSWORD;

  if (!testEmail || !testPassword) {
    console.log('No test credentials provided - using mock auth state');

    // Create mock auth state for CI
    const mockState = {
      cookies: [],
      origins: [
        {
          origin: 'https://platform.ekkos.dev',
          localStorage: [
            {
              name: 'ekkos-test-mode',
              value: 'true',
            },
          ],
        },
      ],
    };

    fs.writeFileSync(authFile, JSON.stringify(mockState, null, 2));
    return;
  }

  // Navigate to login page
  await page.goto('https://platform.ekkos.dev/login');

  // Wait for login form
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });

  // Fill credentials
  await page.fill('input[type="email"], input[name="email"]', testEmail);
  await page.fill('input[type="password"], input[name="password"]', testPassword);

  // Submit login
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard**', { timeout: 30000 });

  // Verify logged in
  await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 10000 });

  // Save auth state
  await page.context().storageState({ path: authFile });

  console.log('Authentication successful - state saved');
});

setup('verify API connectivity', async ({ request }) => {
  // Test that the API is reachable
  const healthResponse = await request.get('https://mcp.ekkos.dev/health');

  // Health might return 401 if auth required, that's OK
  expect([200, 401, 403]).toContain(healthResponse.status());

  console.log(`API health check: ${healthResponse.status()}`);
});
