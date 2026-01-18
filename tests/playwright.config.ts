import { defineConfig, devices } from '@playwright/test';

/**
 * ekkOS Connect Extension - E2E Test Configuration
 * Tests OAuth flow, MCP deployment, and full user journeys
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // Run sequentially for auth state
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Single worker for auth state consistency
  reporter: [
    ['html', { outputFolder: '../test-results/html' }],
    ['json', { outputFile: '../test-results/results.json' }],
    process.env.CI ? ['github'] : ['list'],
  ],

  use: {
    baseURL: process.env.EKKOS_PLATFORM_URL || 'https://platform.ekkos.dev',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    // Auth setup - runs first
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },
    // Main tests - depend on auth
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'tests/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        storageState: 'tests/.auth/user.json',
      },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        storageState: 'tests/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],

  // Web server for local testing
  webServer: process.env.CI ? undefined : {
    command: 'echo "Using production URLs"',
    url: 'https://platform.ekkos.dev',
    reuseExistingServer: true,
  },
});
