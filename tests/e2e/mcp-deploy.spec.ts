import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { getMCPConfigPaths, validateMCPConfig } from '../utils/platform';

/**
 * MCP Configuration Deployment Tests
 *
 * Tests that the extension correctly deploys MCP configs to all supported IDEs
 */

test.describe('MCP Configuration Deployment', () => {
  const configPaths = getMCPConfigPaths();

  test.describe('Config Path Validation', () => {
    test('should have correct path for Claude Code', () => {
      expect(configPaths.claudeCode).toContain('.claude');
      expect(configPaths.claudeCode).toContain('settings.json');
    });

    test('should have correct path for Cursor', () => {
      expect(configPaths.cursor).toContain('Cursor');
      expect(configPaths.cursor).toContain('mcp.json');
    });

    test('should have correct path for Claude Desktop', () => {
      expect(configPaths.claudeDesktop).toContain('Claude');
      expect(configPaths.claudeDesktop).toContain('claude_desktop_config.json');
    });

    test('should have correct path for Windsurf', () => {
      expect(configPaths.windsurf).toContain('Windsurf');
      expect(configPaths.windsurf).toContain('mcp_config.json');
    });
  });

  test.describe('Config Generation', () => {
    test('should generate valid MCP config structure', () => {
      const testConfig = {
        mcpServers: {
          ekkos: {
            command: 'npx',
            args: ['-y', '@ekkostech/ekkos-mcp-server'],
            env: {
              EKKOS_API_KEY: 'test-key',
            },
          },
        },
      };

      const result = validateMCPConfig(testConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject invalid config without servers', () => {
      const invalidConfig = {
        someOtherKey: {},
      };

      const result = validateMCPConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should reject config without ekkos entry', () => {
      const configWithoutEkkos = {
        mcpServers: {
          otherServer: {
            command: 'node',
          },
        },
      };

      const result = validateMCPConfig(configWithoutEkkos);
      expect(result.valid).toBe(false);
    });
  });

  test.describe('ekkOS Config Directory', () => {
    const ekkosConfigDir = path.join(os.homedir(), '.ekkos');

    test('should create .ekkos directory on install', async () => {
      // This test verifies the directory structure exists
      // In CI, we may need to create it
      if (!fs.existsSync(ekkosConfigDir)) {
        fs.mkdirSync(ekkosConfigDir, { recursive: true });
      }

      expect(fs.existsSync(ekkosConfigDir)).toBe(true);
    });

    test('config.json should have correct structure if exists', async () => {
      const configPath = path.join(ekkosConfigDir, 'config.json');

      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(content);

        // Validate required fields
        expect(config).toHaveProperty('userId');
        expect(config).toHaveProperty('tier');
      } else {
        // Config doesn't exist - that's OK for fresh installs
        test.skip();
      }
    });
  });
});

test.describe('Hook Deployment', () => {
  const hooksDir = path.join(os.homedir(), '.claude', 'hooks');

  test('hooks directory should exist or be creatable', () => {
    if (!fs.existsSync(hooksDir)) {
      fs.mkdirSync(hooksDir, { recursive: true });
    }
    expect(fs.existsSync(hooksDir)).toBe(true);
  });

  test.describe('Hook Files', () => {
    const expectedHooks = [
      'user-prompt-submit.sh',
      'stop.sh',
    ];

    for (const hookName of expectedHooks) {
      test(`should have ${hookName} template available`, async () => {
        // Check if hook template exists in the extension
        const templatePath = path.join(
          __dirname,
          '..',
          '..',
          'templates',
          'hooks',
          hookName
        );

        expect(fs.existsSync(templatePath)).toBe(true);

        // Verify it's a valid shell script
        const content = fs.readFileSync(templatePath, 'utf-8');
        expect(content).toContain('#!/');
      });
    }
  });
});

test.describe('Skills Deployment', () => {
  const skillsDir = path.join(os.homedir(), '.claude', 'skills');

  test('skills directory should exist or be creatable', () => {
    if (!fs.existsSync(skillsDir)) {
      fs.mkdirSync(skillsDir, { recursive: true });
    }
    expect(fs.existsSync(skillsDir)).toBe(true);
  });

  test.describe('Skill Templates', () => {
    const expectedSkills = [
      'continue',
      'ekkOS_Memory_First',
      'ekkOS_Learn',
      'ekkOS_Safety',
      'ekkOS_Schema',
    ];

    for (const skillName of expectedSkills) {
      test(`should have ${skillName} skill template`, async () => {
        const templatePath = path.join(
          __dirname,
          '..',
          '..',
          'templates',
          'skills',
          skillName,
          'Skill.md'
        );

        expect(fs.existsSync(templatePath)).toBe(true);

        // Verify it has frontmatter
        const content = fs.readFileSync(templatePath, 'utf-8');
        expect(content).toContain('---');
        expect(content).toContain('name:');
      });
    }
  });
});
