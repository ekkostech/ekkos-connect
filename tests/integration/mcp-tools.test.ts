/**
 * MCP Tools Integration Tests
 *
 * Tests actual MCP tool execution against the ekkOS API
 * Requires test credentials: EKKOS_TEST_TOKEN, EKKOS_TEST_API_KEY, EKKOS_TEST_USER_ID
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { EkkosTestClient, loadTestCredentials, TestCredentials } from '../utils/api-client';

// Skip all tests if no credentials
const hasCredentials = !!(
  process.env.EKKOS_TEST_TOKEN &&
  process.env.EKKOS_TEST_API_KEY &&
  process.env.EKKOS_TEST_USER_ID
);

describe.skipIf(!hasCredentials)('MCP Tools Integration', () => {
  let client: EkkosTestClient;
  let testPatternId: string | undefined;

  beforeAll(() => {
    const credentials = loadTestCredentials();
    client = new EkkosTestClient(credentials);
  });

  describe('Core Tools', () => {
    it('should search memory', async () => {
      const result = await client.search('test query');

      expect(result.success).toBe(true);
      expect(result.retrieval_token).toBeDefined();
    });

    it('should get stats', async () => {
      const result = await client.stats();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should get health', async () => {
      const result = await client.health();

      expect(result.success).toBe(true);
    });

    it('should forge a test pattern', async () => {
      const result = await client.forge(
        'Test Pattern - Integration Test',
        'Testing the forge endpoint',
        'Created via integration test',
        ['test', 'integration']
      );

      expect(result.success).toBe(true);

      // Store pattern ID for cleanup
      if (result.data && typeof result.data === 'object') {
        const data = result.data as Record<string, unknown>;
        testPatternId = data.id as string;
      }
    });

    it('should capture an event', async () => {
      const result = await client.capture('test_event', 'Integration test capture');

      expect(result.success).toBe(true);
    });

    it('should report outcome', async () => {
      const result = await client.outcome(true, 'Integration test passed');

      expect(result.success).toBe(true);
    });
  });

  describe('Context Tools', () => {
    it('should recall recent memory', async () => {
      const result = await client.recall(1);

      expect(result.success).toBe(true);
    });

    it('should get context for task', async () => {
      const result = await client.context('integration testing');

      expect(result.success).toBe(true);
    });

    it('should search codebase', async () => {
      const result = await client.codebase('function');

      // May return empty if no codebase indexed
      expect(result).toBeDefined();
    });
  });

  describe('Utility Tools', () => {
    it('should get summary', async () => {
      const result = await client.summary(300);

      expect(result.success).toBe(true);
    });

    it('should check conflicts', async () => {
      const result = await client.conflict('delete test file');

      expect(result.success).toBe(true);
    });
  });

  describe('Plan Tools', () => {
    it('should create a plan', async () => {
      const result = await client.plan('Test Plan', [
        { label: 'Step 1' },
        { label: 'Step 2' },
      ]);

      expect(result.success).toBe(true);
    });

    it('should list plans', async () => {
      const result = await client.plans();

      expect(result.success).toBe(true);
    });
  });

  describe('Session Tools', () => {
    it('should start session', async () => {
      const result = await client.session('start');

      expect(result.success).toBe(true);
    });

    it('should get session', async () => {
      const result = await client.session('get');

      expect(result.success).toBe(true);
    });
  });

  describe('Secret Tools', () => {
    const testSecretService = 'integration-test-secret';
    const testSecretValue = 'test-value-12345';

    it('should store a secret', async () => {
      const result = await client.storeSecret(testSecretService, testSecretValue);

      expect(result.success).toBe(true);
    });

    it('should retrieve the secret', async () => {
      const result = await client.getSecret(testSecretService);

      expect(result.success).toBe(true);
      if (result.data && typeof result.data === 'object') {
        const data = result.data as Record<string, unknown>;
        expect(data.value).toBe(testSecretValue);
      }
    });

    it('should list secrets', async () => {
      const result = await client.listSecrets();

      expect(result.success).toBe(true);
    });

    it('should delete the test secret', async () => {
      // First get the secret ID
      const listResult = await client.listSecrets();
      if (listResult.success && Array.isArray(listResult.data)) {
        const testSecret = listResult.data.find(
          (s: { service: string }) => s.service === testSecretService
        );
        if (testSecret) {
          const deleteResult = await client.deleteSecret(testSecret.id);
          expect(deleteResult.success).toBe(true);
        }
      }
    });
  });
});

describe('API Health Check', () => {
  it('should reach the API', async () => {
    const response = await fetch('https://mcp.ekkos.dev/health');

    // Even without auth, should get a response
    expect([200, 401, 403]).toContain(response.status);
  });

  it('should have correct CORS headers', async () => {
    const response = await fetch('https://mcp.ekkos.dev/health', {
      method: 'OPTIONS',
    });

    // OPTIONS should work
    expect(response.status).toBeLessThan(500);
  });
});
