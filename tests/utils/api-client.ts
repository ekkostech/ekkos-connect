/**
 * ekkOS API Client for Integration Tests
 * Wraps all MCP tool calls for testing
 */

const API_BASE = process.env.EKKOS_API_URL || 'https://mcp.ekkos.dev';

export interface MCPResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  retrieval_token?: string;
}

export interface TestCredentials {
  token: string;
  apiKey: string;
  userId: string;
}

export class EkkosTestClient {
  private token: string;
  private apiKey: string;
  private userId: string;

  constructor(credentials: TestCredentials) {
    this.token = credentials.token;
    this.apiKey = credentials.apiKey;
    this.userId = credentials.userId;
  }

  private async callMCP<T>(tool: string, params: Record<string, unknown>): Promise<MCPResponse<T>> {
    const response = await fetch(`${API_BASE}/api/v1/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        'X-API-Key': this.apiKey,
        'X-User-ID': this.userId,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: tool,
          arguments: params,
        },
        id: Date.now(),
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${await response.text()}`,
      };
    }

    const result = await response.json();

    if (result.error) {
      return {
        success: false,
        error: result.error.message || JSON.stringify(result.error),
      };
    }

    return {
      success: true,
      data: result.result,
      retrieval_token: result.retrieval_token,
    };
  }

  // ===== Core Tools =====

  async search(query: string, sources?: string[]): Promise<MCPResponse> {
    return this.callMCP('ekkOS_Search', { query, sources });
  }

  async forge(title: string, problem: string, solution: string, tags?: string[]): Promise<MCPResponse> {
    return this.callMCP('ekkOS_Forge', { title, problem, solution, tags });
  }

  async capture(type: string, content: string): Promise<MCPResponse> {
    return this.callMCP('ekkOS_Capture', { type, content });
  }

  async outcome(success: boolean, notes?: string): Promise<MCPResponse> {
    return this.callMCP('ekkOS_Outcome', { success, notes });
  }

  // ===== Context Tools =====

  async recall(daysAgo: number): Promise<MCPResponse> {
    return this.callMCP('ekkOS_Recall', { days_ago: daysAgo });
  }

  async context(task: string): Promise<MCPResponse> {
    return this.callMCP('ekkOS_Context', { task });
  }

  async codebase(query: string): Promise<MCPResponse> {
    return this.callMCP('ekkOS_Codebase', { query });
  }

  // ===== Directive Tools =====

  async directive(type: 'MUST' | 'NEVER' | 'PREFER' | 'AVOID', rule: string, scope?: string): Promise<MCPResponse> {
    return this.callMCP('ekkOS_Directive', { type, rule, scope });
  }

  // ===== Utility Tools =====

  async summary(timeWindowSeconds?: number): Promise<MCPResponse> {
    return this.callMCP('ekkOS_Summary', { time_window_seconds: timeWindowSeconds || 300 });
  }

  async conflict(proposedAction: string): Promise<MCPResponse> {
    return this.callMCP('ekkOS_Conflict', { proposed_action: proposedAction });
  }

  async stats(): Promise<MCPResponse> {
    return this.callMCP('ekkOS_Stats', {});
  }

  async health(): Promise<MCPResponse> {
    return this.callMCP('ekkOS_Health', {});
  }

  // ===== Plan Tools =====

  async plan(title: string, steps: { label: string }[]): Promise<MCPResponse> {
    return this.callMCP('ekkOS_Plan', { title, steps });
  }

  async plans(status?: string): Promise<MCPResponse> {
    return this.callMCP('ekkOS_Plans', { status });
  }

  // ===== Secret Tools =====

  async storeSecret(service: string, value: string): Promise<MCPResponse> {
    return this.callMCP('ekkOS_StoreSecret', { service, value });
  }

  async getSecret(service: string): Promise<MCPResponse> {
    return this.callMCP('ekkOS_GetSecret', { service });
  }

  async listSecrets(): Promise<MCPResponse> {
    return this.callMCP('ekkOS_ListSecrets', {});
  }

  async deleteSecret(secretId: string): Promise<MCPResponse> {
    return this.callMCP('ekkOS_DeleteSecret', { secretId });
  }

  // ===== Session Tools =====

  async session(action: 'start' | 'resume' | 'get' | 'end'): Promise<MCPResponse> {
    return this.callMCP('ekkOS_Session', { action });
  }
}

/**
 * Load test credentials from environment or fixture
 */
export function loadTestCredentials(): TestCredentials {
  const token = process.env.EKKOS_TEST_TOKEN;
  const apiKey = process.env.EKKOS_TEST_API_KEY;
  const userId = process.env.EKKOS_TEST_USER_ID;

  if (!token || !apiKey || !userId) {
    throw new Error(
      'Missing test credentials. Set EKKOS_TEST_TOKEN, EKKOS_TEST_API_KEY, and EKKOS_TEST_USER_ID'
    );
  }

  return { token, apiKey, userId };
}
