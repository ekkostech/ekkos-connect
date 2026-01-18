/**
 * Cross-Platform Path Utilities for Testing
 * Handles Windows/macOS/Linux path differences
 */

import * as path from 'path';
import * as os from 'os';

export type Platform = 'win32' | 'darwin' | 'linux';

/**
 * Get expected MCP config paths for each IDE on each platform
 */
export function getMCPConfigPaths(platform: Platform = process.platform as Platform) {
  const home = os.homedir();

  const paths = {
    win32: {
      cursor: path.join(process.env.APPDATA || '', 'Cursor', 'User', 'globalStorage', 'cursor.mcp', 'mcp.json'),
      claudeDesktop: path.join(process.env.APPDATA || '', 'Claude', 'claude_desktop_config.json'),
      claudeCode: path.join(home, '.claude', 'settings.json'),
      windsurf: path.join(process.env.APPDATA || '', 'Windsurf', 'User', 'globalStorage', 'codeium.windsurf', 'mcp_config.json'),
    },
    darwin: {
      cursor: path.join(home, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'cursor.mcp', 'mcp.json'),
      claudeDesktop: path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
      claudeCode: path.join(home, '.claude', 'settings.json'),
      windsurf: path.join(home, 'Library', 'Application Support', 'Windsurf', 'User', 'globalStorage', 'codeium.windsurf', 'mcp_config.json'),
    },
    linux: {
      cursor: path.join(home, '.config', 'Cursor', 'User', 'globalStorage', 'cursor.mcp', 'mcp.json'),
      claudeDesktop: path.join(home, '.config', 'Claude', 'claude_desktop_config.json'),
      claudeCode: path.join(home, '.claude', 'settings.json'),
      windsurf: path.join(home, '.config', 'Windsurf', 'User', 'globalStorage', 'codeium.windsurf', 'mcp_config.json'),
    },
  };

  return paths[platform];
}

/**
 * Get ekkOS config directory path
 */
export function getEkkosConfigDir(platform: Platform = process.platform as Platform): string {
  const home = os.homedir();
  return path.join(home, '.ekkos');
}

/**
 * Get hooks directory path
 */
export function getHooksDir(platform: Platform = process.platform as Platform): string {
  const home = os.homedir();
  return path.join(home, '.claude', 'hooks');
}

/**
 * Get skills directory path
 */
export function getSkillsDir(platform: Platform = process.platform as Platform): string {
  const home = os.homedir();
  return path.join(home, '.claude', 'skills');
}

/**
 * Mock platform for testing
 */
export function mockPlatform(platform: Platform): () => void {
  const originalPlatform = process.platform;

  Object.defineProperty(process, 'platform', {
    value: platform,
    writable: true,
  });

  // Return cleanup function
  return () => {
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      writable: true,
    });
  };
}

/**
 * Expected MCP server configuration
 */
export const EXPECTED_MCP_CONFIG = {
  ekkos: {
    command: 'npx',
    args: ['-y', '@ekkostech/ekkos-mcp-server'],
    env: {
      EKKOS_API_KEY: '${EKKOS_API_KEY}',
    },
  },
};

/**
 * Validate MCP config structure
 */
export function validateMCPConfig(config: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['Config is not an object'] };
  }

  const cfg = config as Record<string, unknown>;

  // Check for mcpServers or servers key
  const servers = cfg.mcpServers || cfg.servers;
  if (!servers || typeof servers !== 'object') {
    errors.push('Missing mcpServers or servers key');
    return { valid: false, errors };
  }

  const serversObj = servers as Record<string, unknown>;

  // Check for ekkos entry
  if (!serversObj.ekkos && !serversObj['ekkos-memory']) {
    errors.push('Missing ekkos or ekkos-memory server entry');
  }

  const ekkosConfig = serversObj.ekkos || serversObj['ekkos-memory'];
  if (ekkosConfig && typeof ekkosConfig === 'object') {
    const ec = ekkosConfig as Record<string, unknown>;

    // Validate required fields
    if (!ec.command && !ec.url) {
      errors.push('ekkos config missing both command and url');
    }
  }

  return { valid: errors.length === 0, errors };
}
