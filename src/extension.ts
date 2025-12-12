/**
 * ekkOS Connect - One-click setup for ekkOS memory system
 *
 * Features:
 * - OAuth authentication with platform.ekkos.dev
 * - Automatic MCP config deployment to all IDEs
 * - Custom AI instructions deployment
 * - Status bar and sidebar UI
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';

// Types
interface EkkosConfig {
  userId: string;
  email: string;
  token: string;
  apiKey: string;
  tier: 'free' | 'pro' | 'team' | 'enterprise';
  createdAt: string;
  patternScope?: 'both' | 'personal' | 'collective'; // Pattern retrieval preference
}

interface GoldenLoopActivity {
  goldenLoop: {
    retrievals: number;
    applications: number;
    successRate: number;
    forged: number;
  };
  usage: {
    ekkos: { used: number; limit: number };
    crystallizations: { used: number; limit: number };
  };
  tier: string;
  activityFeed: Array<{
    type: 'retrieve' | 'apply' | 'forge';
    id: string;
    message: string;
    timestamp: string;
    icon: string;
    success?: boolean;
  }>;
  lastUpdated: string;
}

interface IDEConfig {
  name: string;
  configPath: string;
  exists: boolean;
  deployed: boolean;
  connectionStatus?: 'checking' | 'connected' | 'error' | 'not-configured';
  lastChecked?: string;
}

interface SetupStatus {
  globalHooks: {
    claudeMd: { exists: boolean; path: string; hasEkkos: boolean };
    claudeDir: { exists: boolean; path: string; hasHooks: boolean };
    cursorrules: { exists: boolean; path: string; hasEkkos: boolean };
  };
  projectHooks: {
    claudeMd: { exists: boolean; path: string; hasEkkos: boolean };
    claudeDir: { exists: boolean; path: string; hasHooks: boolean };
    cursorrules: { exists: boolean; path: string; hasEkkos: boolean };
    cursorDir: { exists: boolean; path: string };
  };
  apiConnection: {
    status: 'connected' | 'error' | 'unchecked';
    latency?: number;
    lastChecked?: Date;
    error?: string;
  };
  setupScore: number; // 0-100
}

// Connection status cache
let ideConnectionStatus: Map<string, { status: string; lastChecked: Date; error?: string }> = new Map();
let currentSetupStatus: SetupStatus | null = null;

// Constants
const EKKOS_DIR = path.join(os.homedir(), '.ekkos');
const CONFIG_PATH = path.join(EKKOS_DIR, 'config.json');
const MCP_API_URL = 'https://mcp.ekkos.dev';
const PLATFORM_URL = 'https://platform.ekkos.dev';
// Use MCP_API_URL for all API calls - it's the unified gateway
const API_URL = MCP_API_URL;

// Tier display names (matches platform naming)
const TIER_NAMES: Record<string, string> = {
  free: 'Echo',
  pro: 'Resonance',
  team: 'Harmony',
  enterprise: 'Enterprise',
};

// Globals
let statusBarItem: vscode.StatusBarItem;
let sidebarProvider: EkkosSidebarProvider;
let currentConfig: EkkosConfig | null = null;
let currentActivity: GoldenLoopActivity | null = null;
let activityRefreshInterval: ReturnType<typeof setInterval> | null = null;
let lastSuccessfulSync: Date | null = null;
let lastSyncError: string | null = null;

// ============ API Retry Helper ============

interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retryOptions: RetryOptions = {}
): Promise<Response> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    backoffMultiplier = 2
  } = retryOptions;

  let lastError: Error | null = null;
  let delay = initialDelayMs;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Don't retry client errors (4xx), only server errors (5xx) and network issues
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      // Server error - will retry
      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (e) {
      // Network error - will retry
      lastError = e instanceof Error ? e : new Error(String(e));
    }

    // Don't wait after the last attempt
    if (attempt < maxRetries) {
      console.log(`API request failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * backoffMultiplier, maxDelayMs);
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

export function activate(context: vscode.ExtensionContext) {
  console.log('ekkOS Connect extension activated');

  // Load existing config
  currentConfig = loadConfig();

  // Create status bar
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'ekkos.openSidebar';
  context.subscriptions.push(statusBarItem);
  updateStatusBar();

  // Create sidebar provider
  sidebarProvider = new EkkosSidebarProvider(context.extensionUri, context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('ekkosConnect', sidebarProvider)
  );

  // Register URI handler for OAuth callback
  context.subscriptions.push(
    vscode.window.registerUriHandler({
      handleUri(uri: vscode.Uri): vscode.ProviderResult<void> {
        handleAuthCallback(uri, context);
      }
    })
  );

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('ekkos.connect', () => startAuth(context)),
    vscode.commands.registerCommand('ekkos.openSidebar', () => openSidebar()),
    vscode.commands.registerCommand('ekkos.disconnect', () => disconnect(context)),
    vscode.commands.registerCommand('ekkos.deployMcp', () => deployMcpConfig()),
    vscode.commands.registerCommand('ekkos.deployInstructions', () => deployAiInstructions()),
    vscode.commands.registerCommand('ekkos.openDashboard', () => openDashboard()),
    vscode.commands.registerCommand('ekkos.refreshStatus', () => refreshStatus()),
    vscode.commands.registerCommand('ekkos.setupRules', () => setupRulesCommand(context)),
    vscode.commands.registerCommand('ekkos.setupGlobal', () => setupGlobalHooksCommand(context)),
    vscode.commands.registerCommand('ekkos.togglePatternScope', () => togglePatternScope())
  );

  // Watch for config changes
  ensureEkkosDir();
  const configWatcher = fs.watchFile(CONFIG_PATH, { interval: 1000 }, () => {
    currentConfig = loadConfig();
    updateStatusBar();
    sidebarProvider.refresh();
  });

  context.subscriptions.push({
    dispose: () => fs.unwatchFile(CONFIG_PATH)
  });

  // Show welcome on first run
  if (!context.globalState.get('ekkos.welcomed') && !currentConfig) {
    context.globalState.update('ekkos.welcomed', true);
    vscode.window.showInformationMessage(
      'Welcome to ekkOS Connect! Click the ekkOS icon in the sidebar to get started.',
      'Open Sidebar'
    ).then(selection => {
      if (selection === 'Open Sidebar') {
        vscode.commands.executeCommand('workbench.view.extension.ekkos');
      }
    });
  }

  // Start activity polling if connected
  if (currentConfig) {
    startActivityPolling();
  }

  // Check and setup rules on startup (if auto-setup enabled)
  const autoSetupEnabled = vscode.workspace.getConfiguration('ekkos').get('autoSetup', true);
  if (autoSetupEnabled) {
    checkAndSetupRules(context);
  }
}

// ============ Activity Polling ============

async function fetchActivity(): Promise<GoldenLoopActivity | null> {
  if (!currentConfig?.apiKey) {
    return null;
  }

  try {
    // Use MCP_API_URL which is the correct gateway endpoint
    const response = await fetchWithRetry(
      `${MCP_API_URL}/api/v1/memory/activity`,
      {
        headers: {
          'Authorization': `Bearer ${currentConfig.apiKey}`,
          'Content-Type': 'application/json'
        }
      },
      { maxRetries: 2, initialDelayMs: 1000 }
    );

    if (response.ok) {
      lastSuccessfulSync = new Date();
      lastSyncError = null;
      return await response.json();
    } else {
      lastSyncError = `API error: ${response.status}`;
    }
  } catch (e) {
    console.error('Failed to fetch activity:', e);
    lastSyncError = e instanceof Error ? e.message : 'Network error';
  }
  return null;
}

function startActivityPolling() {
  // Clear existing interval
  if (activityRefreshInterval) {
    clearInterval(activityRefreshInterval);
  }

  // Fetch immediately
  fetchActivity().then(activity => {
    if (activity) {
      currentActivity = activity;
      updateStatusBar();
      sidebarProvider?.refresh();
    }
  });

  // Check IDE connections and setup status on startup
  checkIdeConnections();
  checkSetupStatus();

  // Poll every 30 seconds for activity, every 60 seconds for connections/setup
  let connectionCheckCounter = 0;
  activityRefreshInterval = setInterval(async () => {
    const activity = await fetchActivity();
    if (activity) {
      currentActivity = activity;
      updateStatusBar();
      sidebarProvider?.refresh();
    }

    // Check connections and setup every 2 polls (60 seconds)
    connectionCheckCounter++;
    if (connectionCheckCounter >= 2) {
      connectionCheckCounter = 0;
      await checkIdeConnections();
      await checkSetupStatus();
    }
  }, 30000);
}

function stopActivityPolling() {
  if (activityRefreshInterval) {
    clearInterval(activityRefreshInterval);
    activityRefreshInterval = null;
  }
  currentActivity = null;
}

// ============ Active Connection Monitoring ============

/**
 * Check if MCP connection is actually working by pinging the API
 * Returns status for each IDE that has ekkOS configured
 */
async function checkIdeConnections(): Promise<void> {
  if (!currentConfig?.apiKey) {
    return;
  }

  const ideConfigs = getIdeConfigs();

  for (const ide of ideConfigs) {
    if (!ide.exists) {
      ideConnectionStatus.set(ide.name, { status: 'not-installed', lastChecked: new Date() });
      continue;
    }

    // Check if config file contains ekkos-memory
    try {
      if (fs.existsSync(ide.configPath)) {
        const content = fs.readFileSync(ide.configPath, 'utf8');
        if (content.includes('ekkos-memory') || content.includes('ekkos')) {
          // Config exists, now verify API connection
          const status = await verifyApiConnection();
          ideConnectionStatus.set(ide.name, {
            status: status.connected ? 'connected' : 'error',
            lastChecked: new Date(),
            error: status.error
          });
        } else {
          ideConnectionStatus.set(ide.name, { status: 'not-configured', lastChecked: new Date() });
        }
      } else {
        ideConnectionStatus.set(ide.name, { status: 'not-configured', lastChecked: new Date() });
      }
    } catch (e) {
      ideConnectionStatus.set(ide.name, {
        status: 'error',
        lastChecked: new Date(),
        error: (e as Error).message
      });
    }
  }

  // Refresh sidebar to show updated status
  sidebarProvider?.refresh();
}

/**
 * Verify API connection by calling the health endpoint
 */
async function verifyApiConnection(): Promise<{ connected: boolean; error?: string }> {
  if (!currentConfig?.apiKey) {
    return { connected: false, error: 'No API key' };
  }

  try {
    // Create abort controller with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${MCP_API_URL}/api/v1/mcp/tools`, {
      headers: {
        'Authorization': `Bearer ${currentConfig.apiKey}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json() as { tools?: unknown[] };
      if (data.tools && Array.isArray(data.tools)) {
        return { connected: true };
      }
    }

    return { connected: false, error: `HTTP ${response.status}` };
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      return { connected: false, error: 'Timeout' };
    }
    return { connected: false, error: (e as Error).message };
  }
}

/**
 * Get connection status for a specific IDE
 */
function getIdeConnectionStatus(ideName: string): { status: string; lastChecked?: Date; error?: string } {
  return ideConnectionStatus.get(ideName) || { status: 'unknown' };
}

// ============ Setup Verification ============

/**
 * Comprehensive setup status check
 * Monitors global hooks, project hooks, and API connection
 */
async function checkSetupStatus(): Promise<SetupStatus> {
  const homeDir = os.homedir();
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';

  // Global hooks paths
  const globalClaudeMd = path.join(homeDir, 'CLAUDE.md');
  const globalClaudeDir = path.join(homeDir, '.claude');
  const globalCursorrules = path.join(homeDir, '.cursorrules');

  // Project hooks paths
  const projectClaudeMd = workspaceFolder ? path.join(workspaceFolder, 'CLAUDE.md') : '';
  const projectClaudeDir = workspaceFolder ? path.join(workspaceFolder, '.claude') : '';
  const projectCursorrules = workspaceFolder ? path.join(workspaceFolder, '.cursorrules') : '';
  const projectCursorDir = workspaceFolder ? path.join(workspaceFolder, '.cursor') : '';

  // Check global hooks
  const globalHooks = {
    claudeMd: {
      exists: fs.existsSync(globalClaudeMd),
      path: globalClaudeMd,
      hasEkkos: checkFileContainsEkkos(globalClaudeMd)
    },
    claudeDir: {
      exists: fs.existsSync(globalClaudeDir),
      path: globalClaudeDir,
      hasHooks: checkDirHasHooks(globalClaudeDir)
    },
    cursorrules: {
      exists: fs.existsSync(globalCursorrules),
      path: globalCursorrules,
      hasEkkos: checkFileContainsEkkos(globalCursorrules)
    }
  };

  // Check project hooks
  const projectHooks = {
    claudeMd: {
      exists: workspaceFolder ? fs.existsSync(projectClaudeMd) : false,
      path: projectClaudeMd,
      hasEkkos: checkFileContainsEkkos(projectClaudeMd)
    },
    claudeDir: {
      exists: workspaceFolder ? fs.existsSync(projectClaudeDir) : false,
      path: projectClaudeDir,
      hasHooks: checkDirHasHooks(projectClaudeDir)
    },
    cursorrules: {
      exists: workspaceFolder ? fs.existsSync(projectCursorrules) : false,
      path: projectCursorrules,
      hasEkkos: checkFileContainsEkkos(projectCursorrules)
    },
    cursorDir: {
      exists: workspaceFolder ? fs.existsSync(projectCursorDir) : false,
      path: projectCursorDir
    }
  };

  // Check API connection with latency
  const apiConnection = await checkApiConnectionWithLatency();

  // Calculate setup score (0-100)
  let score = 0;
  const weights = {
    apiConnected: 30,
    globalClaudeMd: 15,
    globalHooks: 15,
    projectClaudeMd: 10,
    projectHooks: 10,
    ideConfigured: 20
  };

  if (apiConnection.status === 'connected') score += weights.apiConnected;
  if (globalHooks.claudeMd.hasEkkos) score += weights.globalClaudeMd;
  if (globalHooks.claudeDir.hasHooks) score += weights.globalHooks;
  if (projectHooks.claudeMd.hasEkkos) score += weights.projectClaudeMd;
  if (projectHooks.claudeDir.hasHooks) score += weights.projectHooks;

  // Check if at least one IDE is configured
  const ideConfigs = getIdeConfigs();
  const anyIdeConfigured = ideConfigs.some(ide => {
    if (!ide.exists) return false;
    try {
      if (fs.existsSync(ide.configPath)) {
        const content = fs.readFileSync(ide.configPath, 'utf8');
        return content.includes('ekkos');
      }
    } catch { }
    return false;
  });
  if (anyIdeConfigured) score += weights.ideConfigured;

  currentSetupStatus = {
    globalHooks,
    projectHooks,
    apiConnection,
    setupScore: score
  };

  return currentSetupStatus;
}

/**
 * Check if a file contains ekkOS references
 */
function checkFileContainsEkkos(filePath: string): boolean {
  if (!filePath || !fs.existsSync(filePath)) return false;
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.toLowerCase().includes('ekkos') ||
           content.includes('mcp.ekkos.dev') ||
           content.includes('[ekkOS_');
  } catch {
    return false;
  }
}

/**
 * Check if .claude directory has hooks configured
 */
function checkDirHasHooks(dirPath: string): boolean {
  if (!dirPath || !fs.existsSync(dirPath)) return false;
  try {
    const hooksDir = path.join(dirPath, 'hooks');
    if (fs.existsSync(hooksDir)) {
      const files = fs.readdirSync(hooksDir);
      return files.length > 0;
    }
    // Also check for commands or settings
    const settingsFile = path.join(dirPath, 'settings.json');
    if (fs.existsSync(settingsFile)) {
      const content = fs.readFileSync(settingsFile, 'utf8');
      return content.includes('ekkos');
    }
  } catch { }
  return false;
}

/**
 * Check API connection with latency measurement
 */
async function checkApiConnectionWithLatency(): Promise<{
  status: 'connected' | 'error' | 'unchecked';
  latency?: number;
  lastChecked?: Date;
  error?: string;
}> {
  if (!currentConfig?.apiKey) {
    return { status: 'unchecked' };
  }

  try {
    const startTime = Date.now();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${MCP_API_URL}/api/v1/mcp/tools`, {
      headers: {
        'Authorization': `Bearer ${currentConfig.apiKey}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    const latency = Date.now() - startTime;

    if (response.ok) {
      return {
        status: 'connected',
        latency,
        lastChecked: new Date()
      };
    }

    return {
      status: 'error',
      latency,
      lastChecked: new Date(),
      error: `HTTP ${response.status}`
    };
  } catch (e) {
    return {
      status: 'error',
      lastChecked: new Date(),
      error: (e as Error).name === 'AbortError' ? 'Timeout' : (e as Error).message
    };
  }
}

/**
 * Get setup status (cached or fresh)
 */
function getSetupStatus(): SetupStatus | null {
  return currentSetupStatus;
}

// ============ Config Management ============

function ensureEkkosDir() {
  if (!fs.existsSync(EKKOS_DIR)) {
    fs.mkdirSync(EKKOS_DIR, { recursive: true });
    // Set secure permissions (owner only) on POSIX systems
    if (process.platform !== 'win32') {
      try {
        fs.chmodSync(EKKOS_DIR, 0o700);
      } catch {
        // Ignore chmod errors (e.g., on some network mounts)
      }
    }
  }
}

function loadConfig(): EkkosConfig | null {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to load ekkOS config:', e);
  }
  return null;
}

function saveConfig(config: EkkosConfig) {
  ensureEkkosDir();

  // Atomic write: write to temp file first, then rename
  const tempPath = CONFIG_PATH + '.tmp';
  try {
    fs.writeFileSync(tempPath, JSON.stringify(config, null, 2));
    fs.renameSync(tempPath, CONFIG_PATH); // Atomic on POSIX systems
  } catch (e) {
    // Clean up temp file if rename failed
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    throw e;
  }

  currentConfig = config;
  updateStatusBar();
  sidebarProvider?.refresh();
  startActivityPolling(); // Start polling after auth
}

// ============ Authentication ============

// Store auth timeout so we can clear it on successful callback
let authTimeoutHandle: ReturnType<typeof setTimeout> | null = null;

async function startAuth(context: vscode.ExtensionContext, selectedIde?: string) {
  // Use selected IDE or try to detect
  const uriScheme = selectedIde || vscode.env.uriScheme || 'vscode';
  const redirectUri = `${uriScheme}://ekkostech.ekkos-connect/callback`;

  // Generate state for CSRF protection
  const state = generateRandomString(32);
  context.globalState.update('ekkos.authState', state);

  // Set 5-minute timeout to clear stale auth state
  if (authTimeoutHandle) {
    clearTimeout(authTimeoutHandle);
  }
  authTimeoutHandle = setTimeout(() => {
    const currentState = context.globalState.get<string>('ekkos.authState');
    if (currentState === state) {
      context.globalState.update('ekkos.authState', null);
      vscode.window.showWarningMessage(
        'Authentication timed out. Please try again.',
        'Retry'
      ).then(selection => {
        if (selection === 'Retry') {
          startAuth(context, selectedIde);
        }
      });
    }
    authTimeoutHandle = null;
  }, 5 * 60 * 1000); // 5 minutes

  // Open platform login page directly (supports Google OAuth and other methods)
  // After login, user will be redirected to extension auth endpoint which handles the callback
  const loginUrl = `${PLATFORM_URL}/login?returnTo=${encodeURIComponent(`/api/auth/extension?state=${state}&redirect=${encodeURIComponent(redirectUri)}`)}`;

  await vscode.env.openExternal(vscode.Uri.parse(loginUrl));
}

// IDE configurations for the selector
const SUPPORTED_IDES = [
  { id: 'cursor', name: 'Cursor', icon: '🔵' },
  { id: 'vscode', name: 'VS Code', icon: '💙' },
  { id: 'vscode-insiders', name: 'VS Code Insiders', icon: '💚' },
  { id: 'windsurf', name: 'Windsurf', icon: '🌊' },
  { id: 'codium', name: 'VSCodium', icon: '🟢' },
];

async function handleAuthCallback(uri: vscode.Uri, context: vscode.ExtensionContext) {
  const params = new URLSearchParams(uri.query);
  const token = params.get('token');
  const email = params.get('email');
  const userId = params.get('userId');
  const apiKey = params.get('apiKey');
  const tier = params.get('tier') as 'free' | 'pro' | 'team' | 'enterprise';
  const state = params.get('state');

  // Verify state (CSRF protection)
  const savedState = context.globalState.get<string>('ekkos.authState');
  if (state !== savedState) {
    vscode.window.showErrorMessage('Authentication failed: Invalid state. Please try again.');
    return;
  }

  // Clear CSRF state immediately after verification to prevent replay attacks
  context.globalState.update('ekkos.authState', null);

  // Clear the auth timeout since we received a valid callback
  if (authTimeoutHandle) {
    clearTimeout(authTimeoutHandle);
    authTimeoutHandle = null;
  }

  if (!token || !email || !userId || !apiKey) {
    vscode.window.showErrorMessage('Authentication failed: Missing credentials');
    return;
  }

  // Validate API key format
  if (!apiKey.startsWith('ekk_') || apiKey.length < 20) {
    vscode.window.showErrorMessage('Authentication failed: Invalid API key format. Please try again.');
    return;
  }

  // Save config
  const config: EkkosConfig = {
    userId,
    email,
    token,
    apiKey,
    tier: tier || 'free',
    createdAt: new Date().toISOString()
  };
  saveConfig(config);

  vscode.window.showInformationMessage(
    `Successfully connected as ${email}!`,
    'Deploy MCP Config'
  ).then(selection => {
    if (selection === 'Deploy MCP Config') {
      deployMcpConfig();
    }
  });

  // Auto-deploy MCP if enabled
  const autoDeployEnabled = vscode.workspace.getConfiguration('ekkos').get('autoDeployMcp', true);
  if (autoDeployEnabled) {
    await deployMcpConfig();
  }
}

async function handleManualApiKey(apiKey: string, context: vscode.ExtensionContext) {
  if (!apiKey || !apiKey.startsWith('ekk_') || apiKey.length < 20) {
    vscode.window.showErrorMessage('Invalid API key format. API keys should start with ekk_ and be at least 20 characters.');
    return;
  }

  try {
    // Validate the API key by calling the API
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${API_URL}/api/v1/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      if (response.status === 401) {
        vscode.window.showErrorMessage('Invalid API key. Please check your key and try again.');
      } else {
        vscode.window.showErrorMessage(`API validation failed: ${response.status}`);
      }
      return;
    }

    const data = await response.json() as { user?: { id: string; email: string; tier?: string } };

    if (!data.user?.id || !data.user?.email) {
      vscode.window.showErrorMessage('Could not retrieve user information. Please try again.');
      return;
    }

    // Save config
    const config: EkkosConfig = {
      userId: data.user.id,
      email: data.user.email,
      token: 'manual-entry', // No OAuth token for manual entry
      apiKey,
      tier: (data.user.tier as 'free' | 'pro' | 'team' | 'enterprise') || 'free',
      createdAt: new Date().toISOString()
    };
    saveConfig(config);

    vscode.window.showInformationMessage(
      `Successfully connected as ${data.user.email}!`,
      'Deploy MCP Config'
    ).then(selection => {
      if (selection === 'Deploy MCP Config') {
        deployMcpConfig();
      }
    });

    // Auto-deploy MCP if enabled
    const autoDeployEnabled = vscode.workspace.getConfiguration('ekkos').get('autoDeployMcp', true);
    if (autoDeployEnabled) {
      await deployMcpConfig();
    }
  } catch (e: any) {
    if (e.name === 'AbortError') {
      vscode.window.showErrorMessage('API validation timed out. Please check your connection.');
    } else {
      vscode.window.showErrorMessage('Failed to validate API key: ' + e.message);
    }
  }
}

function togglePatternScope() {
  if (!currentConfig) {
    vscode.window.showErrorMessage('Not connected to ekkOS');
    return;
  }

  const scopes: Array<'both' | 'personal' | 'collective'> = ['both', 'personal', 'collective'];
  const currentScope = currentConfig.patternScope || 'both';
  const currentIndex = scopes.indexOf(currentScope);
  const nextScope = scopes[(currentIndex + 1) % scopes.length];

  // Update config
  currentConfig.patternScope = nextScope;
  saveConfig(currentConfig);

  // Show notification with icon
  const icons = { both: '●', personal: 'P', collective: 'C' };
  const labels = { both: 'Personal + Collective', personal: 'Personal Only', collective: 'Collective Only' };

  vscode.window.showInformationMessage(
    `Pattern Scope: [${icons[nextScope]}] ${labels[nextScope]}`
  );

  // Update UI
  updateStatusBar();
  sidebarProvider.refresh();
}

function disconnect(context: vscode.ExtensionContext) {
  vscode.window.showWarningMessage(
    'Are you sure you want to disconnect from ekkOS?',
    'Disconnect',
    'Cancel'
  ).then(selection => {
    if (selection === 'Disconnect') {
      try {
        if (fs.existsSync(CONFIG_PATH)) {
          fs.unlinkSync(CONFIG_PATH);
        }
        currentConfig = null;
        stopActivityPolling(); // Stop polling on disconnect
        updateStatusBar();
        sidebarProvider?.refresh();
        vscode.window.showInformationMessage('Disconnected from ekkOS');
      } catch (e) {
        vscode.window.showErrorMessage('Failed to disconnect: ' + e);
      }
    }
  });
}

// ============ MCP Config Deployment ============

function getIdeConfigs(): IDEConfig[] {
  const configs: IDEConfig[] = [];
  const homeDir = os.homedir();

  // Cursor
  const cursorConfig = path.join(homeDir, '.cursor', 'mcp.json');
  configs.push({
    name: 'Cursor',
    configPath: cursorConfig,
    exists: fs.existsSync(path.dirname(cursorConfig)),
    deployed: false
  });

  // Claude Code (claude_desktop_config.json) - cross-platform
  const claudeCodeConfig = process.platform === 'darwin'
    ? path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
    : process.platform === 'win32'
      ? path.join(process.env.APPDATA || homeDir, 'Claude', 'claude_desktop_config.json')
      : path.join(homeDir, '.config', 'Claude', 'claude_desktop_config.json');
  configs.push({
    name: 'Claude Code',
    configPath: claudeCodeConfig,
    exists: fs.existsSync(path.dirname(claudeCodeConfig)),
    deployed: false
  });

  // Windsurf (uses ~/.codeium/windsurf/mcp_config.json)
  const windsurfConfig = path.join(homeDir, '.codeium', 'windsurf', 'mcp_config.json');
  configs.push({
    name: 'Windsurf',
    configPath: windsurfConfig,
    exists: fs.existsSync(path.dirname(windsurfConfig)),
    deployed: false
  });

  // OpenAI Codex CLI (TOML format)
  const codexConfig = path.join(homeDir, '.codex', 'config.toml');
  configs.push({
    name: 'Codex',
    configPath: codexConfig,
    exists: fs.existsSync(path.dirname(codexConfig)),
    deployed: false
  });

  return configs;
}

async function deployMcpConfig() {
  if (!currentConfig) {
    vscode.window.showErrorMessage('Please connect to ekkOS first');
    return;
  }

  const ideConfigs = getIdeConfigs();
  const results: string[] = [];

  for (const ide of ideConfigs) {
    if (!ide.exists) {
      results.push(`${ide.name}: Not installed`);
      continue;
    }

    try {
      await deployToIde(ide, currentConfig);
      results.push(`${ide.name}: Deployed`);
    } catch (e: any) {
      results.push(`${ide.name}: Failed - ${e.message}`);
    }
  }

  vscode.window.showInformationMessage(
    `MCP Config Deployment Results:\n${results.join('\n')}`,
    'View Details'
  ).then(selection => {
    if (selection === 'View Details') {
      const panel = vscode.window.createOutputChannel('ekkOS Deploy');
      panel.appendLine('=== MCP Config Deployment Results ===');
      results.forEach(r => panel.appendLine(r));
      panel.show();
    }
  });

  sidebarProvider?.refresh();
}

async function deployToIde(ide: IDEConfig, config: EkkosConfig) {
  // Handle Codex separately (TOML format)
  if (ide.name === 'Codex') {
    await deployToCodex(ide, config);
    return;
  }

  // Ensure directory exists
  const dir = path.dirname(ide.configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Handle different config formats
  let finalConfig: any;
  let mcpConfig: any;

  if (ide.name === 'Claude Code') {
    // Claude Code requires command-based MCP server (not HTTP/SSE)
    mcpConfig = {
      mcpServers: {
        'ekkos-memory': {
          command: 'npx',
          args: ['-y', '@ekkos/mcp-server'],
          env: {
            EKKOS_API_KEY: config.apiKey,
            EKKOS_USER_ID: config.userId
          }
        }
      }
    };
  } else {
    // Cursor, Windsurf, etc. use HTTP/SSE transport
    // Include API key in URL as query param (SSE clients often can't set headers)
    const sseUrl = `${MCP_API_URL}/api/v1/mcp/sse?api_key=${encodeURIComponent(config.apiKey)}`;
    mcpConfig = {
      mcpServers: {
        'ekkos-memory': {
          url: sseUrl,
          transport: 'sse',
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'X-User-ID': config.userId
          }
        }
      }
    };
  }

  if (ide.name === 'Claude Code') {
    // Claude Code - merge with existing config
    if (fs.existsSync(ide.configPath)) {
      try {
        const existing = JSON.parse(fs.readFileSync(ide.configPath, 'utf8'));
        finalConfig = {
          ...existing,
          mcpServers: {
            ...existing.mcpServers,
            ...mcpConfig.mcpServers
          }
        };
      } catch {
        finalConfig = mcpConfig;
      }
    } else {
      finalConfig = mcpConfig;
    }
  } else if (fs.existsSync(ide.configPath)) {
    // Merge with existing config for other IDEs
    try {
      const existing = JSON.parse(fs.readFileSync(ide.configPath, 'utf8'));
      finalConfig = {
        ...existing,
        mcpServers: {
          ...existing.mcpServers,
          ...mcpConfig.mcpServers
        }
      };
    } catch {
      finalConfig = mcpConfig;
    }
  } else {
    finalConfig = mcpConfig;
  }

  fs.writeFileSync(ide.configPath, JSON.stringify(finalConfig, null, 2));
  ide.deployed = true;
}

/**
 * Deploy ekkOS MCP config to OpenAI Codex (TOML format)
 * Uses http_headers directly - no env var modification needed!
 */
async function deployToCodex(ide: IDEConfig, config: EkkosConfig) {
  const dir = path.dirname(ide.configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // ekkOS MCP server config in TOML format
  // Use http_headers for direct auth, with API key in URL as fallback
  const sseUrlWithKey = `${MCP_API_URL}/api/v1/mcp/sse?api_key=${encodeURIComponent(config.apiKey)}`;
  const ekkosToml = `
# ═══════════════════════════════════════════════════════════════════════════
# ekkOS Memory - AI memory system with 10-layer architecture
# https://ekkos.dev (configured by ekkOS Connect extension)
# ═══════════════════════════════════════════════════════════════════════════
[mcp_servers.ekkos]
url = "${sseUrlWithKey}"
http_headers = { "Authorization" = "Bearer ${config.apiKey}", "X-User-ID" = "${config.userId}" }
`;

  let existingContent = '';
  if (fs.existsSync(ide.configPath)) {
    existingContent = fs.readFileSync(ide.configPath, 'utf8');
  }

  // Check if ekkOS is already configured
  if (existingContent.includes('[mcp_servers.ekkos]')) {
    // Update existing config - replace the ekkos section
    const updatedContent = existingContent.replace(
      /# ═+\n# ekkOS Memory[\s\S]*?\[mcp_servers\.ekkos\][\s\S]*?(?=\n\[|$)/,
      ekkosToml.trim()
    );
    fs.writeFileSync(ide.configPath, updatedContent);
  } else {
    // Append to existing config
    fs.writeFileSync(ide.configPath, existingContent + ekkosToml);
  }

  ide.deployed = true;
}

// ============ AI Instructions Deployment ============

async function deployAiInstructions() {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showWarningMessage('Please open a workspace first');
    return;
  }

  const projectRoot = workspaceFolder.uri.fsPath;

  // Deploy .claude.md for Claude Code
  const claudeMdPath = path.join(projectRoot, '.claude.md');
  if (!fs.existsSync(claudeMdPath)) {
    const claudeMdContent = getClaudeMdTemplate();
    fs.writeFileSync(claudeMdPath, claudeMdContent);
  }

  // Deploy .cursorrules for Cursor
  const cursorRulesPath = path.join(projectRoot, '.cursorrules');
  if (!fs.existsSync(cursorRulesPath)) {
    const cursorRulesContent = getCursorRulesTemplate();
    fs.writeFileSync(cursorRulesPath, cursorRulesContent);
  }

  vscode.window.showInformationMessage(
    'AI instructions deployed! Created .claude.md and .cursorrules',
    'Open .claude.md'
  ).then(selection => {
    if (selection === 'Open .claude.md') {
      vscode.workspace.openTextDocument(claudeMdPath).then(doc => {
        vscode.window.showTextDocument(doc);
      });
    }
  });
}

function getClaudeMdTemplate(): string {
  return `# ekkOS Memory Integration

This project uses ekkOS for AI memory and learning.

## Memory Commands

Use these MCP tools to interact with the memory system:

- \`ekko\` - Search your memory for relevant patterns and solutions
- \`crystallize\` - Save important decisions and patterns permanently
- \`reflex\` - Validate suggestions against your history (Hallucination Firewall)
- \`trace\` - Understand why a suggestion was made

## Best Practices

1. **Before starting work**: Search memory for relevant patterns
2. **After solving problems**: Crystallize the solution for future use
3. **When uncertain**: Use reflex to validate AI suggestions

## Example Usage

\`\`\`
# Search for past solutions
ekko "authentication issues"

# Save a new pattern
crystallize "Use Supabase Auth, not custom JWT"
\`\`\`

For more info: https://docs.ekkos.dev
`;
}

function getCursorRulesTemplate(): string {
  return `# ekkOS Memory Integration

You have access to the ekkOS memory system via MCP tools.

## Available Tools

- ekko: Search memory for patterns and solutions
- crystallize: Save decisions and patterns permanently
- reflex: Validate suggestions against past decisions
- trace: Explain why suggestions were made

## Workflow

1. Start by searching memory with ekko() for relevant context
2. Apply patterns you find to your work
3. When you discover something valuable, crystallize() it
4. Use reflex() when uncertain about a suggestion

## Memory Layers

ekkOS has 10 memory layers:
1. Working Memory (recent context)
2. Episodic Memory (conversation history)
3. Semantic Memory (compressed knowledge)
4. Pattern Memory (reusable solutions)
5. Procedural Memory (workflows)
6. Collective Memory (team knowledge)
7. Meta Memory (self-awareness)
8. Codebase Memory (code embeddings)
9. Directive Memory (MUST/NEVER rules)
10. Conflict Resolution (priority decisions)

For documentation: https://docs.ekkos.dev
`;
}

// ============ Status Management ============

function updateStatusBar() {
  if (currentConfig) {
    const scope = currentConfig.patternScope || 'both';
    const scopeIcons = { both: '●', personal: 'P', collective: 'C' };
    const scopeLabels = { both: 'Personal + Collective', personal: 'Personal Only', collective: 'Collective Only' };

    statusBarItem.text = `$(database) ekkOS [${scopeIcons[scope]}]`;
    statusBarItem.tooltip = `Connected as ${currentConfig.email}\nPattern Scope: ${scopeLabels[scope]}\n\nClick to toggle scope`;
    statusBarItem.backgroundColor = undefined;
    statusBarItem.command = 'ekkos.togglePatternScope'; // Make clickable
  } else {
    statusBarItem.text = '$(database) ekkOS: Connect';
    statusBarItem.tooltip = 'Click to connect to ekkOS';
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
    statusBarItem.command = 'ekkos.openSidebar';
  }

  const showStatusBar = vscode.workspace.getConfiguration('ekkos').get('showStatusBar', true);
  if (showStatusBar) {
    statusBarItem.show();
  } else {
    statusBarItem.hide();
  }
}

async function refreshStatus() {
  currentConfig = loadConfig();
  updateStatusBar();
  sidebarProvider?.refresh();
  vscode.window.showInformationMessage('ekkOS status refreshed');
}

function openDashboard() {
  vscode.env.openExternal(vscode.Uri.parse(PLATFORM_URL));
}

function openSidebar() {
  vscode.commands.executeCommand('workbench.view.extension.ekkos');
}

// ============ Sidebar Provider ============

class EkkosSidebarProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;

  constructor(
    private readonly _extensionUri: vscode.Uri,
    private readonly _context: vscode.ExtensionContext
  ) {}

  public refresh() {
    if (this._view) {
      this._view.webview.html = this._getHtmlContent();
    }
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri]
    };

    webviewView.webview.html = this._getHtmlContent();

    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'connect':
          vscode.commands.executeCommand('ekkos.connect');
          break;
        case 'connectWithIde':
          startAuth(this._context, message.ideId);
          break;
        case 'disconnect':
          vscode.commands.executeCommand('ekkos.disconnect');
          break;
        case 'deployMcp':
          vscode.commands.executeCommand('ekkos.deployMcp');
          break;
        case 'deployInstructions':
          vscode.commands.executeCommand('ekkos.deployInstructions');
          break;
        case 'openDashboard':
          vscode.commands.executeCommand('ekkos.openDashboard');
          break;
        case 'refresh':
          vscode.commands.executeCommand('ekkos.refreshStatus');
          break;
        case 'openPlatform':
          // Open platform login page directly (supports Google OAuth)
          vscode.env.openExternal(vscode.Uri.parse(`${PLATFORM_URL}/login`));
          break;
        case 'openDocs':
          vscode.env.openExternal(vscode.Uri.parse('https://docs.ekkos.dev'));
          break;
        case 'setupGlobal':
          vscode.commands.executeCommand('ekkos.setupGlobal');
          break;
        case 'setupRules':
          vscode.commands.executeCommand('ekkos.setupRules');
          break;
        case 'showMessage':
          vscode.window.showInformationMessage(message.text);
          break;
        case 'checkConnections':
          checkIdeConnections();
          break;
        case 'runDiagnostics':
          checkSetupStatus().then(status => {
            sidebarProvider?.refresh();
            vscode.window.showInformationMessage(`API: ${status.apiConnection.status}${status.apiConnection.latency ? ` (${status.apiConnection.latency}ms)` : ''}`);
          });
          break;
        case 'manualApiKey':
          handleManualApiKey(message.apiKey, this._context);
          break;
      }
    });
  }

  private _getHtmlContent(): string {
    const config = currentConfig;
    const activity = currentActivity;
    const ideConfigs = getIdeConfigs();
    const setupStatus = getSetupStatus();
    const syncStatus = getSyncStatus();

    // Get brain icon URI for webview
    const brainIconPath = vscode.Uri.joinPath(this._extensionUri, 'resources', 'ekkos-icon.svg');
    const brainIconUri = this._view?.webview.asWebviewUri(brainIconPath).toString() || '';

    // Golden Loop status section
    const goldenLoopHtml = activity ? `
      <div class="section golden-loop">
        <h3>Golden Loop Status</h3>
        <div class="loop-stats">
          <div class="stat">
            <span class="stat-icon">🔍</span>
            <span class="stat-value">${activity.goldenLoop.retrievals}</span>
            <span class="stat-label">Retrieved</span>
          </div>
          <div class="stat">
            <span class="stat-icon">✨</span>
            <span class="stat-value">${activity.goldenLoop.applications}</span>
            <span class="stat-label">Applied</span>
          </div>
          <div class="stat">
            <span class="stat-icon">💡</span>
            <span class="stat-value">${activity.goldenLoop.forged}</span>
            <span class="stat-label">Forged</span>
          </div>
          <div class="stat">
            <span class="stat-icon">📈</span>
            <span class="stat-value">${activity.goldenLoop.successRate}%</span>
            <span class="stat-label">Success</span>
          </div>
        </div>
      </div>

      <div class="section usage">
        <h3>Usage This Month</h3>
        <div class="usage-bar">
          <div class="usage-label">
            <span>Ekkos</span>
            <span>${activity.usage.ekkos.used} / ${activity.usage.ekkos.limit === -1 ? '∞' : activity.usage.ekkos.limit}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${activity.usage.ekkos.limit === -1 ? 0 : Math.min(100, (activity.usage.ekkos.used / activity.usage.ekkos.limit) * 100)}%"></div>
          </div>
        </div>
        <div class="usage-bar">
          <div class="usage-label">
            <span>Crystallizations</span>
            <span>${activity.usage.crystallizations.used} / ${activity.usage.crystallizations.limit === -1 ? '∞' : activity.usage.crystallizations.limit}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${activity.usage.crystallizations.limit === -1 ? 0 : Math.min(100, (activity.usage.crystallizations.used / activity.usage.crystallizations.limit) * 100)}%"></div>
          </div>
        </div>
      </div>

      <div class="section activity">
        <h3>Recent Activity</h3>
        <div class="activity-feed">
          ${activity.activityFeed.length > 0 ? activity.activityFeed.slice(0, 5).map(item => `
            <div class="activity-item ${item.type}">
              <span class="activity-icon">${item.type === 'retrieve' ? '🔍' : item.type === 'apply' ? (item.success ? '✅' : '❌') : '💡'}</span>
              <span class="activity-message">${item.message.substring(0, 40)}${item.message.length > 40 ? '...' : ''}</span>
              <span class="activity-time">${getRelativeTime(item.timestamp)}</span>
            </div>
          `).join('') : '<div class="empty">No activity yet. Start using ekkOS!</div>'}
        </div>
      </div>
    ` : '';

    // Golden Loop stats with fallback
    const loopStats = activity?.goldenLoop || { retrievals: 0, applications: 0, forged: 0, successRate: 0 };
    const usageStats = activity?.usage || {
      ekkos: { used: 0, limit: (config?.tier === 'enterprise' || config?.tier === 'team' || config?.tier === 'pro') ? -1 : 100 },
      crystallizations: { used: 0, limit: (config?.tier === 'enterprise' || config?.tier === 'team' || config?.tier === 'pro') ? -1 : 50 }
    };

    // Calculate usage percentages for tier enforcement
    const ekkosPercent = usageStats.ekkos.limit === -1 ? 0 : (usageStats.ekkos.used / usageStats.ekkos.limit) * 100;
    const crystallizePercent = usageStats.crystallizations.limit === -1 ? 0 : (usageStats.crystallizations.used / usageStats.crystallizations.limit) * 100;
    const ekkosStatus = ekkosPercent >= 100 ? 'exceeded' : ekkosPercent >= 80 ? 'warning' : 'normal';
    const crystallizeStatus = crystallizePercent >= 100 ? 'exceeded' : crystallizePercent >= 80 ? 'warning' : 'normal';
    const showUpgradeBanner = config?.tier === 'free' && (ekkosPercent >= 80 || crystallizePercent >= 80);
    const limitExceeded = config?.tier === 'free' && (ekkosPercent >= 100 || crystallizePercent >= 100);
    const activityFeed = activity?.activityFeed || [];

    const connectedHtml = config ? `
      <!-- Animated background -->
      <div class="bg-effects">
        <div class="gradient-orb orb-1"></div>
        <div class="gradient-orb orb-2"></div>
        <div class="particles">
          ${Array.from({length: 20}, (_, i) => `<div class="particle particle-${i % 5}"></div>`).join('')}
        </div>
      </div>

      <!-- Logo Header -->
      <div class="section logo-header">
        <div class="brand-logo">
          <img src="${brainIconUri}" width="48" height="48" alt="ekkOS Brain" style="filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.3));" />
          <div class="brand-text">
            <div class="brand-name">ekkOS_™</div>
            <div class="brand-tagline">Universal AI Memory Gateway</div>
          </div>
        </div>
      </div>

      <div class="section header-section">
        <div class="status-row">
          <div class="status connected">
            <span class="status-dot pulse"></span>
            <span class="status-text">Connected</span>
          </div>
          <div class="sync-status ${syncStatus.isStale ? 'stale' : ''} ${syncStatus.isError ? 'error' : ''}">
            <span class="sync-icon">${syncStatus.isError ? '⚠️' : syncStatus.isStale ? '🔄' : '✓'}</span>
            <span class="sync-text">${syncStatus.isStale ? (syncStatus.isError ? 'Offline' : 'Stale') : 'Synced'}</span>
            <span class="sync-time">${syncStatus.text}</span>
          </div>
        </div>
        <div class="user-card">
          <div class="user-avatar">${config.email.charAt(0).toUpperCase()}</div>
          <div class="user-details">
            <div class="user-email">${config.email}</div>
            <div class="user-tier tier-${config.tier}">
              <span class="tier-icon">${config.tier === 'enterprise' ? '👑' : config.tier === 'pro' ? '⭐' : config.tier === 'team' ? '🤝' : '🆓'}</span>
              ${TIER_NAMES[config.tier] || config.tier.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      <div class="section golden-loop-section">
        <div class="section-header">
          <h3>🔄 Golden Loop</h3>
          <button class="refresh-btn" onclick="refresh()" title="Refresh stats">↻</button>
        </div>
        <div class="loop-stats">
          <div class="stat stat-retrieve">
            <div class="stat-glow"></div>
            <span class="stat-icon">🔍</span>
            <span class="stat-value">${loopStats.retrievals.toLocaleString()}</span>
            <span class="stat-label">Retrieved</span>
          </div>
          <div class="stat stat-apply">
            <div class="stat-glow"></div>
            <span class="stat-icon">✨</span>
            <span class="stat-value">${loopStats.applications.toLocaleString()}</span>
            <span class="stat-label">Applied</span>
          </div>
          <div class="stat stat-forge">
            <div class="stat-glow"></div>
            <span class="stat-icon">🔥</span>
            <span class="stat-value">${loopStats.forged.toLocaleString()}</span>
            <span class="stat-label">Forged</span>
          </div>
          <div class="stat stat-success">
            <div class="stat-glow"></div>
            <span class="stat-icon">📈</span>
            <span class="stat-value">${loopStats.successRate}%</span>
            <span class="stat-label">Success</span>
          </div>
        </div>
      </div>

      <div class="section usage-section">
        <h3>📊 Usage This Month</h3>
        <div class="usage-card ${limitExceeded ? 'limit-exceeded' : ''}">
          <div class="usage-item ${ekkosStatus}">
            <div class="usage-header">
              <span class="usage-icon">🔮</span>
              <span class="usage-name">Memory Queries</span>
              <span class="usage-count ${ekkosStatus}">${usageStats.ekkos.used.toLocaleString()} / ${usageStats.ekkos.limit === -1 ? '∞' : usageStats.ekkos.limit.toLocaleString()}</span>
            </div>
            <div class="progress-track">
              <div class="progress-bar-fill ${ekkosStatus}" style="width: ${usageStats.ekkos.limit === -1 ? 5 : Math.min(100, (usageStats.ekkos.used / usageStats.ekkos.limit) * 100)}%">
                <div class="progress-shimmer"></div>
              </div>
            </div>
            ${ekkosStatus === 'exceeded' ? '<div class="limit-message">⚠️ Limit reached</div>' : ''}
          </div>
          <div class="usage-item ${crystallizeStatus}">
            <div class="usage-header">
              <span class="usage-icon">💎</span>
              <span class="usage-name">Crystallizations</span>
              <span class="usage-count ${crystallizeStatus}">${usageStats.crystallizations.used.toLocaleString()} / ${usageStats.crystallizations.limit === -1 ? '∞' : usageStats.crystallizations.limit.toLocaleString()}</span>
            </div>
            <div class="progress-track">
              <div class="progress-bar-fill crystallize ${crystallizeStatus}" style="width: ${usageStats.crystallizations.limit === -1 ? 5 : Math.min(100, (usageStats.crystallizations.used / usageStats.crystallizations.limit) * 100)}%">
                <div class="progress-shimmer"></div>
              </div>
            </div>
            ${crystallizeStatus === 'exceeded' ? '<div class="limit-message">⚠️ Limit reached</div>' : ''}
          </div>
        </div>
        ${showUpgradeBanner ? `
        <div class="upgrade-banner ${limitExceeded ? 'critical' : 'warning'}">
          <div class="upgrade-icon">${limitExceeded ? '🚫' : '⚠️'}</div>
          <div class="upgrade-content">
            <div class="upgrade-title">${limitExceeded ? 'Echo Tier Limit Reached' : 'Approaching Echo Tier Limit'}</div>
            <div class="upgrade-message">${limitExceeded
              ? 'Upgrade to Resonance for unlimited memory and pattern forging.'
              : Math.max(Math.round(ekkosPercent), Math.round(crystallizePercent)) + '% of Echo tier used. Upgrade to Resonance for more.'}</div>
          </div>
          <a href="https://platform.ekkos.dev/pricing" class="upgrade-btn">
            <span>Upgrade</span>
            <span class="upgrade-arrow">→</span>
          </a>
        </div>` : ''}
      </div>

      <div class="section activity-section">
        <h3>⚡ Recent Activity</h3>
        <div class="activity-card">
          ${activityFeed.length > 0 ? activityFeed.slice(0, 5).map((item: any) => `
            <div class="activity-item ${item.type}">
              <div class="activity-indicator"></div>
              <span class="activity-icon">${item.type === 'retrieve' ? '🔍' : item.type === 'apply' ? (item.success ? '✅' : '❌') : '💡'}</span>
              <span class="activity-message">${item.message.substring(0, 35)}${item.message.length > 35 ? '...' : ''}</span>
              <span class="activity-time">${getRelativeTime(item.timestamp)}</span>
            </div>
          `).join('') : `
            <div class="empty-state">
              <div class="empty-icon">🚀</div>
              <div class="empty-text">No activity yet</div>
              <div class="empty-hint">Start using ekkOS to see your patterns!</div>
            </div>
          `}
        </div>
      </div>

      <div class="section apikey-section">
        <h3>🔑 Your API Key</h3>
        <div class="apikey-card">
          <div class="apikey-display">
            <code class="apikey-value">${config.apiKey.substring(0, 8)}...${config.apiKey.substring(config.apiKey.length - 4)}</code>
            <button class="copy-btn" onclick="copyApiKey('${config.apiKey}')" title="Copy API Key">
              <span class="copy-icon">📋</span>
            </button>
          </div>
          <div class="apikey-hint">Use this key to configure Claude Code, Cursor, Codex, or Windsurf</div>
        </div>
      </div>

      <div class="section ide-section">
        <h3>🖥️ AI Agent Status</h3>
        <div class="ide-card">
          ${ideConfigs.map(ide => {
            const connStatus = getIdeConnectionStatus(ide.name);
            let statusClass = 'not-installed';
            let statusText = 'Not Found';
            let statusIcon = '○';

            if (!ide.exists) {
              statusClass = 'not-installed';
              statusText = 'Not Installed';
              statusIcon = '○';
            } else if (connStatus.status === 'connected') {
              statusClass = 'connected';
              statusText = 'Connected';
              statusIcon = '●';
            } else if (connStatus.status === 'error') {
              statusClass = 'error';
              statusText = 'Error';
              statusIcon = '⚠';
            } else if (connStatus.status === 'not-configured') {
              statusClass = 'not-configured';
              statusText = 'Not Configured';
              statusIcon = '◐';
            } else if (connStatus.status === 'checking') {
              statusClass = 'checking';
              statusText = 'Checking...';
              statusIcon = '◌';
            } else {
              statusClass = 'unknown';
              statusText = 'Click Deploy';
              statusIcon = '◐';
            }

            return '<div class="ide-row"><span class="ide-name">' + ide.name + '</span><span class="ide-badge ' + statusClass + '"><span class="status-icon">' + statusIcon + '</span> ' + statusText + '</span></div>';
          }).join('')}
        </div>
        <div class="ide-actions">
          <button class="btn btn-primary btn-glow" onclick="deployMcp()">
            <span class="btn-icon">🚀</span>
            Deploy MCP Config
          </button>
          <button class="btn btn-secondary" onclick="checkConnections()">
            <span class="btn-icon">🔄</span>
            Refresh Status
          </button>
        </div>
      </div>

      <div class="section setup-section">
        <div class="section-header">
          <h3>🔧 System Diagnostics</h3>
          <button class="refresh-btn" onclick="runDiagnostics()" title="Run full diagnostics">⚡</button>
        </div>
        <div class="diagnostic-grid">
          <div class="diagnostic-item ${setupStatus?.apiConnection?.status === 'connected' ? 'ok' : 'warn'}">
            <span class="diag-icon">${setupStatus?.apiConnection?.status === 'connected' ? '✅' : '⚠️'}</span>
            <span class="diag-label">API Connection</span>
            <span class="diag-value">${setupStatus?.apiConnection?.latency ? setupStatus.apiConnection.latency + 'ms' : (setupStatus?.apiConnection?.status || 'N/A')}</span>
          </div>
          <div class="diagnostic-item ${setupStatus?.globalHooks?.claudeMd?.hasEkkos ? 'ok' : 'warn'}">
            <span class="diag-icon">${setupStatus?.globalHooks?.claudeMd?.hasEkkos ? '✅' : '○'}</span>
            <span class="diag-label">Global CLAUDE.md</span>
            <span class="diag-value">${setupStatus?.globalHooks?.claudeMd?.hasEkkos ? 'Active' : 'Not Set'}</span>
          </div>
          <div class="diagnostic-item ${setupStatus?.globalHooks?.claudeDir?.hasHooks ? 'ok' : 'warn'}">
            <span class="diag-icon">${setupStatus?.globalHooks?.claudeDir?.hasHooks ? '✅' : '○'}</span>
            <span class="diag-label">Global Hooks (~/.claude/)</span>
            <span class="diag-value">${setupStatus?.globalHooks?.claudeDir?.hasHooks ? 'Active' : 'Not Set'}</span>
          </div>
          <div class="diagnostic-item ${setupStatus?.projectHooks?.claudeMd?.hasEkkos ? 'ok' : 'info'}">
            <span class="diag-icon">${setupStatus?.projectHooks?.claudeMd?.hasEkkos ? '✅' : '○'}</span>
            <span class="diag-label">Project CLAUDE.md</span>
            <span class="diag-value">${setupStatus?.projectHooks?.claudeMd?.hasEkkos ? 'Active' : 'Optional'}</span>
          </div>
          <div class="diagnostic-item ${setupStatus?.projectHooks?.claudeDir?.hasHooks ? 'ok' : 'info'}">
            <span class="diag-icon">${setupStatus?.projectHooks?.claudeDir?.hasHooks ? '✅' : '○'}</span>
            <span class="diag-label">Project Hooks (.claude/)</span>
            <span class="diag-value">${setupStatus?.projectHooks?.claudeDir?.hasHooks ? 'Active' : 'Optional'}</span>
          </div>
          <div class="diagnostic-item ${setupStatus?.globalHooks?.cursorrules?.hasEkkos ? 'ok' : 'info'}">
            <span class="diag-icon">${setupStatus?.globalHooks?.cursorrules?.hasEkkos ? '✅' : '○'}</span>
            <span class="diag-label">Cursor Rules</span>
            <span class="diag-value">${setupStatus?.globalHooks?.cursorrules?.hasEkkos ? 'Active' : 'Optional'}</span>
          </div>
        </div>
      </div>

      <div class="section actions-section">
        <h3>⚡ Quick Setup</h3>

        <div class="action-card action-card-primary" onclick="setupGlobal()">
          <div class="action-card-icon">🌐</div>
          <div class="action-card-content">
            <div class="action-card-title">Setup Global Hooks (Recommended)</div>
            <div class="action-card-desc">One-time setup - Claude Code hooks work for ALL projects automatically</div>
          </div>
          <div class="action-card-arrow">→</div>
        </div>

        <div class="action-card" onclick="setupProject()">
          <div class="action-card-icon">📁</div>
          <div class="action-card-content">
            <div class="action-card-title">Setup This Project</div>
            <div class="action-card-desc">Add Cursor rules + Claude hooks to current workspace (.cursor/ .claude/)</div>
          </div>
          <div class="action-card-arrow">→</div>
        </div>

        <div class="section-divider"></div>

        <h3>🛠️ Management</h3>

        <div class="action-card" onclick="deployInstructions()">
          <div class="action-card-icon">📝</div>
          <div class="action-card-content">
            <div class="action-card-title">Add CLAUDE.md to Project</div>
            <div class="action-card-desc">Creates CLAUDE.md with ekkOS memory instructions for this project</div>
          </div>
          <div class="action-card-arrow">→</div>
        </div>

        <div class="action-card" onclick="openDashboard()">
          <div class="action-card-icon">📊</div>
          <div class="action-card-content">
            <div class="action-card-title">Open Web Dashboard</div>
            <div class="action-card-desc">View patterns, manage settings, see learning analytics</div>
          </div>
          <div class="action-card-arrow">→</div>
        </div>

        <div class="action-card action-card-help" onclick="openDocs()">
          <div class="action-card-icon">📚</div>
          <div class="action-card-content">
            <div class="action-card-title">Documentation & Help</div>
            <div class="action-card-desc">Learn about Golden Loop, memory layers, and best practices</div>
          </div>
          <div class="action-card-arrow">→</div>
        </div>

        <div class="section-divider"></div>

        <button class="btn btn-ghost btn-disconnect" onclick="disconnect()">
          <span class="disconnect-icon">⏏️</span> Disconnect Account
        </button>
      </div>
    ` : `
      <!-- Animated background for welcome -->
      <div class="bg-effects welcome-bg">
        <div class="gradient-orb orb-1"></div>
        <div class="gradient-orb orb-2"></div>
        <div class="gradient-orb orb-3"></div>
        <div class="grid-overlay"></div>
      </div>

      <div class="section welcome">
        <div class="logo-container">
          <div class="logo-glow"></div>
          <img src="${brainIconUri}" width="64" height="64" alt="ekkOS Brain" style="margin-bottom: 12px; filter: drop-shadow(0 0 12px rgba(139, 92, 246, 0.4));" />
          <div class="logo-glow"></div>
          <div class="logo">ekkOS_™</div>
          <div class="logo-tagline">Universal AI Memory Gateway</div>
        </div>

        <div class="welcome-card">
          <h2>Connect Your IDE</h2>
          <p>Select your AI coding environment:</p>
          <div class="ide-grid">
            ${SUPPORTED_IDES.map(ide => `
              <button class="ide-btn" onclick="connectWithIde('${ide.id}')">
                <span class="ide-icon">${ide.icon}</span>
                <span class="ide-label">${ide.name}</span>
                <span class="ide-hover-effect"></span>
              </button>
            `).join('')}
          </div>
        </div>

        <div class="features-preview">
          <div class="feature">
            <span class="feature-icon">🔄</span>
            <span class="feature-text">Golden Loop Learning</span>
          </div>
          <div class="feature">
            <span class="feature-icon">🧠</span>
            <span class="feature-text">10-Layer Memory</span>
          </div>
          <div class="feature">
            <span class="feature-icon">🛡️</span>
            <span class="feature-text">Hallucination Firewall</span>
          </div>
        </div>

        <div class="welcome-actions">
          <button class="btn btn-primary btn-glow" onclick="openPlatform()" style="margin-bottom: 8px;">
            <span class="btn-icon">🌐</span>
            Open Platform (Login with Google)
          </button>
          <p class="hint">
            Or <a href="https://platform.ekkos.dev/signup">create a free account →</a>
          </p>
        </div>

        <div class="manual-apikey-section">
          <div class="divider-with-text">
            <span>or enter API key manually</span>
          </div>
          <div class="apikey-input-group">
            <input type="text" id="manualApiKey" placeholder="ekk_xxxxxxxx_xxxxx..." class="apikey-input" />
            <button class="btn btn-secondary" onclick="submitApiKey()">Connect</button>
          </div>
          <p class="hint apikey-hint">Get your API key from <a href="https://platform.ekkos.dev/dashboard/settings?tab=api-keys" target="_blank">platform settings</a></p>
        </div>
      </div>
    `;

    return `<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: var(--vscode-font-family);
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      padding: 12px;
      position: relative;
      overflow-x: hidden;
    }

    /* ============ Animated Background Effects ============ */
    .bg-effects {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 0;
      overflow: hidden;
    }
    .gradient-orb {
      position: absolute;
      border-radius: 50%;
      filter: blur(60px);
      opacity: 0.3;
      animation: float 20s ease-in-out infinite;
    }
    .orb-1 {
      width: 200px;
      height: 200px;
      background: linear-gradient(135deg, #06b6d4, #3b82f6);
      top: -50px;
      right: -50px;
      animation-delay: 0s;
    }
    .orb-2 {
      width: 150px;
      height: 150px;
      background: linear-gradient(135deg, #8b5cf6, #ec4899);
      bottom: 20%;
      left: -30px;
      animation-delay: -7s;
    }
    .orb-3 {
      width: 100px;
      height: 100px;
      background: linear-gradient(135deg, #10b981, #06b6d4);
      top: 40%;
      right: -20px;
      animation-delay: -14s;
    }
    @keyframes float {
      0%, 100% { transform: translate(0, 0) scale(1); }
      25% { transform: translate(20px, -20px) scale(1.1); }
      50% { transform: translate(-10px, 20px) scale(0.9); }
      75% { transform: translate(15px, 10px) scale(1.05); }
    }
    .particles {
      position: absolute;
      width: 100%;
      height: 100%;
    }
    .particle {
      position: absolute;
      width: 2px;
      height: 2px;
      background: rgba(139, 92, 246, 0.6);
      border-radius: 50%;
      animation: particle-float 15s linear infinite;
    }
    .particle-0 { left: 10%; animation-delay: 0s; }
    .particle-1 { left: 30%; animation-delay: -3s; }
    .particle-2 { left: 50%; animation-delay: -6s; }
    .particle-3 { left: 70%; animation-delay: -9s; }
    .particle-4 { left: 90%; animation-delay: -12s; }
    @keyframes particle-float {
      0% { transform: translateY(100vh) scale(0); opacity: 0; }
      10% { opacity: 1; }
      90% { opacity: 1; }
      100% { transform: translateY(-100vh) scale(1); opacity: 0; }
    }
    .grid-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image:
        linear-gradient(rgba(139, 92, 246, 0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(139, 92, 246, 0.03) 1px, transparent 1px);
      background-size: 30px 30px;
    }

    /* ============ Sections ============ */
    .section {
      margin-bottom: 16px;
      position: relative;
      z-index: 1;
    }
    .section h3 {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .section-header h3 { margin-bottom: 0; }
    .refresh-btn {
      background: transparent;
      border: 1px solid var(--vscode-widget-border);
      color: var(--vscode-foreground);
      width: 24px;
      height: 24px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }
    .refresh-btn:hover {
      background: rgba(139, 92, 246, 0.2);
      border-color: #8b5cf6;
    }

    /* ============ Header / User Card ============ */
    .header-section { margin-bottom: 20px; }
    .status {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
      margin-bottom: 10px;
    }
    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22c55e;
    }
    .status-dot.pulse {
      animation: pulse 2s ease-in-out infinite;
      box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
    }
    @keyframes pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
      50% { box-shadow: 0 0 0 8px rgba(34, 197, 94, 0); }
    }

    /* Sync status indicator */
    .status-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    .sync-status {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: rgba(255, 255, 255, 0.5);
      padding: 4px 8px;
      border-radius: 6px;
      background: rgba(34, 197, 94, 0.1);
    }
    .sync-status .sync-icon { font-size: 12px; }
    .sync-status .sync-text { font-weight: 500; color: rgba(34, 197, 94, 0.8); }
    .sync-status .sync-time { color: rgba(255, 255, 255, 0.4); }
    .sync-status.stale {
      background: rgba(251, 191, 36, 0.1);
    }
    .sync-status.stale .sync-text { color: rgba(251, 191, 36, 0.9); }
    .sync-status.error {
      background: rgba(239, 68, 68, 0.1);
    }
    .sync-status.error .sync-text { color: rgba(239, 68, 68, 0.9); }

    .user-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(139, 92, 246, 0.1));
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 10px;
      backdrop-filter: blur(10px);
    }
    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: linear-gradient(135deg, #06b6d4, #8b5cf6);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: 18px;
      color: white;
    }
    .user-details { flex: 1; }
    .user-email { font-size: 13px; font-weight: 500; margin-bottom: 4px; }
    .user-tier {
      font-size: 10px;
      padding: 3px 8px;
      border-radius: 6px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .tier-icon { font-size: 10px; }
    .tier-free { background: rgba(107, 114, 128, 0.2); color: #9ca3af; }
    .tier-pro { background: rgba(124, 58, 237, 0.2); color: #a78bfa; }
    .tier-team { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
    .tier-enterprise { background: rgba(236, 72, 153, 0.2); color: #f472b6; }

    /* ============ Golden Loop Stats ============ */
    .golden-loop-section { }
    .loop-stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    .stat {
      position: relative;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: 10px;
      padding: 12px 8px;
      text-align: center;
      overflow: hidden;
      transition: all 0.3s ease;
    }
    .stat:hover {
      border-color: rgba(139, 92, 246, 0.5);
      transform: translateY(-2px);
    }
    .stat-glow {
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: radial-gradient(circle, rgba(139, 92, 246, 0.1) 0%, transparent 70%);
      opacity: 0;
      transition: opacity 0.3s;
    }
    .stat:hover .stat-glow { opacity: 1; }
    .stat-retrieve:hover { border-color: rgba(6, 182, 212, 0.6); }
    .stat-apply:hover { border-color: rgba(234, 179, 8, 0.6); }
    .stat-forge:hover { border-color: rgba(239, 68, 68, 0.6); }
    .stat-success:hover { border-color: rgba(34, 197, 94, 0.6); }
    .stat-icon { font-size: 18px; display: block; margin-bottom: 4px; }
    .stat-value {
      font-size: 22px;
      font-weight: bold;
      display: block;
      background: linear-gradient(135deg, var(--vscode-foreground), var(--vscode-descriptionForeground));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .stat-label { font-size: 9px; color: var(--vscode-descriptionForeground); text-transform: uppercase; letter-spacing: 0.5px; }

    /* ============ Usage Section ============ */
    .usage-card {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: 10px;
      padding: 12px;
    }
    .usage-item { margin-bottom: 12px; }
    .usage-item:last-child { margin-bottom: 0; }
    .usage-header {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      margin-bottom: 6px;
    }
    .usage-icon { font-size: 12px; }
    .usage-name { flex: 1; color: var(--vscode-foreground); }
    .usage-count { color: var(--vscode-descriptionForeground); font-family: monospace; }
    .progress-track {
      height: 6px;
      background: rgba(107, 114, 128, 0.2);
      border-radius: 3px;
      overflow: hidden;
    }
    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #06b6d4, #8b5cf6);
      border-radius: 3px;
      position: relative;
      min-width: 4px;
      transition: width 0.5s ease;
    }
    .progress-bar-fill.crystallize {
      background: linear-gradient(90deg, #8b5cf6, #ec4899);
    }
    .progress-shimmer {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      animation: shimmer 2s infinite;
    }
    @keyframes shimmer {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }

    /* ============ Usage Warning/Exceeded States ============ */
    .progress-bar-fill.warning {
      background: linear-gradient(90deg, #f59e0b, #eab308) !important;
    }
    .progress-bar-fill.exceeded {
      background: linear-gradient(90deg, #ef4444, #dc2626) !important;
      animation: pulse-danger 1.5s ease-in-out infinite;
    }
    .usage-count.warning { color: #f59e0b !important; font-weight: 600; }
    .usage-count.exceeded { color: #ef4444 !important; font-weight: 700; }
    .usage-card.limit-exceeded {
      border-color: rgba(239, 68, 68, 0.5) !important;
      box-shadow: 0 0 12px rgba(239, 68, 68, 0.2);
    }
    .limit-message {
      font-size: 10px;
      color: #ef4444;
      margin-top: 4px;
      font-weight: 500;
    }
    @keyframes pulse-danger {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    /* ============ Upgrade Banner ============ */
    .upgrade-banner {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 12px;
      border-radius: 10px;
      margin-top: 12px;
      border: 1px solid;
    }
    .upgrade-banner.warning {
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(234, 179, 8, 0.05));
      border-color: rgba(245, 158, 11, 0.3);
    }
    .upgrade-banner.critical {
      background: linear-gradient(135deg, rgba(239, 68, 68, 0.15), rgba(220, 38, 38, 0.05));
      border-color: rgba(239, 68, 68, 0.4);
      animation: border-pulse 2s ease-in-out infinite;
    }
    @keyframes border-pulse {
      0%, 100% { border-color: rgba(239, 68, 68, 0.4); }
      50% { border-color: rgba(239, 68, 68, 0.7); }
    }
    .upgrade-icon { font-size: 20px; flex-shrink: 0; }
    .upgrade-content { flex: 1; min-width: 0; }
    .upgrade-title {
      font-size: 11px;
      font-weight: 600;
      color: var(--vscode-foreground);
      margin-bottom: 2px;
    }
    .upgrade-banner.warning .upgrade-title { color: #f59e0b; }
    .upgrade-banner.critical .upgrade-title { color: #ef4444; }
    .upgrade-message {
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      line-height: 1.3;
    }
    .upgrade-btn {
      display: flex;
      align-items: center;
      gap: 4px;
      background: linear-gradient(135deg, #8b5cf6, #6366f1);
      color: white;
      padding: 8px 14px;
      border-radius: 6px;
      text-decoration: none;
      font-size: 11px;
      font-weight: 600;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    .upgrade-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
    }
    .upgrade-arrow { transition: transform 0.2s; }
    .upgrade-btn:hover .upgrade-arrow { transform: translateX(2px); }

    /* ============ Activity Section ============ */
    .activity-card {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: 10px;
      padding: 8px;
    }
    .activity-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      border-radius: 6px;
      font-size: 11px;
      transition: background 0.2s;
      position: relative;
    }
    .activity-item:hover { background: rgba(139, 92, 246, 0.1); }
    .activity-indicator {
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 60%;
      border-radius: 2px;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .activity-item:hover .activity-indicator { opacity: 1; }
    .activity-item.retrieve .activity-indicator { background: #06b6d4; }
    .activity-item.apply .activity-indicator { background: #22c55e; }
    .activity-item.forge .activity-indicator { background: #f59e0b; }
    .activity-icon { font-size: 12px; flex-shrink: 0; }
    .activity-message { flex: 1; color: var(--vscode-foreground); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .activity-time { font-size: 9px; color: var(--vscode-descriptionForeground); flex-shrink: 0; }
    .empty-state {
      text-align: center;
      padding: 20px 10px;
    }
    .empty-icon { font-size: 24px; margin-bottom: 8px; }
    .empty-text { font-size: 12px; font-weight: 500; margin-bottom: 4px; }
    .empty-hint { font-size: 10px; color: var(--vscode-descriptionForeground); }

    /* ============ API Key Section ============ */
    .apikey-card {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: 10px;
      padding: 12px;
    }
    .apikey-display {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .apikey-value {
      flex: 1;
      font-family: monospace;
      font-size: 12px;
      background: rgba(139, 92, 246, 0.1);
      padding: 8px 12px;
      border-radius: 6px;
      border: 1px solid rgba(139, 92, 246, 0.2);
    }
    .copy-btn {
      background: linear-gradient(135deg, #06b6d4, #8b5cf6);
      border: none;
      color: white;
      padding: 8px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      transition: all 0.2s;
    }
    .copy-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
    }
    .apikey-hint {
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
    }

    /* ============ IDE Section ============ */
    .ide-card {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: 10px;
      padding: 8px 12px;
      margin-bottom: 10px;
    }
    .ide-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid var(--vscode-widget-border);
    }
    .ide-row:last-child { border-bottom: none; }
    .ide-name { font-size: 12px; }
    .ide-badge {
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 4px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .ide-badge .status-icon { font-size: 8px; }
    .ide-badge.connected { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
    .ide-badge.error { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
    .ide-badge.not-configured { background: rgba(234, 179, 8, 0.15); color: #eab308; }
    .ide-badge.checking { background: rgba(6, 182, 212, 0.15); color: #06b6d4; }
    .ide-badge.not-installed { background: rgba(107, 114, 128, 0.15); color: #6b7280; }
    .ide-badge.unknown { background: rgba(107, 114, 128, 0.15); color: #6b7280; }
    .ide-actions {
      display: flex;
      gap: 8px;
    }
    .ide-actions .btn {
      flex: 1;
    }
    .btn-secondary {
      background: var(--vscode-editor-background);
      color: var(--vscode-foreground);
      border: 1px solid var(--vscode-widget-border);
    }
    .btn-secondary:hover {
      border-color: rgba(139, 92, 246, 0.5);
      background: rgba(139, 92, 246, 0.1);
    }

    /* ============ Setup Diagnostics Section ============ */
    .setup-section {
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(6, 182, 212, 0.05));
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 12px;
    }
    .diagnostic-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .diagnostic-item {
      display: flex;
      flex-direction: column;
      padding: 10px;
      background: var(--vscode-editor-background);
      border-radius: 8px;
      border: 1px solid var(--vscode-widget-border);
      transition: all 0.2s;
    }
    .diagnostic-item.ok {
      border-color: rgba(34, 197, 94, 0.3);
      background: rgba(34, 197, 94, 0.05);
    }
    .diagnostic-item.warn {
      border-color: rgba(234, 179, 8, 0.3);
      background: rgba(234, 179, 8, 0.05);
    }
    .diagnostic-item.info {
      border-color: rgba(107, 114, 128, 0.3);
    }
    .diag-icon {
      font-size: 14px;
      margin-bottom: 4px;
    }
    .diag-label {
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 2px;
    }
    .diag-value {
      font-size: 11px;
      font-weight: 500;
    }

    /* ============ Actions Section - Redesigned Cards ============ */
    .action-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-bottom: 8px;
    }
    .action-card:hover {
      border-color: rgba(139, 92, 246, 0.5);
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(6, 182, 212, 0.08));
      transform: translateX(4px);
      box-shadow: 0 2px 8px rgba(139, 92, 246, 0.15);
    }
    .action-card-icon {
      font-size: 24px;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(6, 182, 212, 0.15));
      border-radius: 10px;
      flex-shrink: 0;
    }
    .action-card-content {
      flex: 1;
      min-width: 0;
    }
    .action-card-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--vscode-foreground);
      margin-bottom: 2px;
    }
    .action-card-desc {
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      line-height: 1.3;
      opacity: 0.8;
    }
    .action-card-arrow {
      font-size: 14px;
      color: var(--vscode-descriptionForeground);
      opacity: 0;
      transform: translateX(-4px);
      transition: all 0.2s;
    }
    .action-card:hover .action-card-arrow {
      opacity: 1;
      transform: translateX(0);
      color: #8b5cf6;
    }
    .action-card-primary {
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(6, 182, 212, 0.1));
      border-color: rgba(139, 92, 246, 0.4);
      position: relative;
      overflow: hidden;
    }
    .action-card-primary::before {
      content: 'RECOMMENDED';
      position: absolute;
      top: 6px;
      right: 6px;
      font-size: 8px;
      font-weight: 600;
      letter-spacing: 0.5px;
      padding: 2px 6px;
      background: linear-gradient(135deg, #8b5cf6, #06b6d4);
      color: white;
      border-radius: 4px;
    }
    .action-card-primary:hover {
      border-color: #8b5cf6;
      box-shadow: 0 4px 16px rgba(139, 92, 246, 0.25);
    }
    .action-card-help {
      background: linear-gradient(135deg, rgba(6, 182, 212, 0.05), rgba(139, 92, 246, 0.05));
    }
    .section-divider {
      height: 1px;
      background: var(--vscode-widget-border);
      margin: 16px 0;
      opacity: 0.5;
    }
    .disconnect-icon {
      font-size: 12px;
    }

    /* ============ Buttons ============ */
    .btn {
      width: 100%;
      padding: 10px 16px;
      border: none;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      margin-bottom: 8px;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    .btn:hover { transform: translateY(-1px); }
    .btn-primary {
      background: linear-gradient(135deg, #06b6d4, #8b5cf6);
      color: white;
      box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
    }
    .btn-primary:hover {
      box-shadow: 0 6px 20px rgba(139, 92, 246, 0.4);
    }
    .btn-glow {
      position: relative;
      overflow: hidden;
    }
    .btn-glow::after {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
      transform: rotate(45deg);
      animation: btn-shine 3s infinite;
    }
    @keyframes btn-shine {
      0% { transform: translateX(-100%) rotate(45deg); }
      100% { transform: translateX(100%) rotate(45deg); }
    }
    .btn-icon { font-size: 14px; }
    .btn-ghost {
      background: transparent;
      color: var(--vscode-descriptionForeground);
      border: 1px solid var(--vscode-widget-border);
    }
    .btn-ghost:hover { color: #ef4444; border-color: rgba(239, 68, 68, 0.5); }
    .btn-disconnect { margin-top: 4px; }

    /* ============ Welcome Screen ============ */
    .welcome {
      text-align: center;
      padding: 20px 0;
      position: relative;
      z-index: 1;
    }

    /* Logo Header (Connected State) */
    .logo-header {
      text-align: center;
      padding: 16px 0 24px;
      position: relative;
      z-index: 1;
      border-bottom: 1px solid rgba(139, 92, 246, 0.1);
      margin-bottom: 16px;
    }
    .brand-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
    }
    .brand-text {
      text-align: left;
    }
    .brand-name {
      font-size: 24px;
      font-weight: bold;
      background: linear-gradient(135deg, #06b6d4, #8b5cf6);
      background-size: 200% 200%;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: gradient-shift 5s ease infinite;
      line-height: 1.2;
    }
    .brand-tagline {
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-top: 2px;
    }

    .logo-container {
      margin-bottom: 24px;
      position: relative;
    }
    .logo-glow {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 100px;
      height: 100px;
      background: radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%);
      filter: blur(20px);
      animation: logo-pulse 3s ease-in-out infinite;
    }
    @keyframes logo-pulse {
      0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
      50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      background: linear-gradient(135deg, #06b6d4, #8b5cf6, #ec4899);
      background-size: 200% 200%;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: gradient-shift 5s ease infinite;
      position: relative;
    }
    @keyframes gradient-shift {
      0%, 100% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
    }
    .logo-tagline {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      margin-top: 4px;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .welcome-card {
      background: rgba(139, 92, 246, 0.05);
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
      backdrop-filter: blur(10px);
    }
    .welcome-card h2 {
      font-size: 16px;
      margin-bottom: 8px;
    }
    .welcome-card p {
      font-size: 12px;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 16px;
    }
    .features-preview {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 20px;
    }
    .feature {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 11px;
      padding: 8px 12px;
      background: rgba(139, 92, 246, 0.05);
      border-radius: 6px;
    }
    .feature-icon { font-size: 14px; }
    .feature-text { color: var(--vscode-foreground); }

    /* ============ IDE Grid (Welcome) ============ */
    .ide-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    .ide-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 14px 8px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
      overflow: hidden;
    }
    .ide-btn:hover {
      border-color: #8b5cf6;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.2);
    }
    .ide-hover-effect {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(139, 92, 246, 0.1));
      opacity: 0;
      transition: opacity 0.3s;
    }
    .ide-btn:hover .ide-hover-effect { opacity: 1; }
    .ide-icon { font-size: 24px; position: relative; z-index: 1; }
    .ide-label { font-size: 11px; color: var(--vscode-foreground); position: relative; z-index: 1; }

    .hint {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
    }
    .hint a {
      color: #8b5cf6;
      text-decoration: none;
      font-weight: 500;
    }
    .hint a:hover { text-decoration: underline; }
    .welcome-actions {
      margin-top: 20px;
      text-align: center;
    }

    /* Manual API Key Entry */
    .manual-apikey-section {
      margin-top: 24px;
      padding-top: 16px;
    }
    .divider-with-text {
      display: flex;
      align-items: center;
      text-align: center;
      margin-bottom: 16px;
    }
    .divider-with-text::before,
    .divider-with-text::after {
      content: '';
      flex: 1;
      border-bottom: 1px solid var(--vscode-widget-border);
    }
    .divider-with-text span {
      padding: 0 12px;
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .apikey-input-group {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
    }
    .apikey-input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid var(--vscode-widget-border);
      border-radius: 6px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      font-family: monospace;
      font-size: 11px;
    }
    .apikey-input:focus {
      outline: none;
      border-color: #8b5cf6;
      box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.2);
    }
    .apikey-input::placeholder {
      color: var(--vscode-input-placeholderForeground);
    }
    .apikey-hint {
      text-align: center;
      margin-top: 8px;
    }
  </style>
</head>
<body>
  ${connectedHtml}
  <script>
    const vscode = acquireVsCodeApi();
    function connect() { vscode.postMessage({ command: 'connect' }); }
    function connectWithIde(ideId) { vscode.postMessage({ command: 'connectWithIde', ideId }); }
    function disconnect() { vscode.postMessage({ command: 'disconnect' }); }
    function openPlatform() { vscode.postMessage({ command: 'openPlatform' }); }
    function deployMcp() { vscode.postMessage({ command: 'deployMcp' }); }
    function deployInstructions() { vscode.postMessage({ command: 'deployInstructions' }); }
    function openDashboard() { vscode.postMessage({ command: 'openDashboard' }); }
    function openDocs() { vscode.postMessage({ command: 'openDocs' }); }
    function openExternal(url) { vscode.postMessage({ command: 'openExternal', url }); }
    function refresh() { vscode.postMessage({ command: 'refresh' }); }
    function setupGlobal() { vscode.postMessage({ command: 'setupGlobal' }); }
    function setupProject() { vscode.postMessage({ command: 'setupRules' }); }
    function copyApiKey(key) {
      navigator.clipboard.writeText(key).then(() => {
        vscode.postMessage({ command: 'showMessage', text: 'API key copied to clipboard!' });
      }).catch(() => {
        vscode.postMessage({ command: 'showMessage', text: 'Failed to copy API key' });
      });
    }
    function checkConnections() { vscode.postMessage({ command: 'checkConnections' }); }
    function runDiagnostics() { vscode.postMessage({ command: 'runDiagnostics' }); }
    function submitApiKey() {
      const input = document.getElementById('manualApiKey');
      const apiKey = input ? input.value.trim() : '';
      if (!apiKey) {
        vscode.postMessage({ command: 'showMessage', text: 'Please enter an API key' });
        return;
      }
      if (!apiKey.startsWith('ekk_')) {
        vscode.postMessage({ command: 'showMessage', text: 'Invalid API key format. Should start with ekk_' });
        return;
      }
      vscode.postMessage({ command: 'manualApiKey', apiKey });
    }
  </script>
  <!-- SVG Gradient Definition -->
  <svg style="width: 0; height: 0; position: absolute;">
    <defs>
      <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:#8b5cf6;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#06b6d4;stop-opacity:1" />
      </linearGradient>
    </defs>
  </svg>
</body>
</html>`;
  }
}

// ============ Utilities ============

function generateRandomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function getRelativeTime(timestamp: string): string {
  const now = new Date();
  const then = new Date(timestamp);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return 'now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

function getSyncStatus(): { text: string; isStale: boolean; isError: boolean } {
  if (lastSyncError) {
    return { text: lastSyncError, isStale: true, isError: true };
  }
  if (!lastSuccessfulSync) {
    return { text: 'Not synced yet', isStale: true, isError: false };
  }

  const now = new Date();
  const seconds = Math.floor((now.getTime() - lastSuccessfulSync.getTime()) / 1000);

  // Consider stale if > 2 minutes since last sync
  const isStale = seconds > 120;

  let text: string;
  if (seconds < 10) {
    text = 'Just now';
  } else if (seconds < 60) {
    text = `${seconds}s ago`;
  } else if (seconds < 3600) {
    text = `${Math.floor(seconds / 60)}m ago`;
  } else {
    text = `${Math.floor(seconds / 3600)}h ago`;
  }

  return { text, isStale, isError: false };
}

// ============ Rules Auto-Setup ============

/**
 * Check if rules need to be set up and prompt user
 */
async function checkAndSetupRules(context: vscode.ExtensionContext) {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    return; // No workspace open
  }

  const rulesPath = path.join(workspaceFolder.uri.fsPath, '.cursor', 'rules');
  const ekkosRuleExists = fs.existsSync(path.join(rulesPath, '30-ekkos-core.mdc'));
  
  // Check if user previously declined for this workspace
  const disabledMarker = path.join(workspaceFolder.uri.fsPath, '.cursor', '.ekkos-disabled');
  if (fs.existsSync(disabledMarker)) {
    return; // User previously said "Never for this project"
  }

  // Check if global hooks are already set up
  const globalHooksExist = fs.existsSync(path.join(os.homedir(), '.claude', 'hooks', 'user-prompt-submit.sh'));

  if (!ekkosRuleExists) {
    // First time in this workspace - offer setup options
    const selection = await vscode.window.showInformationMessage(
      '🧠 Set up ekkOS™ memory integration?\n\n' +
      (globalHooksExist ? 'Global Claude hooks are active. Add Cursor rules for this project?' :
        'Choose Global (one-time for all projects) or Per-Project setup.'),
      globalHooksExist ? 'Add Project Rules' : 'Global Setup (Recommended)',
      globalHooksExist ? 'Skip' : 'This Project Only',
      'Never for this project'
    );

    if (selection === 'Global Setup (Recommended)') {
      await setupGlobalHooks(context);
      // Also set up project rules for Cursor
      await setupRules(context, workspaceFolder.uri.fsPath);
    } else if (selection === 'This Project Only' || selection === 'Add Project Rules') {
      await setupRules(context, workspaceFolder.uri.fsPath);
    } else if (selection === 'Never for this project') {
      // Create marker file
      const cursorDir = path.join(workspaceFolder.uri.fsPath, '.cursor');
      if (!fs.existsSync(cursorDir)) {
        fs.mkdirSync(cursorDir, { recursive: true });
      }
      fs.writeFileSync(disabledMarker, 'User declined ekkOS setup');
    }
  }
}

/**
 * Setup ekkOS rules and hooks in workspace
 */
async function setupRules(context: vscode.ExtensionContext, workspaceRoot: string): Promise<boolean> {
  const rulesDir = path.join(workspaceRoot, '.cursor', 'rules');
  const cursorHooksDir = path.join(workspaceRoot, '.cursor', 'hooks');
  const claudeHooksDir = path.join(workspaceRoot, '.claude', 'hooks');
  const claudeHooksLibDir = path.join(claudeHooksDir, 'lib');

  try {
    // Create directories
    if (!fs.existsSync(rulesDir)) {
      fs.mkdirSync(rulesDir, { recursive: true });
    }
    if (!fs.existsSync(cursorHooksDir)) {
      fs.mkdirSync(cursorHooksDir, { recursive: true });
    }
    if (!fs.existsSync(claudeHooksLibDir)) {
      fs.mkdirSync(claudeHooksLibDir, { recursive: true });
    }

    const extensionPath = context.extensionPath;

    // ========== CURSOR RULES ==========
    const ruleTemplates = [
      '00-hooks-contract.mdc',
      '30-ekkos-core.mdc',
      '31-ekkos-messages.mdc'
    ];

    for (const template of ruleTemplates) {
      const source = path.join(extensionPath, 'templates', 'rules', template);
      const dest = path.join(rulesDir, template);

      if (fs.existsSync(source)) {
        fs.copyFileSync(source, dest);
        console.log(`✓ Created rule: ${template}`);
      }
    }

    // ========== CURSOR HOOKS (v1.7+) ==========
    const cursorHookSource = path.join(extensionPath, 'templates', 'cursor-hooks', 'before-submit-prompt.sh');
    const cursorHookDest = path.join(cursorHooksDir, 'before-submit-prompt.sh');
    if (fs.existsSync(cursorHookSource)) {
      fs.copyFileSync(cursorHookSource, cursorHookDest);
      fs.chmodSync(cursorHookDest, 0o755);
      console.log(`✓ Created Cursor hook: before-submit-prompt.sh`);
    }

    // Create .cursor/hooks.json for Cursor 1.7+
    const cursorHooksJsonPath = path.join(workspaceRoot, '.cursor', 'hooks.json');
    if (!fs.existsSync(cursorHooksJsonPath)) {
      const cursorHooksConfig = {
        version: 1,
        hooks: {
          beforeSubmitPrompt: [
            { command: "./.cursor/hooks/before-submit-prompt.sh" }
          ]
        }
      };
      fs.writeFileSync(cursorHooksJsonPath, JSON.stringify(cursorHooksConfig, null, 2));
      console.log(`✓ Created Cursor hooks.json`);
    }

    // ========== CLAUDE CODE HOOKS ==========
    const claudeHookTemplates = ['user-prompt-submit.sh', 'stop.sh'];

    for (const template of claudeHookTemplates) {
      const source = path.join(extensionPath, 'templates', 'hooks', template);
      const dest = path.join(claudeHooksDir, template);

      if (fs.existsSync(source)) {
        fs.copyFileSync(source, dest);
        fs.chmodSync(dest, 0o755);
        console.log(`✓ Created Claude hook: ${template}`);
      }
    }

    // Copy Claude hook library
    const libSource = path.join(extensionPath, 'templates', 'hooks', 'lib', 'state.sh');
    const libDest = path.join(claudeHooksLibDir, 'state.sh');
    if (fs.existsSync(libSource)) {
      fs.copyFileSync(libSource, libDest);
      fs.chmodSync(libDest, 0o755);
      console.log(`✓ Created Claude hook lib: state.sh`);
    }

    // Create .claude/settings.json with ABSOLUTE paths (relative paths fail when cwd differs)
    const claudeSettingsPath = path.join(workspaceRoot, '.claude', 'settings.json');
    if (!fs.existsSync(claudeSettingsPath)) {
      const claudeSettings = {
        hooks: {
          "user-prompt-submit": [{ matcher: "", hooks: [path.join(workspaceRoot, '.claude', 'hooks', 'user-prompt-submit.sh')] }],
          "stop": [{ matcher: "", hooks: [path.join(workspaceRoot, '.claude', 'hooks', 'stop.sh')] }]
        }
      };
      fs.writeFileSync(claudeSettingsPath, JSON.stringify(claudeSettings, null, 2));
      console.log(`✓ Created Claude Code settings`);
    }

    // ========== CLAUDE.md (Project Instructions) ==========
    const claudeMdSource = path.join(extensionPath, 'templates', 'CLAUDE.md');
    const claudeMdDest = path.join(workspaceRoot, 'CLAUDE.md');
    if (fs.existsSync(claudeMdSource) && !fs.existsSync(claudeMdDest)) {
      fs.copyFileSync(claudeMdSource, claudeMdDest);
      console.log(`✓ Created CLAUDE.md (project instructions)`);
    }

    // Show success message
    const selection = await vscode.window.showInformationMessage(
      '✅ ekkOS™ installed!\n\n' +
      'Installed:\n' +
      '• Cursor rules + hooks (.cursor/)\n' +
      '• Claude Code hooks (.claude/)\n\n' +
      'Golden Loop is now AUTOMATIC in both IDEs!',
      'View Rules', 'View Cursor Hook', 'View Claude Hook', 'Dismiss'
    );

    if (selection === 'View Rules') {
      const uri = vscode.Uri.file(path.join(rulesDir, '30-ekkos-core.mdc'));
      await vscode.commands.executeCommand('vscode.open', uri);
    } else if (selection === 'View Cursor Hook') {
      const uri = vscode.Uri.file(cursorHookDest);
      await vscode.commands.executeCommand('vscode.open', uri);
    } else if (selection === 'View Claude Hook') {
      const uri = vscode.Uri.file(path.join(claudeHooksDir, 'user-prompt-submit.sh'));
      await vscode.commands.executeCommand('vscode.open', uri);
    }

    return true;
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to setup ekkOS: ${(error as Error).message}`);
    console.error('ekkOS setup error:', error);
    return false;
  }
}

/**
 * Command: Setup rules manually (per-project)
 */
async function setupRulesCommand(context: vscode.ExtensionContext): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showWarningMessage('Please open a workspace first');
    return;
  }

  const success = await setupRules(context, workspaceFolder.uri.fsPath);
  if (!success) {
    vscode.window.showErrorMessage('Failed to setup ekkOS rules. Check the output for details.');
  }
}

/**
 * Command: Setup GLOBAL hooks (one-time, works for all projects)
 */
async function setupGlobalHooksCommand(context: vscode.ExtensionContext): Promise<void> {
  const success = await setupGlobalHooks(context);
  if (!success) {
    vscode.window.showErrorMessage('Failed to setup global hooks. Check the output for details.');
  }
}

/**
 * Check if required dependencies (jq, curl) are installed
 */
async function checkDependencies(): Promise<{ jq: boolean; curl: boolean }> {
  const { exec } = require('child_process');
  const checkCmd = (cmd: string): Promise<boolean> => new Promise((resolve) => {
    const checkCommand = process.platform === 'win32' ? `where ${cmd}` : `which ${cmd}`;
    exec(checkCommand, (err: Error | null) => resolve(!err));
  });
  return { jq: await checkCmd('jq'), curl: await checkCmd('curl') };
}

/**
 * Setup GLOBAL hooks - Claude Code and Cursor (one-time setup)
 * This makes ekkOS work automatically for ALL projects without per-project setup
 */
async function setupGlobalHooks(context: vscode.ExtensionContext): Promise<boolean> {
  // Check dependencies first
  const deps = await checkDependencies();
  if (!deps.jq || !deps.curl) {
    const missing: string[] = [];
    if (!deps.jq) missing.push('jq');
    if (!deps.curl) missing.push('curl');

    const installInstructions = process.platform === 'darwin'
      ? `brew install ${missing.join(' ')}`
      : process.platform === 'win32'
        ? `choco install ${missing.join(' ')} (or download from https://stedolan.github.io/jq/)`
        : `sudo apt install ${missing.join(' ')}`;

    vscode.window.showErrorMessage(
      `ekkOS hooks require ${missing.join(' and ')} to work.\n\nInstall with: ${installInstructions}`,
      'Copy Install Command'
    ).then(selection => {
      if (selection === 'Copy Install Command') {
        vscode.env.clipboard.writeText(installInstructions);
        vscode.window.showInformationMessage('Install command copied to clipboard!');
      }
    });
    return false;
  }

  const homeDir = os.homedir();
  const extensionPath = context.extensionPath;

  // Global Claude Code hooks: ~/.claude/hooks/
  const globalClaudeHooksDir = path.join(homeDir, '.claude', 'hooks');
  const globalClaudeLibDir = path.join(globalClaudeHooksDir, 'lib');

  // Global Claude settings: ~/.claude/settings.json
  const globalClaudeSettingsPath = path.join(homeDir, '.claude', 'settings.json');

  try {
    // Create directories
    if (!fs.existsSync(globalClaudeLibDir)) {
      fs.mkdirSync(globalClaudeLibDir, { recursive: true });
    }

    // Copy Claude Code hooks
    const claudeHookTemplates = ['user-prompt-submit.sh', 'stop.sh'];
    for (const template of claudeHookTemplates) {
      const source = path.join(extensionPath, 'templates', 'hooks', template);
      const dest = path.join(globalClaudeHooksDir, template);

      if (fs.existsSync(source)) {
        fs.copyFileSync(source, dest);
        fs.chmodSync(dest, 0o755);
        console.log(`✓ Created global Claude hook: ${template}`);
      }
    }

    // Copy lib/state.sh
    const libSource = path.join(extensionPath, 'templates', 'hooks', 'lib', 'state.sh');
    const libDest = path.join(globalClaudeLibDir, 'state.sh');
    if (fs.existsSync(libSource)) {
      fs.copyFileSync(libSource, libDest);
      fs.chmodSync(libDest, 0o755);
      console.log(`✓ Created global Claude hook lib: state.sh`);
    }

    // Create/update global Claude settings
    let claudeSettings: any = {};
    if (fs.existsSync(globalClaudeSettingsPath)) {
      try {
        claudeSettings = JSON.parse(fs.readFileSync(globalClaudeSettingsPath, 'utf8'));
      } catch { /* Use empty */ }
    }

    // Use absolute paths - tilde (~) doesn't expand in all contexts
    const homeDir = os.homedir();
    claudeSettings.hooks = {
      ...claudeSettings.hooks,
      "user-prompt-submit": [{ matcher: "", hooks: [path.join(homeDir, '.claude', 'hooks', 'user-prompt-submit.sh')] }],
      "stop": [{ matcher: "", hooks: [path.join(homeDir, '.claude', 'hooks', 'stop.sh')] }]
    };
    fs.writeFileSync(globalClaudeSettingsPath, JSON.stringify(claudeSettings, null, 2));
    console.log(`✓ Updated global Claude settings`);

    // Show success message
    const selection = await vscode.window.showInformationMessage(
      '✅ ekkOS™ Global Hooks Installed!\n\n' +
      'Claude Code hooks are now active for ALL projects.\n' +
      'No per-project setup needed!\n\n' +
      'Note: Cursor still requires per-project rules (.cursor/rules/).',
      'Open Claude Settings', 'Dismiss'
    );

    if (selection === 'Open Claude Settings') {
      const uri = vscode.Uri.file(globalClaudeSettingsPath);
      await vscode.commands.executeCommand('vscode.open', uri);
    }

    return true;
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to setup global hooks: ${(error as Error).message}`);
    console.error('Global hooks setup error:', error);
    return false;
  }
}

export function deactivate() {
  statusBarItem?.dispose();
  stopActivityPolling();
}
