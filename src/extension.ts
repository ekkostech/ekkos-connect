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
import { SessionContextPanel } from './session-context-panel';

// Types
// Public config stored in ~/.ekkos/config.json (non-sensitive)
interface ContextGuardianConfig {
  enabled: boolean;
  autoPreserve: boolean;
  autoRestore: boolean;
  silentRestore: boolean;
  tokenThreshold: number;  // 0.0 - 1.0 (default 0.90)
  maxCompactions: number;  // Circuit breaker limit (default 5)
  cooldownMs: number;      // Cooldown between compactions (default 60000)
}

interface EkkosPublicConfig {
  userId: string;
  email: string;
  tier: 'free' | 'pro' | 'team' | 'enterprise';
  createdAt: string;
  patternScope?: 'both' | 'personal' | 'collective';
  contextGuardian?: ContextGuardianConfig;
}

// Full config including secrets (runtime only, secrets from SecretStorage)
interface EkkosConfig extends EkkosPublicConfig {
  token: string;   // From SecretStorage
  apiKey: string;  // From SecretStorage
}

// Secret keys for SecretStorage
const SECRET_KEY_TOKEN = 'ekkos.token';
const SECRET_KEY_API_KEY = 'ekkos.apiKey';

// Global extension context reference for SecretStorage access
let extensionContext: vscode.ExtensionContext | null = null;

// Output channel for logs visible in VS Code Output panel
let outputChannel: vscode.OutputChannel;

/**
 * Log to both console and output channel
 */
function log(message: string, ...args: any[]): void {
  const formatted = args.length > 0 ? `${message} ${args.map(a => JSON.stringify(a)).join(' ')}` : message;
  console.log(formatted);
  outputChannel?.appendLine(formatted);
}

/**
 * Log error to both console and output channel
 */
function logError(message: string, error?: any): void {
  const errorMsg = error ? `${message} ${error?.message || error}` : message;
  console.error(errorMsg);
  outputChannel?.appendLine(`[ERROR] ${errorMsg}`);
}

// ============ Platform Detection & Cross-OS Support ============

type Platform = 'macos' | 'windows' | 'linux';

/**
 * Detect the current operating system
 */
function detectPlatform(): Platform {
  switch (process.platform) {
    case 'darwin': return 'macos';
    case 'win32': return 'windows';
    default: return 'linux';
  }
}

/**
 * Get platform display name for UI
 */
function getPlatformDisplayName(): string {
  const platform = detectPlatform();
  switch (platform) {
    case 'macos': return 'macOS';
    case 'windows': return 'Windows';
    case 'linux': return 'Linux';
  }
}

/**
 * Get the Claude Code configuration directory
 * - macOS/Linux: ~/.claude/
 * - Windows: %USERPROFILE%\.claude\
 */
function getClaudeDir(): string {
  return path.join(os.homedir(), '.claude');
}

/**
 * Get the Claude Code MCP config file path
 * - All platforms: ~/.claude.json (in home directory)
 */
function getClaudeMcpConfigPath(): string {
  return path.join(os.homedir(), '.claude.json');
}

/**
 * Get the appropriate hook file extension for the current platform
 * - macOS/Linux: .sh (bash)
 * - Windows: .ps1 (PowerShell)
 */
function getHookExtension(): string {
  return detectPlatform() === 'windows' ? '.ps1' : '.sh';
}

/**
 * Get the hook command prefix for the current platform
 * - macOS/Linux: bash
 * - Windows: powershell -ExecutionPolicy Bypass -File
 */
function getHookCommandPrefix(): string {
  return detectPlatform() === 'windows'
    ? 'powershell -ExecutionPolicy Bypass -File '
    : 'bash ';
}

/**
 * Check if bash is available (for macOS/Linux hooks on Windows with WSL/Git Bash)
 */
function isBashAvailable(): boolean {
  if (detectPlatform() !== 'windows') return true;
  try {
    const { execSync } = require('child_process');
    execSync('bash --version', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

// Golden Loop local file data (per-turn tracking)
interface GoldenLoopTurnData {
  phase: 'idle' | 'capture' | 'learn' | 'retrieve' | 'inject' | 'measure' | 'complete';
  turn: number;
  session: string;
  timestamp: string;
  stats: {
    retrieved: number;
    applied: number;
    forged: number;
  };
}

interface GoldenLoopActivity {
  goldenLoop: {
    retrievals: number;
    applications: number;
    successRate: number;
    forged: number;
  };
  collective?: {
    total: number;           // Total patterns shared by all users
    yourContributions: number; // Your patterns promoted to collective
    yourPatterns: number;     // Your total personal patterns
    displayTotal?: number;    // Patterns visible based on current scope
    scope?: string;           // Current scope filter
  };
  usage: {
    ekkos: { used: number; limit: number };
    crystallizations: { used: number; limit: number };
    apiRequests?: { used: number; limit: number };
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

// Setup wizard step tracking
interface SetupStep {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'done' | 'error';
  detail?: string;
}

interface SetupStats {
  agents: number;
  plugins: number;
  hooks: number;
  skills: number;
}

// Current setup state for sidebar
let currentSetupSteps: SetupStep[] | null = null;
let setupComplete = false;
let setupStats: SetupStats | null = null;

// Connection status cache
let ideConnectionStatus: Map<string, { status: string; lastChecked: Date; error?: string }> = new Map();
let currentSetupStatus: SetupStatus | null = null;

/**
 * Detect which IDE this extension is running in
 */
function detectCurrentIDE(): 'windsurf' | 'cursor' | 'vscode' | 'claude-code' | 'unknown' {
  const appName = vscode.env.appName?.toLowerCase() || '';
  
  if (appName.includes('windsurf') || appName.includes('codeium')) {
    return 'windsurf';
  }
  if (appName.includes('cursor')) {
    return 'cursor';
  }
  if (appName.includes('claude')) {
    return 'claude-code';
  }
  if (appName.includes('visual studio code') || appName.includes('vscode')) {
    return 'vscode';
  }
  
  return 'unknown';
}

// Constants
const EKKOS_DIR = path.join(os.homedir(), '.ekkos');
const CONFIG_PATH = path.join(EKKOS_DIR, 'config.json');

// Single source URLs - can be overridden via VS Code settings for development
function getMcpApiUrl(): string {
  return vscode.workspace.getConfiguration('ekkos').get('apiUrl', 'https://mcp.ekkos.dev');
}
function getPlatformUrl(): string {
  return vscode.workspace.getConfiguration('ekkos').get('platformUrl', 'https://platform.ekkos.dev');
}

// Use functions for all URL access to support VS Code settings overrides
// getMcpApiUrl() and getPlatformUrl() read from workspace configuration

// Tier display names (matches platform naming)
const TIER_NAMES: Record<string, string> = {
  free: 'Developer',
  starter: 'Spark',
  pro: 'Professional',
  team: 'Team',
  enterprise: 'Enterprise',
};

/**
 * Verify ~/.ekkos/ directory and config.json have correct permissions (chmod 700/600)
 * Returns true if permissions are correct or auto-fixed, false if there's an issue
 */
async function verifySecurityPermissions(): Promise<boolean> {
  // Skip on Windows (no chmod support)
  if (process.platform === 'win32') {
    return true;
  }

  const allowDiskApiKey = vscode.workspace.getConfiguration('ekkos').get<boolean>('allowDiskApiKey', true);

  // If disk key is disabled, no need to check permissions
  if (!allowDiskApiKey) {
    return true;
  }

  try {
    // Check if ~/.ekkos/config.json exists
    if (!fs.existsSync(CONFIG_PATH)) {
      return true; // No config yet, nothing to verify
    }

    // Get current file permissions
    const dirStats = fs.statSync(EKKOS_DIR);
    const fileStats = fs.statSync(CONFIG_PATH);

    // Extract permission bits (last 3 octal digits)
    const dirMode = dirStats.mode & 0o777;
    const fileMode = fileStats.mode & 0o777;

    let needsFix = false;
    let issues: string[] = [];

    // Directory should be 700 (owner only)
    if (dirMode !== 0o700) {
      issues.push(`~/.ekkos/ has mode ${dirMode.toString(8)}, expected 700`);
      needsFix = true;
    }

    // File should be 600 (owner read/write only)
    if (fileMode !== 0o600) {
      issues.push(`config.json has mode ${fileMode.toString(8)}, expected 600`);
      needsFix = true;
    }

    if (needsFix) {
      // Try to auto-fix
      try {
        fs.chmodSync(EKKOS_DIR, 0o700);
        fs.chmodSync(CONFIG_PATH, 0o600);
        console.log('[ekkOS Connect] Auto-fixed file permissions for ~/.ekkos/');
        return true;
      } catch (fixError) {
        // Could not auto-fix, warn the user
        console.warn('[ekkOS Connect] Could not auto-fix permissions:', issues.join(', '));
        vscode.window.showWarningMessage(
          `ekkOS Security: Your config file has insecure permissions. Please run: chmod 600 ~/.ekkos/config.json`,
          'Learn More',
          'Ignore'
        ).then(selection => {
          if (selection === 'Learn More') {
            vscode.env.openExternal(vscode.Uri.parse('https://docs.ekkos.dev/security/disk-keys'));
          }
        });
        return false;
      }
    }

    return true;
  } catch (error) {
    // Silently handle errors (file might not exist yet)
    console.log('[ekkOS Connect] Permission check skipped:', error);
    return true;
  }
}

// Globals
let statusBarItem: vscode.StatusBarItem;
let sidebarProvider: EkkosSidebarProvider;
let currentConfig: EkkosConfig | null = null;
let currentActivity: GoldenLoopActivity | null = null;
let currentGoldenLoopTurn: GoldenLoopTurnData | null = null;
let goldenLoopFileWatcher: fs.FSWatcher | null = null;
let activityRefreshInterval: ReturnType<typeof setInterval> | null = null;
let lastSuccessfulSync: Date | null = null;
let lastSyncError: string | null = null;

// ============ Context Monitor State (Endless Context) ============
let contextMonitorInterval: ReturnType<typeof setInterval> | null = null;
let autoClearFlagWatcher: ReturnType<typeof setInterval> | null = null;
let lastContextPercent = 0;
let lastAutoClearTime = 0;
let lastTranscriptSize = 0;  // Track for file watcher confirmation
const CONTEXT_MONITOR_INTERVAL_MS = 5000;  // Check every 5 seconds
const FLAG_WATCHER_INTERVAL_MS = 1000;  // Check for flag every 1 second
const MAX_TOKENS = 200000;
const AUTO_CLEAR_COOLDOWN_MS = 60000;  // 1 minute cooldown between auto-clears

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

// ============ Context Monitor (Endless Context) ============

/**
 * Get the Claude Code project directory for the current workspace
 */
function getClaudeProjectDir(): string | null {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) return null;

  const workspacePath = workspaceFolders[0].uri.fsPath;
  // Claude Code encodes paths by replacing / with -
  const encodedPath = workspacePath.replace(/\//g, '-');
  return path.join(os.homedir(), '.claude', 'projects', encodedPath);
}

/**
 * Find the most recently modified .jsonl transcript file
 */
function findActiveTranscript(): string | null {
  const projectDir = getClaudeProjectDir();
  if (!projectDir || !fs.existsSync(projectDir)) return null;

  try {
    const files = fs.readdirSync(projectDir)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => ({
        name: f,
        path: path.join(projectDir, f),
        mtime: fs.statSync(path.join(projectDir, f)).mtime
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    // Return the most recently modified file
    return files.length > 0 ? files[0].path : null;
  } catch {
    return null;
  }
}

/**
 * Calculate context usage percentage from transcript file
 */
function calculateContextPercent(transcriptPath: string): number {
  try {
    const stats = fs.statSync(transcriptPath);
    const fileSize = stats.size;

    // Rough estimate: 4 chars per token
    const roughTokens = Math.floor(fileSize / 4);
    let percent = Math.floor((roughTokens * 100) / MAX_TOKENS);

    // More accurate calculation in danger zone
    if (percent > 50) {
      const content = fs.readFileSync(transcriptPath, 'utf-8');
      const wordCount = content.split(/\s+/).length;
      // 1.3 tokens per word average
      percent = Math.floor((wordCount * 1.3 * 100) / MAX_TOKENS);
    }

    return Math.min(percent, 100);
  } catch {
    return 0;
  }
}

/**
 * Get the ekkOS session ID from Claude Code state file
 * This matches the session ID used by hooks for proper API correlation
 */
function getEkkosSessionId(): { sessionId: string; turnCount: number } {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return { sessionId: `fallback-${Date.now()}`, turnCount: 0 };
  }

  const workspacePath = workspaceFolders[0].uri.fsPath;
  const stateFile = path.join(workspacePath, '.claude', 'state', 'current-session.json');

  let sessionId = '';
  let turnCount = 0;

  // Try to read from Claude Code's state file (same as hooks use)
  try {
    if (fs.existsSync(stateFile)) {
      const stateData = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
      sessionId = stateData.session_id || '';
      log(`[Context Monitor] Got session ID from state file: ${sessionId.substring(0, 12)}...`);
    }
  } catch (e) {
    log(`[Context Monitor] Could not read state file: ${e}`);
  }

  // Fallback: generate same way as hooks do
  if (!sessionId) {
    const crypto = require('crypto');
    const projectDir = getClaudeProjectDir();
    if (projectDir) {
      sessionId = crypto.createHash('sha256').update(projectDir).digest('hex').substring(0, 12);
      log(`[Context Monitor] Generated session ID from project dir: ${sessionId}`);
    } else {
      sessionId = `vscode-${Date.now()}`;
    }
  }

  // Get turn count from ekkOS sessions directory
  const ekkosSessionDir = path.join(os.homedir(), '.ekkos', 'sessions');
  const turnFile = path.join(ekkosSessionDir, `${sessionId}.turn`);
  try {
    if (fs.existsSync(turnFile)) {
      turnCount = parseInt(fs.readFileSync(turnFile, 'utf-8').trim()) || 0;
    }
  } catch { /* ignore */ }

  return { sessionId, turnCount };
}

/**
 * Send /clear to the active Claude Code terminal
 */
async function sendClearToTerminal(): Promise<boolean> {
  // Find Claude Code terminal
  const terminals = vscode.window.terminals;
  let claudeTerminal: vscode.Terminal | null = null;

  for (const terminal of terminals) {
    // Look for terminal running claude command
    if (terminal.name.toLowerCase().includes('claude') ||
        terminal.name.toLowerCase().includes('task')) {
      claudeTerminal = terminal;
      break;
    }
  }

  // Fallback to active terminal
  if (!claudeTerminal) {
    claudeTerminal = vscode.window.activeTerminal || null;
  }

  if (claudeTerminal) {
    // Send /clear command
    claudeTerminal.sendText('/clear', true);
    log('[Context Monitor] Sent /clear to terminal');
    return true;
  }

  log('[Context Monitor] No terminal found for /clear');
  return false;
}

/**
 * Show visual feedback for context restoration
 * ALWAYS shows something - API enrichment is optional
 */
async function showRestorationVisual(sessionId: string, turnCount: number): Promise<void> {
  // ALWAYS show status bar animation first (immediate feedback)
  if (statusBarItem) {
    const originalText = statusBarItem.text;
    statusBarItem.text = '$(sync~spin) ekkOS: Clearing context...';
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');

    setTimeout(() => {
      statusBarItem.text = '$(check) ekkOS: Context restored';
      statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
      setTimeout(() => {
        statusBarItem.text = originalText;
        statusBarItem.backgroundColor = undefined;
      }, 3000);
    }, 1500);
  }

  // Build message - works even without API
  const message = turnCount > 0
    ? `🧠 ekkOS: Endless Context activated (${turnCount} turns preserved)`
    : `🧠 ekkOS: Endless Context activated`;

  // ALWAYS show notification (doesn't depend on API)
  vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: message,
    cancellable: false
  }, async (progress) => {
    progress.report({ message: 'Context cleared and restored automatically' });
    await new Promise(resolve => setTimeout(resolve, 4000));
    return;
  });

  log(`[Context Monitor] Visual feedback shown (turns: ${turnCount})`);

  // OPTIONAL: Try to enrich with API data (but don't block on it)
  if (currentConfig?.apiKey) {
    try {
      const response = await fetch('https://mcp.ekkos.dev/api/v1/turns/recall', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentConfig.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session_id: sessionId,
          last_n: 5,
          format: 'summary'
        })
      });

      if (response.ok) {
        const data = await response.json() as { turns?: unknown[] };
        const turns = data.turns || [];
        if (turns.length > 0) {
          log(`[Context Monitor] API enrichment: ${turns.length} turns found`);
        }
      }
    } catch (error) {
      // Silent fail - visual already shown
      log(`[Context Monitor] API enrichment failed (visual still shown): ${error}`);
    }
  }
}

/**
 * Call ekkOS API to preserve context before clear
 */
async function preserveContextToEkkos(sessionId: string): Promise<boolean> {
  if (!currentConfig?.apiKey) return false;

  try {
    const response = await fetch('https://mcp.ekkos.dev/api/v1/context/preserve', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${currentConfig.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        session_id: sessionId,
        user_id: currentConfig.userId,
        source: 'vscode-extension',
        auto_triggered: true
      })
    });

    if (response.ok) {
      log('[Context Monitor] Context preserved to ekkOS');
      return true;
    }
    logError('[Context Monitor] Failed to preserve context:', await response.text());
    return false;
  } catch (error) {
    logError('[Context Monitor] Error preserving context:', error);
    return false;
  }
}

/**
 * Main context check and auto-clear logic
 */
async function checkContextAndAutoClear(): Promise<void> {
  // Skip if not configured for Claude Code
  const currentIDE = detectCurrentIDE();
  if (currentIDE !== 'claude-code') return;

  // Get config and check if enabled
  const guardianConfig = currentConfig?.contextGuardian;
  if (!guardianConfig?.enabled || !guardianConfig?.autoPreserve) return;

  const threshold = guardianConfig.tokenThreshold || 0.85;
  const transcriptPath = findActiveTranscript();
  if (!transcriptPath) return;

  const contextPercent = calculateContextPercent(transcriptPath);
  const contextRatio = contextPercent / 100;

  // Track transcript size for file watcher confirmation
  let currentTranscriptSize = 0;
  try {
    currentTranscriptSize = fs.statSync(transcriptPath).size;
  } catch { /* ignore */ }

  // Check if we should auto-clear
  const now = Date.now();
  const cooldownPassed = (now - lastAutoClearTime) > AUTO_CLEAR_COOLDOWN_MS;

  if (contextRatio >= threshold && cooldownPassed) {
    log(`[Context Monitor] Context at ${contextPercent}% (threshold: ${threshold * 100}%) - Auto-clearing...`);

    // Get proper session ID from ekkOS state file (matches hooks)
    const { sessionId, turnCount } = getEkkosSessionId();
    log(`[Context Monitor] Using session ID: ${sessionId}, turns: ${turnCount}`);

    // Step 1: Preserve to ekkOS
    await preserveContextToEkkos(sessionId);

    // Step 2: Send /clear to terminal
    const clearSent = await sendClearToTerminal();

    if (clearSent) {
      lastAutoClearTime = now;
      lastTranscriptSize = currentTranscriptSize;

      // Step 3: Wait and verify /clear worked by checking transcript size dropped
      setTimeout(async () => {
        let clearConfirmed = false;

        // Check if transcript size decreased (indicates new session started)
        try {
          const newSize = fs.statSync(transcriptPath).size;
          if (newSize < lastTranscriptSize * 0.5) {
            // Size dropped significantly - /clear worked!
            clearConfirmed = true;
            log(`[Context Monitor] /clear confirmed: transcript size dropped from ${lastTranscriptSize} to ${newSize}`);
          } else {
            // Check if a NEW transcript file was created (Claude Code might create new file)
            const newTranscript = findActiveTranscript();
            if (newTranscript && newTranscript !== transcriptPath) {
              clearConfirmed = true;
              log(`[Context Monitor] /clear confirmed: new transcript file created`);
            }
          }
        } catch {
          // File might be replaced - that's also confirmation
          clearConfirmed = true;
        }

        // Show visual feedback (always, but log confirmation status)
        if (clearConfirmed) {
          log('[Context Monitor] /clear verified - showing restoration visual');
        } else {
          log('[Context Monitor] /clear not confirmed - showing visual anyway');
        }

        showRestorationVisual(sessionId, turnCount);
      }, 2000);  // Wait 2 seconds for Claude Code to process /clear

      log('[Context Monitor] Auto-clear cycle initiated');
    }
  } else if (contextPercent >= 70 && contextPercent !== lastContextPercent) {
    // Just log the percentage change for monitoring
    log(`[Context Monitor] Context at ${contextPercent}%`);
  }

  lastContextPercent = contextPercent;
}

/**
 * Start the context monitor
 */
function startContextMonitor(): void {
  if (contextMonitorInterval) {
    clearInterval(contextMonitorInterval);
  }

  log('[Context Monitor] Starting Endless Context monitoring...');

  // Run immediately once
  checkContextAndAutoClear();

  // Then run periodically
  contextMonitorInterval = setInterval(() => {
    checkContextAndAutoClear();
  }, CONTEXT_MONITOR_INTERVAL_MS);
}

/**
 * Stop the context monitor
 */
function stopContextMonitor(): void {
  if (contextMonitorInterval) {
    clearInterval(contextMonitorInterval);
    contextMonitorInterval = null;
    log('[Context Monitor] Stopped');
  }
}

// ============ Auto-Clear Flag Watcher (No accessibility needed!) ============

/**
 * Check for needs-clear.flag from stop hook and execute auto-clear sequence
 * This uses VS Code's terminal API - no special permissions required!
 */
async function checkAutoClearFlag(): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) return;

  const workspacePath = workspaceFolders[0].uri.fsPath;
  const flagPath = path.join(workspacePath, '.claude', 'state', 'needs-clear.flag');

  // Check if flag file exists
  if (!fs.existsSync(flagPath)) return;

  log('[Auto-Clear] Flag detected! Starting auto-clear sequence...');

  // Read and delete the flag immediately
  let flagContent: any = {};
  try {
    flagContent = JSON.parse(fs.readFileSync(flagPath, 'utf8'));
    fs.unlinkSync(flagPath);
  } catch {
    fs.unlinkSync(flagPath);
  }

  const contextPercent = flagContent.context_percent || 95;

  // Show status
  if (statusBarItem) {
    statusBarItem.text = '$(sync~spin) ekkOS: Auto-clearing...';
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  }

  // Find terminal
  const terminals = vscode.window.terminals;
  let claudeTerminal: vscode.Terminal | null = null;

  for (const terminal of terminals) {
    if (terminal.name.toLowerCase().includes('claude') ||
        terminal.name.toLowerCase().includes('task')) {
      claudeTerminal = terminal;
      break;
    }
  }

  if (!claudeTerminal) {
    claudeTerminal = vscode.window.activeTerminal || null;
  }

  if (!claudeTerminal) {
    log('[Auto-Clear] No terminal found');
    return;
  }

  // Step 1: Send /clear
  log('[Auto-Clear] Sending /clear...');
  claudeTerminal.sendText('/clear', true);

  // Step 2: Wait 3 seconds for /clear to complete
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Step 3: Send "continue" to restore context
  log('[Auto-Clear] Sending continue...');
  claudeTerminal.sendText('continue', true);

  // Update status bar
  if (statusBarItem) {
    statusBarItem.text = '$(check) ekkOS: Context restored';
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
    setTimeout(() => {
      statusBarItem.text = '$(brain) ekkOS';
      statusBarItem.backgroundColor = undefined;
    }, 3000);
  }

  // Show notification
  vscode.window.showInformationMessage(
    `🧠 ekkOS: Auto-cleared at ${contextPercent}% and restored context`
  );

  log(`[Auto-Clear] Complete! Was at ${contextPercent}%`);
}

/**
 * Start watching for auto-clear flag file
 */
function startAutoClearFlagWatcher(): void {
  if (autoClearFlagWatcher) {
    clearInterval(autoClearFlagWatcher);
  }

  log('[Auto-Clear] Starting flag watcher...');

  // Check every second
  autoClearFlagWatcher = setInterval(() => {
    checkAutoClearFlag();
  }, FLAG_WATCHER_INTERVAL_MS);
}

/**
 * Stop the flag watcher
 */
function stopAutoClearFlagWatcher(): void {
  if (autoClearFlagWatcher) {
    clearInterval(autoClearFlagWatcher);
    autoClearFlagWatcher = null;
    log('[Auto-Clear] Flag watcher stopped');
  }
}

export async function activate(context: vscode.ExtensionContext) {
  // Create output channel first so all subsequent logs are captured
  outputChannel = vscode.window.createOutputChannel('ekkOS Connect');
  context.subscriptions.push(outputChannel);

  log('[ekkOS Connect] Extension activated');

  // Store context for SecretStorage access
  extensionContext = context;

  // Security: migrate any secrets from disk to SecretStorage (one-time cleanup)
  await migrateSecretsFromDisk();

  // Security: verify ~/.ekkos/ permissions and auto-fix if possible
  await verifySecurityPermissions();

  // ROOT FIX: Ensure hookApiKey exists for CLI hooks (idempotent, runs every activation)
  await ensureHookApiKey();

  // Load existing config (async - secrets from SecretStorage)
  currentConfig = await loadConfigAsync();

  // Create status bar
  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBarItem.command = 'ekkos.openSidebar';
  context.subscriptions.push(statusBarItem);
  updateStatusBar();

  // Auto-sync credentials and check connections if user is logged in
  if (currentConfig?.apiKey) {
    // Sync credentials after a short delay to let UI initialize
    // This ensures config files always have the correct API key
    setTimeout(async () => {
      await autoDeployToCurrentIde(); // Sync credentials if they've changed
      await checkIdeConnections();    // Then verify connection status

      // On Windows: Install Claude Code first (required for ekkos run -b)
      // Then install ekkOS CLI for the wrapper functionality
      if (process.platform === 'win32') {
        autoInstallClaudeCode().then(() => {
          // After Claude Code is installed, install ekkOS CLI
          return autoInstallCli();
        }).catch(err => {
          log(`[Windows Setup] Background install error: ${err.message}`);
        });
      } else {
        // On macOS/Linux, just install CLI (Claude Code via homebrew or manual)
        autoInstallCli().catch(err => {
          log(`[ekkOS CLI] Background install error: ${err.message}`);
        });
      }
    }, 1000);
  }

  // Create sidebar provider
  sidebarProvider = new EkkosSidebarProvider(context.extensionUri, context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('ekkosConnect', sidebarProvider)
  );

  // Create Session Context view provider
  const sessionContextProvider = new SessionContextViewProvider(context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider('ekkosSessionContext', sessionContextProvider)
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
    vscode.commands.registerCommand('ekkos.deployPlugins', () => deployClaudePlugins()),
    vscode.commands.registerCommand('ekkos.openDashboard', () => openDashboard()),
    vscode.commands.registerCommand('ekkos.refreshStatus', () => refreshStatus()),
    vscode.commands.registerCommand('ekkos.setupRules', () => setupRulesCommand(context)),
    vscode.commands.registerCommand('ekkos.setupGlobal', () => setupGlobalHooksCommand(context)),
    vscode.commands.registerCommand('ekkos.togglePatternScope', () => togglePatternScope()),

    // Windows-specific documentation commands
    vscode.commands.registerCommand('ekkos.showWindowsGuide', async () => {
      const guidePath = path.join(context.extensionPath, 'docs', 'WINDOWS_SETUP_GUIDE.md');
      if (!fs.existsSync(guidePath)) {
        vscode.window.showErrorMessage('Windows setup guide not found. Extension may need reinstall.');
        return;
      }
      const doc = await vscode.workspace.openTextDocument(guidePath);
      await vscode.window.showTextDocument(doc, { preview: false });
      log('Opened Windows Setup Guide');
    }),

    vscode.commands.registerCommand('ekkos.showWindowsQuickFix', async () => {
      const quickFixPath = path.join(context.extensionPath, 'docs', 'WINDOWS_QUICK_FIX.md');
      if (!fs.existsSync(quickFixPath)) {
        vscode.window.showErrorMessage('Windows quick fix guide not found. Extension may need reinstall.');
        return;
      }
      const doc = await vscode.workspace.openTextDocument(quickFixPath);
      await vscode.window.showTextDocument(doc, { preview: false });
      log('Opened Windows Quick Fix Guide');
    }),

    // macOS setup guide
    vscode.commands.registerCommand('ekkos.showMacOSGuide', async () => {
      const guidePath = path.join(context.extensionPath, 'docs', 'MACOS_SETUP_GUIDE.md');
      if (!fs.existsSync(guidePath)) {
        vscode.window.showErrorMessage('macOS setup guide not found. Extension may need reinstall.');
        return;
      }
      const doc = await vscode.workspace.openTextDocument(guidePath);
      await vscode.window.showTextDocument(doc, { preview: false });
      log('Opened macOS Setup Guide');
    }),

    // Linux setup guide
    vscode.commands.registerCommand('ekkos.showLinuxGuide', async () => {
      const guidePath = path.join(context.extensionPath, 'docs', 'LINUX_SETUP_GUIDE.md');
      if (!fs.existsSync(guidePath)) {
        vscode.window.showErrorMessage('Linux setup guide not found. Extension may need reinstall.');
        return;
      }
      const doc = await vscode.workspace.openTextDocument(guidePath);
      await vscode.window.showTextDocument(doc, { preview: false });
      log('Opened Linux Setup Guide');
    }),

    // Windows Setup Wizard - one-button setup with auto-fix
    vscode.commands.registerCommand('ekkos.windowsSetupWizard', async () => {
      log('[ekkOS Setup Wizard] Starting...');

      // Show progress
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'ekkOS Setup Wizard',
        cancellable: false
      }, async (progress) => {
        progress.report({ message: 'Running system checks...' });

        // Run preflight
        const report = await runWindowsPreflight();
        if (!report) {
          vscode.window.showErrorMessage('Failed to run system checks. Please try again.');
          return;
        }

        // Check results
        const failedGates = report.gates.filter(g => g.status === 'FAIL');
        const warnGates = report.gates.filter(g => g.status === 'WARN');

        if (failedGates.length === 0) {
          // All good - proceed to full setup
          progress.report({ message: 'All checks passed! Running setup...' });
          vscode.window.showInformationMessage(
            `System check passed (${report.platform}). Proceeding with ekkOS setup...`
          );

          // Run full setup if authenticated
          if (currentConfig) {
            await runFullSetup(context);
          } else {
            vscode.window.showInformationMessage(
              'Please authenticate first, then run Setup Wizard again.',
              'Connect Account'
            ).then(action => {
              if (action === 'Connect Account') {
                vscode.commands.executeCommand('ekkos.connect');
              }
            });
          }
          return;
        }

        // Show failures and offer fixes
        progress.report({ message: 'Issues found, preparing fixes...' });

        const items: vscode.QuickPickItem[] = [];

        for (const gate of failedGates) {
          items.push({
            label: `$(error) ${gate.title}`,
            description: gate.status,
            detail: gate.fix ? `Fix: ${gate.fix}` : 'Manual fix required'
          });
        }

        for (const gate of warnGates) {
          items.push({
            label: `$(warning) ${gate.title}`,
            description: gate.status,
            detail: gate.checks.map(c => c.detail).join(', ')
          });
        }

        items.push({
          label: '$(play) Run Auto-Fix',
          description: 'Attempt to fix issues automatically',
          detail: 'Will install missing components and re-check'
        });

        items.push({
          label: '$(terminal) Open Terminal with Commands',
          description: 'Copy fix commands to terminal',
          detail: failedGates.map(g => g.fix).filter(Boolean).join(' && ')
        });

        const selected = await vscode.window.showQuickPick(items, {
          placeHolder: `${failedGates.length} issue(s) found. Select an action:`,
          ignoreFocusOut: true
        });

        if (selected?.label.includes('Run Auto-Fix')) {
          // Run auto-fix via ekkos doctor --fix
          const terminal = vscode.window.createTerminal({
            name: 'ekkOS Auto-Fix',
            shellPath: detectPlatform() === 'windows' ? 'powershell.exe' : undefined
          });
          terminal.show();
          terminal.sendText('npx -y @ekkos/cli@latest doctor --fix');

          vscode.window.showInformationMessage(
            'Auto-fix running in terminal. After it completes, run Setup Wizard again.',
            'Run Wizard Again'
          ).then(action => {
            if (action === 'Run Wizard Again') {
              vscode.commands.executeCommand('ekkos.windowsSetupWizard');
            }
          });
        } else if (selected?.label.includes('Open Terminal')) {
          const commands = failedGates.map(g => g.fix).filter(Boolean).join(' && ');
          if (commands) {
            const terminal = vscode.window.createTerminal({
              name: 'ekkOS Manual Fix',
              shellPath: detectPlatform() === 'windows' ? 'powershell.exe' : undefined
            });
            terminal.show();
            terminal.sendText(commands);
          }
        }
      });
    }),

    // Run preflight check only (no wizard)
    vscode.commands.registerCommand('ekkos.runPreflight', async () => {
      log('[ekkOS Preflight] Running system check...');

      const report = await runWindowsPreflight();
      if (!report) {
        vscode.window.showErrorMessage('Failed to run system checks.');
        return;
      }

      // Build status message
      const statusLines: string[] = [`Platform: ${report.platform}`];
      for (const gate of report.gates) {
        const icon = gate.status === 'PASS' ? '✓' : gate.status === 'WARN' ? '○' : '✗';
        statusLines.push(`${icon} ${gate.title}: ${gate.status}`);
      }

      if (report.canProceed) {
        vscode.window.showInformationMessage(
          `System Check Passed\n${statusLines.join('\n')}`,
          'Run Setup'
        ).then(action => {
          if (action === 'Run Setup') {
            vscode.commands.executeCommand('ekkos.windowsSetupWizard');
          }
        });
      } else {
        vscode.window.showWarningMessage(
          `System Check: Issues Found\n${statusLines.join('\n')}`,
          'Run Setup Wizard',
          'View Details'
        ).then(action => {
          if (action === 'Run Setup Wizard') {
            vscode.commands.executeCommand('ekkos.windowsSetupWizard');
          } else if (action === 'View Details') {
            // Show detailed output in output channel
            outputChannel.show();
            outputChannel.appendLine('═'.repeat(60));
            outputChannel.appendLine('ekkOS System Check Results');
            outputChannel.appendLine('═'.repeat(60));
            outputChannel.appendLine(`Platform: ${report.platform}`);
            outputChannel.appendLine(`Node: ${report.nodeVersion || 'Not found'}`);
            outputChannel.appendLine(`Claude: ${report.claudeVersion || 'Not found'}`);
            outputChannel.appendLine('');

            for (const gate of report.gates) {
              const icon = gate.status === 'PASS' ? '✓' : gate.status === 'WARN' ? '○' : '✗';
              outputChannel.appendLine(`${icon} ${gate.title}: ${gate.status}`);
              for (const check of gate.checks) {
                const checkIcon = check.passed ? '  ✓' : '  ✗';
                outputChannel.appendLine(`${checkIcon} ${check.name}: ${check.detail || ''}`);
              }
              if (gate.fix) {
                outputChannel.appendLine(`  → Fix: ${gate.fix}`);
              }
              outputChannel.appendLine('');
            }
          }
        });
      }
    }),

    // Validation command
    vscode.commands.registerCommand('ekkos.validateTemplates', async () => {
      const scriptPath = path.join(context.extensionPath, 'scripts', 'validate-templates.sh');
      if (!fs.existsSync(scriptPath)) {
        vscode.window.showErrorMessage('Validation script not found. Extension may need reinstall.');
        return;
      }

      // Check if bash is available on Windows
      if (detectPlatform() === 'windows' && !isBashAvailable()) {
        vscode.window.showErrorMessage(
          'Git Bash not found. Please install Git for Windows.',
          'Download Git'
        ).then(action => {
          if (action === 'Download Git') {
            vscode.env.openExternal(vscode.Uri.parse('https://git-scm.com/download/win'));
          }
        });
        return;
      }

      // Run validation with progress
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: 'Validating templates...',
        cancellable: false
      }, async () => {
        try {
          const { execSync } = require('child_process');
          const output = execSync(`bash "${scriptPath}"`, {
            encoding: 'utf-8',
            cwd: context.extensionPath
          });

          // Show output
          outputChannel.show();
          outputChannel.clear();
          outputChannel.appendLine('='.repeat(60));
          outputChannel.appendLine('ekkOS Template Validation');
          outputChannel.appendLine('='.repeat(60));
          outputChannel.appendLine('');
          // Strip ANSI color codes for cleaner output
          const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, '');
          outputChannel.appendLine(cleanOutput);

          vscode.window.showInformationMessage('✓ Template validation complete! Check output for details.', 'Show Output').then(action => {
            if (action === 'Show Output') {
              outputChannel.show();
            }
          });

          log('Template validation completed successfully');
        } catch (error: any) {
          const output = error.stdout || error.message;
          outputChannel.show();
          outputChannel.clear();
          outputChannel.appendLine('='.repeat(60));
          outputChannel.appendLine('ekkOS Template Validation - FAILED');
          outputChannel.appendLine('='.repeat(60));
          outputChannel.appendLine('');
          const cleanOutput = output.replace(/\x1b\[[0-9;]*m/g, '');
          outputChannel.appendLine(cleanOutput);

          vscode.window.showErrorMessage('Template validation found issues. See output for details.', 'Show Output').then(action => {
            if (action === 'Show Output') {
              outputChannel.show();
            }
          });

          logError('Template validation failed', error);
        }
      });
    }),

    // Session Context commands
    vscode.commands.registerCommand('ekkos.showSessionContext', () => {
      vscode.commands.executeCommand('ekkosSessionContext.focus');
    }),
    vscode.commands.registerCommand('ekkos.refreshSessionContext', () => {
      // Will be handled by the panel's refresh button
      vscode.window.showInformationMessage('Session context refreshed');
    }),
    vscode.commands.registerCommand('ekkos.focusActiveSession', () => {
      // Placeholder for session focusing
      vscode.window.showInformationMessage('Session focus feature coming soon');
    })
  );

  // Register chat participant for automatic pattern injection
  registerChatParticipant(context);

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

  // Refresh activity when window regains focus (keeps metrics fresh)
  context.subscriptions.push(
    vscode.window.onDidChangeWindowState(e => {
      if (e.focused && currentConfig?.apiKey) {
        fetchActivity().then(activity => {
          if (activity) {
            currentActivity = activity;
            updateStatusBar();
            sidebarProvider?.refresh();
          }
        });
      }
    })
  );

  // Show welcome on first run - IDE-specific
  if (!context.globalState.get('ekkos.welcomed') && !currentConfig) {
    context.globalState.update('ekkos.welcomed', true);
    const currentIDE = detectCurrentIDE();
    const ideName = currentIDE === 'windsurf' ? 'Windsurf'
      : currentIDE === 'cursor' ? 'Cursor'
      : currentIDE === 'claude-code' ? 'Claude Code'
      : currentIDE === 'vscode' ? 'VS Code'
      : 'your IDE';

    // Platform-specific welcome with setup guide
    const platform = detectPlatform();

    if (platform === 'windows') {
      vscode.window.showInformationMessage(
        `Welcome to ekkOS! Windows requires special setup for hooks and MCP. Let's get you started.`,
        'Setup Guide',
        'Quick Fix',
        'Get Started'
      ).then(selection => {
        if (selection === 'Setup Guide') {
          vscode.commands.executeCommand('ekkos.showWindowsGuide');
        } else if (selection === 'Quick Fix') {
          vscode.commands.executeCommand('ekkos.showWindowsQuickFix');
        } else if (selection === 'Get Started') {
          vscode.commands.executeCommand('workbench.view.extension.ekkos');
        }
      });
    } else if (platform === 'macos') {
      vscode.window.showInformationMessage(
        `Welcome to ekkOS! Let's configure ${ideName} for macOS. Check our setup guide for tips on Homebrew, zsh, and Node.js.`,
        'Setup Guide',
        'Get Started'
      ).then(selection => {
        if (selection === 'Setup Guide') {
          vscode.commands.executeCommand('ekkos.showMacOSGuide');
        } else if (selection === 'Get Started') {
          vscode.commands.executeCommand('workbench.view.extension.ekkos');
        }
      });
    } else if (platform === 'linux') {
      vscode.window.showInformationMessage(
        `Welcome to ekkOS! Let's configure ${ideName} for Linux. Check our setup guide for distribution-specific tips.`,
        'Setup Guide',
        'Get Started'
      ).then(selection => {
        if (selection === 'Setup Guide') {
          vscode.commands.executeCommand('ekkos.showLinuxGuide');
        } else if (selection === 'Get Started') {
          vscode.commands.executeCommand('workbench.view.extension.ekkos');
        }
      });
    } else {
      vscode.window.showInformationMessage(
        `Welcome to ekkOS! We'll automatically configure ${ideName} for you. Click the ekkOS icon to get started.`,
        'Get Started'
      ).then(selection => {
        if (selection === 'Get Started') {
          vscode.commands.executeCommand('workbench.view.extension.ekkos');
        }
      });
    }
  }

  // Windows-specific: Offer quick fix guide after deployment if hooks might have issues
  if (detectPlatform() === 'windows' && !context.globalState.get('ekkos.windowsQuickFixShown')) {
    // Only show after they've connected (have config)
    if (currentConfig) {
      context.globalState.update('ekkos.windowsQuickFixShown', true);
      vscode.window.showInformationMessage(
        'Windows detected! If hooks or MCP aren\'t working, check our troubleshooting guide.',
        'Quick Fix',
        'Dismiss'
      ).then(selection => {
        if (selection === 'Quick Fix') {
          vscode.commands.executeCommand('ekkos.showWindowsQuickFix');
        }
      });
    }
  }

  // Old welcome for non-Windows (kept for backwards compatibility)
  if (!context.globalState.get('ekkos.welcomed') && !currentConfig && detectPlatform() !== 'windows') {
    const currentIDE = detectCurrentIDE();
    const ideName = currentIDE === 'windsurf' ? 'Windsurf'
      : currentIDE === 'cursor' ? 'Cursor'
      : currentIDE === 'claude-code' ? 'Claude Code'
      : currentIDE === 'vscode' ? 'VS Code'
      : 'your IDE';

    vscode.window.showInformationMessage(
      `Welcome to ekkOS! We'll automatically configure ${ideName} for you. Click the ekkOS icon to get started.`,
      'Get Started'
    ).then(selection => {
      if (selection === 'Get Started') {
        vscode.commands.executeCommand('workbench.view.extension.ekkos');
      }
    });
  }

  // Start activity polling if connected
  if (currentConfig) {
    startActivityPolling();
    // Start Golden Loop file watcher for real-time turn-by-turn tracking
    startGoldenLoopFileWatcher();
    // Start Context Monitor for Endless Context (auto-clear + restore)
    startContextMonitor();
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
    // Get current scope from config (default: 'both')
    const scope = currentConfig.patternScope || 'both';

    // Use getMcpApiUrl() which returns the correct gateway endpoint
    const response = await fetchWithRetry(
      `${getMcpApiUrl()}/api/v1/memory/activity?scope=${scope}`,
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
      const data = await response.json() as GoldenLoopActivity & { tier?: string };

      // Sync tier from API if it changed (handles upgrades/downgrades)
      if (data.tier && currentConfig && data.tier !== currentConfig.tier) {
        currentConfig.tier = data.tier as 'free' | 'pro' | 'team' | 'enterprise';
        await saveConfigAsync(currentConfig);
        console.log(`[ekkOS] Tier synced from API: ${data.tier}`);
      }

      return data as GoldenLoopActivity;
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
    activityRefreshInterval = null;
  }

  const run = async () => {
    const activity = await fetchActivity();
    if (activity) {
      currentActivity = activity;
      updateStatusBar();
      sidebarProvider?.refresh();
    }
  };

  // Immediate refresh on startup
  void run();

  // Poll every 60 seconds for live metrics
  activityRefreshInterval = setInterval(run, 60_000);

  // Check IDE connections and setup status on startup only
  checkIdeConnections();
  checkSetupStatus();
}

function stopActivityPolling() {
  if (activityRefreshInterval) {
    clearInterval(activityRefreshInterval);
    activityRefreshInterval = null;
  }
  currentActivity = null;
}

// ============ Golden Loop File Watcher (Real-Time) ============

/**
 * Start watching the Golden Loop file for real-time turn-by-turn updates
 * This runs on EVERY turn (not just every 60s like the activity API)
 */
function startGoldenLoopFileWatcher() {
  // Stop existing watcher if any
  stopGoldenLoopFileWatcher();

  // Golden Loop file is in ~/.ekkos/ (global, not per-workspace)
  const goldenLoopFilePath = path.join(os.homedir(), '.ekkos', 'golden-loop-current.json');

  // Create .ekkos directory if it doesn't exist
  const ekkosDir = path.join(os.homedir(), '.ekkos');
  if (!fs.existsSync(ekkosDir)) {
    fs.mkdirSync(ekkosDir, { recursive: true });
  }

  // Read initial state if file exists
  if (fs.existsSync(goldenLoopFilePath)) {
    try {
      const data = fs.readFileSync(goldenLoopFilePath, 'utf8');
      currentGoldenLoopTurn = JSON.parse(data);
      sidebarProvider?.refresh();
      log('[Golden Loop] Initial state loaded:', currentGoldenLoopTurn);
    } catch (error) {
      log('[Golden Loop] Failed to read initial state:', error);
    }
  }

  // Watch for file changes
  try {
    goldenLoopFileWatcher = fs.watch(goldenLoopFilePath, (eventType) => {
      if (eventType === 'change') {
        // Read the updated file
        try {
          const data = fs.readFileSync(goldenLoopFilePath, 'utf8');
          currentGoldenLoopTurn = JSON.parse(data);

          // Update sidebar immediately
          sidebarProvider?.refresh();

          if (currentGoldenLoopTurn) {
            log(`[Golden Loop] Turn ${currentGoldenLoopTurn.turn} | Phase: ${currentGoldenLoopTurn.phase} | Retrieved: ${currentGoldenLoopTurn.stats.retrieved} Applied: ${currentGoldenLoopTurn.stats.applied} Forged: ${currentGoldenLoopTurn.stats.forged}`);
          }
        } catch (error) {
          log('[Golden Loop] Failed to read file update:', error);
        }
      }
    });

    log('[Golden Loop] File watcher started:', goldenLoopFilePath);
  } catch (error) {
    log('[Golden Loop] Failed to start file watcher:', error);
  }
}

function stopGoldenLoopFileWatcher() {
  if (goldenLoopFileWatcher) {
    goldenLoopFileWatcher.close();
    goldenLoopFileWatcher = null;
    log('[Golden Loop] File watcher stopped');
  }
  currentGoldenLoopTurn = null;
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

  // First, mark all as checking
  for (const ide of ideConfigs) {
    if (ide.exists) {
      ideConnectionStatus.set(ide.name, { status: 'checking', lastChecked: new Date() });
    }
  }
  sidebarProvider?.refresh(); // Show "checking" state immediately

  // Then verify each IDE
  for (const ide of ideConfigs) {
    if (!ide.exists) {
      ideConnectionStatus.set(ide.name, { status: 'not-installed', lastChecked: new Date() });
      continue;
    }

    // Check if config file exists and contains ekkos
    try {
      if (fs.existsSync(ide.configPath)) {
        const content = fs.readFileSync(ide.configPath, 'utf8');
        if (content.includes('ekkos-memory') || content.includes('ekkos')) {
          // Config exists - mark as configured (not "connected" since we can't verify if IDE is actually using it)
          ideConnectionStatus.set(ide.name, {
            status: 'configured',
            lastChecked: new Date()
          });
        } else {
          // Config file exists but ekkOS not configured
          ideConnectionStatus.set(ide.name, { status: 'not-configured', lastChecked: new Date() });
        }
      } else {
        // Config file doesn't exist - not configured
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

  // Refresh sidebar to show final status
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

    const response = await fetch(`${getMcpApiUrl()}/api/v1/mcp/tools`, {
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

    const response = await fetch(`${getMcpApiUrl()}/api/v1/mcp/tools`, {
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

// Load public config from disk, secrets from SecretStorage
async function loadConfigAsync(): Promise<EkkosConfig | null> {
  try {
    if (!fs.existsSync(CONFIG_PATH) || !extensionContext) {
      return null;
    }
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const publicConfig: EkkosPublicConfig & { hookApiKey?: string } = JSON.parse(raw);

    // Get secrets from SecretStorage
    const token = await extensionContext.secrets.get(SECRET_KEY_TOKEN) || '';
    let apiKey = await extensionContext.secrets.get(SECRET_KEY_API_KEY) || '';

    // Fallback: Use hookApiKey from disk if SecretStorage is empty
    if (!apiKey && publicConfig.hookApiKey) {
      log('[ekkOS Connect] SecretStorage empty - using hookApiKey from disk as fallback');
      apiKey = publicConfig.hookApiKey;

      // Sync back to SecretStorage for future use
      await extensionContext.secrets.store(SECRET_KEY_API_KEY, apiKey);
      log('[ekkOS Connect] API key restored to SecretStorage');
    }

    if (!apiKey) {
      // No secrets stored - user needs to re-auth
      return null;
    }

    return { ...publicConfig, token, apiKey };
  } catch (e) {
    console.error('Failed to load ekkOS config:', e);
  }
  return null;
}

// Sync version for backward compatibility (uses cached currentConfig)
function loadConfig(): EkkosConfig | null {
  // Return cached config (loaded async at startup)
  return currentConfig;
}

// Security migration: scrub secrets from disk config file
// Old versions may have stored apiKey/token in config.json - migrate them to SecretStorage
async function migrateSecretsFromDisk(): Promise<void> {
  if (!extensionContext) {
    return;
  }

  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      return;
    }

    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const diskConfig = JSON.parse(raw);

    // Check if secrets exist on disk (old format)
    const hasSecretsOnDisk = diskConfig.apiKey || diskConfig.token;
    if (!hasSecretsOnDisk) {
      return; // Already clean
    }

    log('[ekkOS Connect] Migrating secrets from disk to SecretStorage...');

    // Migrate secrets to SecretStorage if not already present
    const existingApiKey = await extensionContext.secrets.get(SECRET_KEY_API_KEY);
    const existingToken = await extensionContext.secrets.get(SECRET_KEY_TOKEN);

    if (diskConfig.apiKey && !existingApiKey) {
      await extensionContext.secrets.store(SECRET_KEY_API_KEY, diskConfig.apiKey);
      log('[ekkOS Connect] API key migrated to SecretStorage');
    }

    if (diskConfig.token && !existingToken) {
      await extensionContext.secrets.store(SECRET_KEY_TOKEN, diskConfig.token);
      log('[ekkOS Connect] Token migrated to SecretStorage');
    }

    // Rewrite config file WITHOUT secrets (but WITH hookApiKey for CLI hooks)
    // ROOT FIX: Preserve hookApiKey and contextGuardian during migration
    const allowDiskApiKey = vscode.workspace.getConfiguration('ekkos').get<boolean>('allowDiskApiKey', true);
    const cleanConfig: EkkosPublicConfig & { hookApiKey?: string; contextGuardian?: typeof diskConfig.contextGuardian } = {
      userId: diskConfig.userId,
      email: diskConfig.email,
      tier: diskConfig.tier || 'free',
      createdAt: diskConfig.createdAt || new Date().toISOString(),
      patternScope: diskConfig.patternScope,
      // Preserve contextGuardian settings
      ...(diskConfig.contextGuardian ? { contextGuardian: diskConfig.contextGuardian } : {}),
      // ROOT FIX: Add hookApiKey for CLI hooks if allowed
      ...(allowDiskApiKey && diskConfig.apiKey ? { hookApiKey: diskConfig.apiKey } : {})
    };

    // Atomic write
    const tempPath = CONFIG_PATH + '.tmp';
    fs.writeFileSync(tempPath, JSON.stringify(cleanConfig, null, 2));
    fs.renameSync(tempPath, CONFIG_PATH);

    log('[ekkOS Connect] Config file scrubbed - secrets removed from disk (hookApiKey preserved for CLI)');
    vscode.window.showInformationMessage(
      'ekkOS: Credentials migrated to secure storage for improved security.'
    );

  } catch (e) {
    logError('[ekkOS Connect] Secret migration failed:', e);
    // Don't throw - migration failure shouldn't block activation
  }
}

// ROOT FIX: Ensure hookApiKey exists on disk for CLI hooks
// Runs on startup if user is logged in but hookApiKey is missing from config.json
async function ensureHookApiKey(): Promise<void> {
  if (!extensionContext) return;

  const allowDiskApiKey = vscode.workspace.getConfiguration('ekkos').get<boolean>('allowDiskApiKey', true);
  if (!allowDiskApiKey) return;

  try {
    // Get API key from SecretStorage
    const apiKey = await extensionContext.secrets.get(SECRET_KEY_API_KEY);
    if (!apiKey) return; // Not logged in

    // Check if config.json exists and is missing hookApiKey
    if (!fs.existsSync(CONFIG_PATH)) return;

    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const diskConfig = JSON.parse(raw);

    // If hookApiKey already exists, we're good
    if (diskConfig.hookApiKey) return;

    // ROOT FIX: Add hookApiKey to existing config
    log('[ekkOS Connect] ROOT FIX: Adding missing hookApiKey to config.json for CLI hooks');
    const updatedConfig = {
      ...diskConfig,
      hookApiKey: apiKey
    };

    // Atomic write
    const tempPath = CONFIG_PATH + '.tmp';
    fs.writeFileSync(tempPath, JSON.stringify(updatedConfig, null, 2));
    if (process.platform !== 'win32') {
      try { fs.chmodSync(tempPath, 0o600); } catch { /* ignore */ }
    }
    fs.renameSync(tempPath, CONFIG_PATH);

    log('[ekkOS Connect] hookApiKey added - CLI hooks should now work');
  } catch (e) {
    logError('[ekkOS Connect] Failed to ensure hookApiKey:', e);
  }
}

/**
 * Auto-install @ekkos/cli globally in the background
 * This enables the `ekkos run -b` command for autonomous sessions
 */
async function autoInstallCli(): Promise<void> {
  const { spawn } = require('child_process');
  const isWindows = process.platform === 'win32';

  // First, check if already installed
  const checkInstalled = (): Promise<boolean> => {
    return new Promise((resolve) => {
      const cmd = isWindows ? 'where' : 'which';
      const proc = spawn(cmd, ['ekkos'], {
        shell: true,
        env: { ...process.env }
      });
      proc.on('close', (code: number) => resolve(code === 0));
      proc.on('error', () => resolve(false));
    });
  };

  const isInstalled = await checkInstalled();
  if (isInstalled) {
    log('[ekkOS CLI] Already installed globally');
    return;
  }

  log('[ekkOS CLI] Not found, installing @ekkos/cli globally...');

  // Show progress notification
  vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: 'ekkOS: Installing CLI tools...',
    cancellable: false
  }, async (progress) => {
    return new Promise<void>((resolve, reject) => {
      progress.report({ increment: 10, message: 'Running npm install -g @ekkos/cli' });

      // Use spawn with shell for cross-platform compatibility
      const proc = spawn('npm', ['install', '-g', '@ekkos/cli'], {
        shell: true,
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
        progress.report({ increment: 30 });
      });

      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on('close', (code: number) => {
        if (code === 0) {
          progress.report({ increment: 100, message: 'Installed!' });
          log('[ekkOS CLI] Successfully installed globally');
          vscode.window.showInformationMessage(
            '✓ ekkOS CLI installed! You can now use `ekkos run -b` for autonomous sessions.',
            'Learn More'
          ).then(selection => {
            if (selection === 'Learn More') {
              vscode.env.openExternal(vscode.Uri.parse('https://docs.ekkos.dev/cli'));
            }
          });
          resolve();
        } else {
          log(`[ekkOS CLI] Installation failed (code ${code}): ${stderr}`);
          // Don't show error to user - CLI is optional
          // They can install manually: npm install -g @ekkos/cli
          resolve(); // Don't reject - let extension continue
        }
      });

      proc.on('error', (err: Error) => {
        log(`[ekkOS CLI] Spawn error: ${err.message}`);
        resolve(); // Don't reject - let extension continue
      });

      // Timeout after 60 seconds
      setTimeout(() => {
        proc.kill();
        log('[ekkOS CLI] Installation timed out');
        resolve();
      }, 60000);
    });
  });
}

/**
 * Auto-install Claude Code globally on Windows and fix PATH
 * Required because ekkos run -b needs the `claude` command
 */
async function autoInstallClaudeCode(): Promise<void> {
  const { spawn, execSync } = require('child_process');
  const isWindows = process.platform === 'win32';

  // Only needed on Windows
  if (!isWindows) return;

  // Check if claude command is available
  const checkInstalled = (): Promise<boolean> => {
    return new Promise((resolve) => {
      const proc = spawn('where', ['claude'], {
        shell: true,
        env: { ...process.env }
      });
      proc.on('close', (code: number) => resolve(code === 0));
      proc.on('error', () => resolve(false));
    });
  };

  const isInstalled = await checkInstalled();
  if (isInstalled) {
    log('[Claude Code] Already installed and in PATH');
    return;
  }

  log('[Claude Code] Not found on Windows, installing globally...');

  // Show progress notification
  const result = await vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: 'ekkOS: Setting up Claude Code for Windows...',
    cancellable: false
  }, async (progress) => {
    return new Promise<{ success: boolean; npmPrefix?: string }>((resolve) => {
      progress.report({ increment: 10, message: 'Installing @anthropic-ai/claude-code...' });

      const proc = spawn('npm', ['install', '-g', '@anthropic-ai/claude-code'], {
        shell: true,
        env: { ...process.env },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stderr = '';

      proc.stdout?.on('data', () => {
        progress.report({ increment: 30 });
      });

      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on('close', (code: number) => {
        if (code === 0) {
          progress.report({ increment: 70, message: 'Checking PATH...' });
          log('[Claude Code] Successfully installed globally');

          // Get npm prefix to help with PATH
          try {
            const npmPrefix = execSync('npm config get prefix', { encoding: 'utf8' }).trim();
            resolve({ success: true, npmPrefix });
          } catch {
            resolve({ success: true });
          }
        } else {
          log(`[Claude Code] Installation failed (code ${code}): ${stderr}`);
          resolve({ success: false });
        }
      });

      proc.on('error', (err: Error) => {
        log(`[Claude Code] Spawn error: ${err.message}`);
        resolve({ success: false });
      });

      // Timeout after 120 seconds (Claude Code is larger)
      setTimeout(() => {
        proc.kill();
        log('[Claude Code] Installation timed out');
        resolve({ success: false });
      }, 120000);
    });
  });

  if (result.success) {
    // Check if claude is now available (might need PATH update)
    const nowInstalled = await checkInstalled();

    if (nowInstalled) {
      vscode.window.showInformationMessage(
        '✓ Claude Code installed! You can now use `claude` and `ekkos run -b`.',
        'Open Terminal'
      ).then(selection => {
        if (selection === 'Open Terminal') {
          vscode.commands.executeCommand('workbench.action.terminal.new');
        }
      });
    } else {
      // Installed but not in PATH - show fix instructions
      const npmBinPath = result.npmPrefix ? `${result.npmPrefix}` : '%APPDATA%\\npm';

      const selection = await vscode.window.showWarningMessage(
        `Claude Code installed but 'claude' command not in PATH.\n\nAdd this to your PATH: ${npmBinPath}`,
        'Copy Path',
        'Fix Automatically',
        'Show Instructions'
      );

      if (selection === 'Copy Path') {
        await vscode.env.clipboard.writeText(npmBinPath);
        vscode.window.showInformationMessage(`Copied "${npmBinPath}" to clipboard. Add it to your PATH and restart terminal.`);
      } else if (selection === 'Fix Automatically') {
        // Try to add to PATH via PowerShell
        try {
          execSync(`powershell -Command "[Environment]::SetEnvironmentVariable('Path', $env:Path + ';${npmBinPath}', 'User')"`, {
            encoding: 'utf8'
          });
          vscode.window.showInformationMessage(
            '✓ PATH updated! Open a NEW terminal window to use `claude` command.',
            'Open New Terminal'
          ).then(sel => {
            if (sel === 'Open New Terminal') {
              vscode.commands.executeCommand('workbench.action.terminal.new');
            }
          });
        } catch (e) {
          log(`[Claude Code] Failed to update PATH: ${e}`);
          vscode.window.showErrorMessage(
            `Failed to update PATH automatically. Please add "${npmBinPath}" to your PATH manually.`
          );
        }
      } else if (selection === 'Show Instructions') {
        const panel = vscode.window.createOutputChannel('ekkOS Windows Setup');
        panel.appendLine('═══════════════════════════════════════════════════════════════════');
        panel.appendLine('  Windows PATH Setup for Claude Code');
        panel.appendLine('═══════════════════════════════════════════════════════════════════');
        panel.appendLine('');
        panel.appendLine('  Claude Code was installed but the "claude" command is not in your PATH.');
        panel.appendLine('');
        panel.appendLine('  Option 1: PowerShell (run in admin terminal)');
        panel.appendLine('  ─────────────────────────────────────────────');
        panel.appendLine(`  $env:Path += ";${npmBinPath}"`);
        panel.appendLine(`  [Environment]::SetEnvironmentVariable("Path", $env:Path, "User")`);
        panel.appendLine('');
        panel.appendLine('  Option 2: System Settings');
        panel.appendLine('  ─────────────────────────');
        panel.appendLine('  1. Press Win+R, type "sysdm.cpl", press Enter');
        panel.appendLine('  2. Click "Advanced" tab → "Environment Variables"');
        panel.appendLine('  3. Under "User variables", find "Path" and click "Edit"');
        panel.appendLine(`  4. Click "New" and add: ${npmBinPath}`);
        panel.appendLine('  5. Click OK on all dialogs');
        panel.appendLine('  6. Open a NEW terminal window');
        panel.appendLine('');
        panel.appendLine('  After updating PATH, verify with:');
        panel.appendLine('    claude --version');
        panel.appendLine('');
        panel.appendLine('═══════════════════════════════════════════════════════════════════');
        panel.show();
      }
    }
  } else {
    // Installation failed - show manual instructions
    vscode.window.showErrorMessage(
      'Failed to install Claude Code. Please run: npm install -g @anthropic-ai/claude-code',
      'Copy Command'
    ).then(selection => {
      if (selection === 'Copy Command') {
        vscode.env.clipboard.writeText('npm install -g @anthropic-ai/claude-code');
      }
    });
  }
}

// Save public config to disk, secrets to SecretStorage
async function saveConfigAsync(config: EkkosConfig): Promise<void> {
  if (!extensionContext) {
    throw new Error('Extension context not initialized');
  }

  // Detect if a different user is signing in
  const previousConfig = currentConfig;
  const isUserSwitch = previousConfig && previousConfig.userId !== config.userId;

  ensureEkkosDir();

  // Store secrets in SecretStorage (encrypted by VS Code)
  await extensionContext.secrets.store(SECRET_KEY_TOKEN, config.token);
  await extensionContext.secrets.store(SECRET_KEY_API_KEY, config.apiKey);

  // Store config in JSON file
  // Check if disk key storage is allowed (for CLI hooks like Cursor/Claude Code)
  const allowDiskApiKey = vscode.workspace.getConfiguration('ekkos').get<boolean>('allowDiskApiKey', true);

  // NOTE: hookApiKey is stored on disk because CLI hooks run outside VS Code
  // and cannot access SecretStorage. This is a scoped key specifically for hooks.
  // File permissions are restricted to owner-only (chmod 600)
  const publicConfig: EkkosPublicConfig & { hookApiKey?: string } = {
    userId: config.userId,
    email: config.email,
    tier: config.tier,
    createdAt: config.createdAt,
    patternScope: config.patternScope,
    // Context Guardian settings (read by CLI hooks)
    contextGuardian: config.contextGuardian,
    // Only store hookApiKey on disk if setting allows it
    ...(allowDiskApiKey ? { hookApiKey: config.apiKey } : {})
  };

  if (allowDiskApiKey) {
    console.log('[ekkOS Connect] Hook API key stored on disk (ekkos.allowDiskApiKey=true)');
  } else {
    console.log('[ekkOS Connect] Disk key storage disabled - CLI hooks will not work');
  }

  // Atomic write: write to temp file first, then rename
  const tempPath = CONFIG_PATH + '.tmp';
  try {
    fs.writeFileSync(tempPath, JSON.stringify(publicConfig, null, 2));
    // Set secure file permissions BEFORE renaming (owner read/write only)
    if (process.platform !== 'win32') {
      try {
        fs.chmodSync(tempPath, 0o600);
      } catch {
        // Ignore chmod errors (e.g., on some network mounts)
      }
    }
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
  startContextMonitor();  // Start Endless Context monitoring
  startAutoClearFlagWatcher();  // Watch for auto-clear flag from stop hook

  // Log account switch for debugging - MCP config will be auto-deployed and reloaded by autoDeployToCurrentIde()
  if (isUserSwitch) {
    console.log(`[ekkOS Connect] User switched from ${previousConfig.userId} to ${config.userId}`);
    console.log(`[ekkOS Connect] MCP config will be updated and window reload offered...`);
  }
}

// ============ Authentication (Device Code Flow - RFC 8628) ============

// Guard to prevent multiple concurrent auth attempts
let isAuthenticating = false;
let lastAuthTime = 0;

/**
 * Start authentication using Device Authorization Flow
 * User gets a code to enter at platform.ekkos.dev/verify/[code]
 * Extension polls for approval - no URI callback needed
 */
async function startAuth(context: vscode.ExtensionContext, _selectedIde?: string) {
  const now = Date.now();
  log(`[ekkOS Auth] startAuth called. isAuthenticating=${isAuthenticating}, timeSinceLast=${now - lastAuthTime}ms`);

  // Prevent multiple concurrent auth attempts
  if (isAuthenticating) {
    log('[ekkOS Auth] BLOCKED - already authenticating');
    vscode.window.showWarningMessage('Authentication already in progress. Check for existing approval notification.');
    return;
  }

  // Prevent rapid re-triggering (within 5 seconds of completion)
  if (now - lastAuthTime < 5000 && currentConfig?.apiKey) {
    log('[ekkOS Auth] BLOCKED - recently completed auth and already logged in');
    return;
  }

  isAuthenticating = true;

  try {
    log('[ekkOS Auth] Starting device code flow...');

    // 1. Request device code from backend
    const response = await fetch(`${getPlatformUrl()}/api/device-auth/codes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get device code: ${errorText}`);
    }

    const { code, verificationUrl, expiresIn } = await response.json() as { code: string; verificationUrl: string; expiresIn: number };
    log(`[ekkOS Auth] Got device code: ${code}, expires in ${expiresIn}s`);

    // 2. Show code to user with options
    const selection = await vscode.window.showInformationMessage(
      `Your code: ${code}\n\nEnter this code at: ${verificationUrl}`,
      { modal: true },
      'Open Browser',
      'Copy Code'
    );

    if (selection === 'Open Browser') {
      await vscode.env.openExternal(vscode.Uri.parse(verificationUrl));
    } else if (selection === 'Copy Code') {
      await vscode.env.clipboard.writeText(code);
      vscode.window.showInformationMessage(
        `Code ${code} copied! Open ${verificationUrl} in your browser.`
      );
    } else {
      // User cancelled
      isAuthenticating = false;
      return;
    }

    // 3. Start polling for approval
    try {
      await pollForApproval(context, code, expiresIn);
    } finally {
      log('[ekkOS Auth] Polling complete, resetting isAuthenticating');
      isAuthenticating = false;
      lastAuthTime = Date.now();
    }
  } catch (error: any) {
    logError('[ekkOS Auth] Device auth error:', error);
    isAuthenticating = false;
    lastAuthTime = Date.now();
    vscode.window.showErrorMessage(`Authentication failed: ${error.message}`);
  }
}

/**
 * Poll the device auth endpoint until approved, denied, or expired
 */
async function pollForApproval(
  context: vscode.ExtensionContext,
  code: string,
  expiresIn: number
): Promise<void> {
  const pollInterval = 3000; // 3 seconds
  const maxAttempts = Math.floor((expiresIn * 1000) / pollInterval);

  return vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: `Waiting for approval... Code: ${code}`,
    cancellable: true
  }, async (progress, cancelToken) => {
    let attempts = 0;

    while (attempts < maxAttempts) {
      if (cancelToken.isCancellationRequested) {
        log('[ekkOS Auth] Polling cancelled by user');
        return;
      }

      try {
        const response = await fetch(
          `${getPlatformUrl()}/api/device-auth/codes/${code}/status`
        );
        const data = await response.json() as { status: string; user_id?: string; user_email?: string };
        log(`[ekkOS Auth] Poll response: status=${data.status}, user_id=${data.user_id}, user_email=${data.user_email}`);

        if (data.status === 'approved') {
          // Wrap in try-catch to ensure we always return (dismissing the progress notification)
          try {
            // Generate API key for the approved user
            log(`[ekkOS Auth] Approved! user_email=${data.user_email}. Generating API key...`);
            const keyResponse = await fetch(
              `${getPlatformUrl()}/api/auth/extension/generate`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId: data.user_id,
                  email: data.user_email
                })
              }
            );

            if (!keyResponse.ok) {
              const keyError = await keyResponse.text();
              logError('[ekkOS Auth] API key generation failed:', keyError);
              vscode.window.showErrorMessage(`Failed to generate API key: ${keyError}`);
              return; // Exit cleanly to dismiss progress
            }

            const keyData = await keyResponse.json() as { email?: string; tier?: string; apiKey?: string };
            log(`[ekkOS Auth] API key generated. email=${keyData.email}, tier=${keyData.tier}, apiKey=${keyData.apiKey?.substring(0, 12)}...`);

            // Context Guardian defaults for new users
            const guardianDefaults: ContextGuardianConfig = {
              enabled: true,
              autoPreserve: true,
              autoRestore: true,
              silentRestore: true,
              tokenThreshold: 0.90,
              maxCompactions: 5,
              cooldownMs: 60000
            };

            // Save config with Context Guardian defaults
            const config: EkkosConfig = {
              userId: data.user_id || '',
              email: keyData.email || data.user_email || '',
              token: 'device-auth',
              apiKey: keyData.apiKey || '',
              tier: (keyData.tier as 'free' | 'pro' | 'team' | 'enterprise') || 'free',
              createdAt: new Date().toISOString(),
              contextGuardian: guardianDefaults
            };

            log(`[ekkOS Auth] Saving config... email=${config.email}, userId=${config.userId}, tier=${config.tier}`);
            await saveConfigAsync(config);

            // Update global config so sidebar shows logged-in state
            currentConfig = config;
            log('[ekkOS Auth] Config saved, starting full setup wizard...');

            // Run the full automated setup wizard with animated progress
            // This runs in the background after we return (dismissing the progress notification)
            setTimeout(async () => {
              try {
                await runFullSetup(context);
              } catch (setupErr: any) {
                logError('[ekkOS Auth] Full setup error:', setupErr);
              }
            }, 100);

            log('[ekkOS Auth] Returning from approved handler');
            return; // This dismisses the "Waiting for approval" progress notification
          } catch (approvedErr: any) {
            logError('[ekkOS Auth] Error in approved handler:', approvedErr);
            vscode.window.showErrorMessage(`Auth error: ${approvedErr.message}`);
            return; // Still return to dismiss progress notification
          }
        }

        if (data.status === 'denied') {
          vscode.window.showErrorMessage('Authorization was denied.');
          return;
        }

        if (data.status === 'expired' || response.status === 410) {
          vscode.window.showErrorMessage('Code expired. Please try again.');
          return;
        }

        // Still pending - continue polling
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        attempts++;
        progress.report({ increment: 100 / maxAttempts });
      } catch (error: any) {
        console.warn('[ekkOS Auth] Poll error (will retry):', error.message);
        // Network error - continue trying
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        attempts++;
      }
    }

    vscode.window.showErrorMessage('Authorization timed out. Please try again.');
  });
}

// Legacy OAuth callback handler (kept for backwards compatibility)
let authTimeoutHandle: ReturnType<typeof setTimeout> | null = null;

// IDE configurations for the selector
// Note: 'id' is the URI scheme used for OAuth callback
const SUPPORTED_IDES = [
  { id: 'cursor', name: 'Cursor', icon: '🔵' },
  { id: 'vscode', name: 'VS Code', icon: '💙' },
  { id: 'vscode-insiders', name: 'VS Code Insiders', icon: '💚' },
  { id: 'windsurf', name: 'Windsurf', icon: '🌊' },
  { id: 'codium', name: 'VSCodium', icon: '🟢' },
  { id: 'claude', name: 'Claude Code', icon: '💜' },
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

  // Token is now optional (placeholder 'oauth-session' is used for OAuth flow)
  // Email might be missing for some OAuth providers
  if (!userId || !apiKey) {
    vscode.window.showErrorMessage('Authentication failed: Missing credentials');
    return;
  }

  // Validate API key format
  if (!apiKey.startsWith('ekk_') || apiKey.length < 20) {
    vscode.window.showErrorMessage('Authentication failed: Invalid API key format. Please try again.');
    return;
  }

  // Save config - use defaults for optional fields
  // Enable Context Guardian by default for Claude Code users
  const contextGuardianDefaults: ContextGuardianConfig = {
    enabled: true,
    autoPreserve: true,
    autoRestore: true,
    silentRestore: true,
    tokenThreshold: 0.90,
    maxCompactions: 5,
    cooldownMs: 60000
  };

  const config: EkkosConfig = {
    userId,
    email: email || '',
    token: token || 'oauth-session',
    apiKey,
    tier: tier || 'free',
    createdAt: new Date().toISOString(),
    contextGuardian: contextGuardianDefaults
  };
  await saveConfigAsync(config);

  // Auto-deploy Context Guardian agent for Claude Code users
  const currentIdeForGuardian = detectCurrentIDE();
  if (currentIdeForGuardian === 'claude-code') {
    await setupContextGuardianAgent();
  }

  // Auto-deploy to current IDE immediately (no user action needed)
  const currentIDE = detectCurrentIDE();
  const ideName = currentIDE === 'windsurf' ? 'Windsurf' 
    : currentIDE === 'cursor' ? 'Cursor'
    : currentIDE === 'claude-code' ? 'Claude Code'
    : currentIDE === 'vscode' ? 'VS Code'
    : 'your IDE';
  
  // Show success message
  vscode.window.showInformationMessage(
    `✓ Connected as ${email}! Configuring ${ideName}...`,
    'View Status'
  ).then(selection => {
    if (selection === 'View Status') {
      sidebarProvider?.refresh();
    }
  });

  // Auto-deploy MCP to current IDE automatically (happens in background)
  await autoDeployToCurrentIde();
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

    const response = await fetch(`${getMcpApiUrl()}/api/v1/me`, {
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
    await saveConfigAsync(config);

    // Auto-deploy to current IDE immediately
    const currentIDE = detectCurrentIDE();
    const ideName = currentIDE === 'windsurf' ? 'Windsurf' 
      : currentIDE === 'cursor' ? 'Cursor'
      : currentIDE === 'claude-code' ? 'Claude Code'
      : currentIDE === 'vscode' ? 'VS Code'
      : 'your IDE';
    
    vscode.window.showInformationMessage(
      `✓ Connected as ${data.user.email}! Configuring ${ideName}...`,
      'View Status'
    ).then(selection => {
      if (selection === 'View Status') {
        sidebarProvider?.refresh();
      }
    });

    // Auto-deploy MCP to current IDE automatically
    await autoDeployToCurrentIde();
  } catch (e: any) {
    if (e.name === 'AbortError') {
      vscode.window.showErrorMessage('API validation timed out. Please check your connection.');
    } else {
      vscode.window.showErrorMessage('Failed to validate API key: ' + e.message);
    }
  }
}

async function togglePatternScope() {
  if (!currentConfig) {
    vscode.window.showErrorMessage('Not connected to ekkOS');
    return;
  }

  const scopes: Array<'both' | 'personal' | 'collective'> = ['both', 'personal', 'collective'];
  const currentScope = currentConfig.patternScope || 'both';
  const currentIndex = scopes.indexOf(currentScope as 'both' | 'personal' | 'collective');
  const nextScope = scopes[(currentIndex + 1) % scopes.length];

  // Update config
  currentConfig.patternScope = nextScope;
  await saveConfigAsync(currentConfig);

  // Show notification with icon
  const icons: Record<string, string> = { both: '●', personal: 'P', collective: 'C' };
  const labels: Record<string, string> = { both: 'Personal + Collective', personal: 'Personal Only', collective: 'All Users' };

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

  // Claude Code CLI (uses ~/.claude.json for MCP servers - NOT settings.json!)
  const claudeCodeCliConfig = path.join(homeDir, '.claude.json');
  configs.push({
    name: 'Claude Code',
    configPath: claudeCodeCliConfig,
    exists: true, // Claude Code CLI dir can be created if missing
    deployed: false
  });

  // Claude Desktop App (claude_desktop_config.json) - separate from CLI
  const claudeDesktopConfig = process.platform === 'darwin'
    ? path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json')
    : process.platform === 'win32'
      ? path.join(process.env.APPDATA || homeDir, 'Claude', 'claude_desktop_config.json')
      : path.join(homeDir, '.config', 'Claude', 'claude_desktop_config.json');
  configs.push({
    name: 'Claude Desktop',
    configPath: claudeDesktopConfig,
    exists: fs.existsSync(path.dirname(claudeDesktopConfig)),
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

/**
 * Get configuration for the current IDE only
 * Much simpler than getting all IDE configs
 */
function getCurrentIdeConfig(): IDEConfig | null {
  const currentIDE = detectCurrentIDE();
  const homeDir = os.homedir();
  
  // Map current IDE to its config path
  let configPath: string;
  let ideName: string;
  
  if (currentIDE === 'windsurf') {
    configPath = path.join(homeDir, '.codeium', 'windsurf', 'mcp_config.json');
    ideName = 'Windsurf';
  } else if (currentIDE === 'cursor') {
    configPath = path.join(homeDir, '.cursor', 'mcp.json');
    ideName = 'Cursor';
  } else if (currentIDE === 'claude-code') {
    // Claude Code uses ~/.claude.json for MCP servers (NOT settings.json!)
    configPath = path.join(homeDir, '.claude.json');
    ideName = 'Claude Code';
  } else if (currentIDE === 'vscode') {
    // VS Code uses Cursor's config format
    configPath = path.join(homeDir, '.cursor', 'mcp.json');
    ideName = 'VS Code';
  } else {
    // Unknown IDE
    return null;
  }
  
  return {
    name: ideName,
    configPath,
    exists: fs.existsSync(path.dirname(configPath)),
    deployed: false
  };
}

/**
 * Automatically deploy MCP config to the current IDE only
 * Called after login - simple, direct, no mess
 */
async function autoDeployToCurrentIde(): Promise<void> {
  if (!currentConfig) {
    return;
  }

  const currentIDE = detectCurrentIDE();
  const ideConfig = getCurrentIdeConfig();
  
  if (!ideConfig) {
    // Unknown IDE - show generic message
    vscode.window.showInformationMessage('ekkOS memory is ready! Configure your AI agent manually at platform.ekkos.dev');
    return;
  }

  if (!ideConfig.exists) {
    // IDE directory doesn't exist
    const message = currentIDE === 'windsurf' 
      ? 'Windsurf configuration directory not found. Make sure Windsurf is installed.'
      : currentIDE === 'cursor'
      ? 'Cursor configuration directory not found. Make sure Cursor is installed.'
      : 'Configuration directory not found.';
    
    vscode.window.showWarningMessage(message);
    return;
  }

  // Check if config needs updating (credentials changed or not configured)
  let needsConfig = false;
  let credentialsChanged = false;
  try {
    if (fs.existsSync(ideConfig.configPath)) {
      const content = fs.readFileSync(ideConfig.configPath, 'utf8');
      if (!content.includes('ekkos-memory') && !content.includes('ekkos')) {
        needsConfig = true;
      } else {
        // Check if API key in config matches current user's API key
        try {
          const existingConfig = JSON.parse(content);
          const existingApiKey = existingConfig?.mcpServers?.['ekkos-memory']?.env?.EKKOS_API_KEY;
          if (existingApiKey && existingApiKey !== currentConfig.apiKey) {
            needsConfig = true;
            credentialsChanged = true;
            console.log('[ekkOS Connect] Credentials changed - updating MCP config');
          }
        } catch {
          // If parsing fails, re-deploy to be safe
          needsConfig = true;
        }
      }
    } else {
      needsConfig = true;
    }
  } catch {
    needsConfig = true;
  }

  if (!needsConfig) {
    // Already configured with correct credentials, just verify connection
    await checkIdeConnections();
    return;
  }

  // Deploy to current IDE
  try {
    await deployToIde(ideConfig, currentConfig);

    // AUTO-DEPLOY HOOKS for Claude Code - "Set it and forget it" context continuity
    // This deploys hooks that enable seamless compaction recovery without user action
    if (currentIDE === 'claude-code' || currentIDE === 'vscode') {
      try {
        await deployGlobalHooksQuietly();
        log('[ekkOS Connect] Auto-deployed global hooks for context continuity');
      } catch (hookErr) {
        // Don't fail the whole deployment if hooks fail
        log(`[ekkOS Connect] Hook deployment skipped: ${hookErr}`);
      }
    }

    // Update connection status
    ideConnectionStatus.set(ideConfig.name, {
      status: 'checking',
      lastChecked: new Date()
    });
    
    // Show IDE-specific success message with auto-reload option for credential changes
    if (credentialsChanged && (currentIDE === 'cursor' || currentIDE === 'vscode')) {
      // Offer automatic window reload for VS Code-based IDEs
      const selection = await vscode.window.showInformationMessage(
        `✓ Account switched! MCP config updated for ${ideConfig.name}. Reload window to use new credentials?`,
        'Reload Now',
        'Later'
      );
      if (selection === 'Reload Now') {
        await vscode.commands.executeCommand('workbench.action.reloadWindow');
      }
    } else {
      const restartMessage = currentIDE === 'windsurf'
        ? 'Restart Windsurf to activate ekkOS memory.'
        : currentIDE === 'cursor'
        ? 'Reload Cursor window (Cmd+Shift+P → "Reload Window") to activate ekkOS memory.'
        : credentialsChanged
        ? 'Restart your IDE to use the new credentials.'
        : 'Restart your IDE to activate ekkOS memory.';

      vscode.window.showInformationMessage(
        `✓ ${ideConfig.name} configured! ${restartMessage}`,
        'View Status'
      ).then(selection => {
        if (selection === 'View Status') {
          sidebarProvider?.refresh();
        }
      });
    }
  } catch (e: any) {
    vscode.window.showErrorMessage(`Failed to configure ${ideConfig.name}: ${e.message}`);
    ideConnectionStatus.set(ideConfig.name, { 
      status: 'error', 
      lastChecked: new Date(),
      error: e.message 
    });
  }

  // Verify connection after deployment
  await checkIdeConnections();
  sidebarProvider?.refresh();
}

async function deployMcpConfig() {
  if (!currentConfig) {
    vscode.window.showErrorMessage('Please connect to ekkOS first');
    return;
  }

  const ideConfigs = getIdeConfigs();
  const results: string[] = [];
  const deployedIdes: string[] = [];

  for (const ide of ideConfigs) {
    if (!ide.exists) {
      results.push(`${ide.name}: Not installed`);
      continue;
    }

    try {
      await deployToIde(ide, currentConfig);
      results.push(`${ide.name}: Deployed ✓`);
      deployedIdes.push(ide.name);
    } catch (e: any) {
      results.push(`${ide.name}: Failed - ${e.message}`);
    }
  }

  // Show results with restart prompt for Claude-based IDEs
  const claudeDeployed = deployedIdes.some(name => name.includes('Claude'));
  const cursorDeployed = deployedIdes.includes('Cursor');

  let restartMessage = '';
  if (claudeDeployed || cursorDeployed) {
    restartMessage = '\n\n⚠️ IMPORTANT: You must restart your AI tool to load the new MCP server.';
    if (claudeDeployed) {
      restartMessage += '\n• Claude Code: Run "claude" again in terminal';
      restartMessage += '\n• Claude Desktop: Quit and reopen the app';
    }
    if (cursorDeployed) {
      restartMessage += '\n• Cursor: Use Cmd+Shift+P → "Reload Window"';
    }
  }

  // Determine which restart action to show based on deployed IDEs
  const showClaudeRestart = claudeDeployed;
  const showCursorReload = cursorDeployed && !claudeDeployed;

  const buttons = ['View Details', 'Test Connection'];
  if (showClaudeRestart) {
    buttons.unshift('⚠️ RESTART REQUIRED');
  } else if (showCursorReload) {
    buttons.unshift('Reload Window');
  }

  const selection = await vscode.window.showWarningMessage(
    `MCP Config Deployed!\n${results.filter(r => r.includes('✓')).length} of ${ideConfigs.filter(i => i.exists).length} IDEs configured.\n\n⚠️ You MUST restart your AI tool for changes to take effect!${restartMessage}`,
    ...buttons
  );

  if (selection === '⚠️ RESTART REQUIRED') {
    // Show detailed restart instructions
    const restartChoice = await vscode.window.showInformationMessage(
      'To activate ekkOS MCP:\n\n' +
      '1. Exit Claude Code (close terminal)\n' +
      '2. Run "claude" again\n' +
      '3. Verify with: claude mcp list\n\n' +
      'The ekkos-memory server should appear in the list.',
      'Copy Verify Command',
      'Open Docs'
    );
    if (restartChoice === 'Copy Verify Command') {
      await vscode.env.clipboard.writeText('claude mcp list');
      vscode.window.showInformationMessage('Copied "claude mcp list" to clipboard');
    } else if (restartChoice === 'Open Docs') {
      vscode.env.openExternal(vscode.Uri.parse('https://docs.ekkos.dev/setup/claude-code'));
    }
  } else if (selection === 'Reload Window') {
    await vscode.commands.executeCommand('workbench.action.reloadWindow');
  } else if (selection === 'View Details') {
    const panel = vscode.window.createOutputChannel('ekkOS Deploy');
    panel.appendLine('═══════════════════════════════════════════════════════════════════');
    panel.appendLine('  ekkOS MCP Config Deployment Results');
    panel.appendLine('═══════════════════════════════════════════════════════════════════');
    panel.appendLine('');
    results.forEach(r => panel.appendLine('  ' + r));
    panel.appendLine('');
    panel.appendLine('───────────────────────────────────────────────────────────────────');
    panel.appendLine('  WHAT WAS INSTALLED');
    panel.appendLine('───────────────────────────────────────────────────────────────────');
    panel.appendLine('');
    panel.appendLine('  📦 MCP Server: @ekkos/mcp-server@latest');
    panel.appendLine('     → Runs via npx (no global install required)');
    panel.appendLine('     → Provides 30+ memory tools to your AI assistant');
    panel.appendLine('     → Connects to ekkOS cloud for pattern storage');
    panel.appendLine('');
    panel.appendLine('───────────────────────────────────────────────────────────────────');
    panel.appendLine('  NEXT STEPS');
    panel.appendLine('───────────────────────────────────────────────────────────────────');
    panel.appendLine('');
    panel.appendLine('  1. RESTART your AI tool to load the MCP server');
    panel.appendLine('     • Claude Code: Exit and run "claude" again');
    panel.appendLine('     • Cursor: Cmd/Ctrl+Shift+P → "Reload Window"');
    panel.appendLine('     • Windsurf: Restart the app');
    panel.appendLine('');
    panel.appendLine('  2. TEST the connection by asking:');
    panel.appendLine('     "Search my ekkOS memory for patterns"');
    panel.appendLine('');
    panel.appendLine('  3. If issues persist, test MCP manually:');
    panel.appendLine('     npx -y @ekkos/mcp-server@latest');
    panel.appendLine('');
    panel.appendLine('───────────────────────────────────────────────────────────────────');
    panel.appendLine('  OPTIONAL: AUTONOMOUS MODE (Claude Wrapper)');
    panel.appendLine('───────────────────────────────────────────────────────────────────');
    panel.appendLine('');
    panel.appendLine('  For 24/7 autonomous sessions with auto context management:');
    panel.appendLine('');
    panel.appendLine('  1. Install the CLI globally:');
    panel.appendLine('     npm install -g @ekkos/cli');
    panel.appendLine('');
    panel.appendLine('  2. Run Claude with ekkOS wrapper:');
    panel.appendLine('     ekkos run -b');
    panel.appendLine('');
    panel.appendLine('  This gives you:');
    panel.appendLine('     → Automatic /clear + /continue when context fills');
    panel.appendLine('     → Session persistence across restarts');
    panel.appendLine('     → Background context management');
    panel.appendLine('');
    panel.appendLine('  Learn more: https://docs.ekkos.dev/cli');
    panel.appendLine('');
    panel.appendLine('═══════════════════════════════════════════════════════════════════');
    panel.show();
  } else if (selection === 'Test Connection') {
    await testMcpConnection();
  }

  sidebarProvider?.refresh();
}

/**
 * Test MCP connection by calling the health endpoint
 */
async function testMcpConnection() {
  if (!currentConfig) {
    vscode.window.showErrorMessage('Please connect to ekkOS first');
    return;
  }

  try {
    const response = await fetch(`${getMcpApiUrl()}/health`, {
      headers: {
        'Authorization': `Bearer ${currentConfig.apiKey}`
      }
    });

    if (response.ok) {
      vscode.window.showInformationMessage(
        '✓ ekkOS MCP Gateway is healthy! Your AI tool should be able to connect after restart.'
      );
    } else if (response.status === 404) {
      vscode.window.showWarningMessage(
        `MCP Gateway route not found (404). The API endpoint may have changed - try updating the extension.`
      );
    } else if (response.status === 401 || response.status === 403) {
      vscode.window.showWarningMessage(
        `MCP Gateway authentication failed (${response.status}). Check your API key at platform.ekkos.dev`
      );
    } else {
      vscode.window.showWarningMessage(
        `MCP Gateway returned status ${response.status}. Try again or check status at platform.ekkos.dev`
      );
    }
  } catch (error: any) {
    vscode.window.showErrorMessage(
      `Could not reach MCP Gateway: ${error.message}. Check your internet connection.`
    );
  }
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

  // Use command-based MCP server for all IDEs
  // This is more reliable and consistent across different IDE versions
  // The @ekkos/mcp-server@latest only requires EKKOS_API_KEY (no infrastructure secrets)
  mcpConfig = {
    mcpServers: {
      'ekkos-memory': {
        command: 'npx',
        args: ['-y', '@ekkos/mcp-server@latest'],
        env: {
          EKKOS_API_KEY: config.apiKey,
          EKKOS_USER_ID: config.userId
        }
      }
    }
  };

  // Merge with existing config if present
  if (fs.existsSync(ide.configPath)) {
    const rawContent = fs.readFileSync(ide.configPath, 'utf8');

    try {
      const existing = JSON.parse(rawContent);

      // Count existing MCP servers for user awareness
      const existingServerCount = existing.mcpServers ? Object.keys(existing.mcpServers).length : 0;
      const existingServerNames = existing.mcpServers ? Object.keys(existing.mcpServers) : [];

      // Check if we're about to update an existing ekkos-memory config
      const hasExistingEkkos = existingServerNames.includes('ekkos-memory');

      finalConfig = {
        ...existing,
        mcpServers: {
          ...existing.mcpServers,
          ...mcpConfig.mcpServers
        }
      };

      // Log what we're preserving
      if (existingServerCount > 0) {
        const otherServers = existingServerNames.filter(n => n !== 'ekkos-memory');
        if (otherServers.length > 0) {
          log(`[MCP Deploy] Preserving ${otherServers.length} existing MCP servers: ${otherServers.join(', ')}`);
        }
        if (hasExistingEkkos) {
          log(`[MCP Deploy] Updating existing ekkos-memory config`);
        }
      }
    } catch (parseError) {
      // JSON is malformed - try to recover
      log(`[MCP Deploy] Warning: Existing config is malformed JSON, attempting recovery...`);

      // Create backup before overwriting
      const backupPath = ide.configPath + '.bak';
      try {
        fs.writeFileSync(backupPath, rawContent);
        log(`[MCP Deploy] Backup saved to ${backupPath}`);
      } catch {
        // Backup failed, continue anyway
      }

      // Try common JSON fixes
      let fixedContent = rawContent;
      try {
        // Remove trailing commas (common mistake)
        fixedContent = rawContent.replace(/,(\s*[}\]])/g, '$1');
        // Try parsing again
        const existing = JSON.parse(fixedContent);
        finalConfig = {
          ...existing,
          mcpServers: {
            ...existing.mcpServers,
            ...mcpConfig.mcpServers
          }
        };
        log(`[MCP Deploy] Fixed malformed JSON and merged successfully`);
      } catch {
        // Still can't parse - warn user and use fresh config
        log(`[MCP Deploy] Could not recover config, using fresh ekkOS config only`);
        vscode.window.showWarningMessage(
          `Your ${ide.name} config (${ide.configPath}) had invalid JSON. A backup was saved as .bak. Only ekkOS MCP was added.`,
          'Show Backup Location'
        ).then(selection => {
          if (selection === 'Show Backup Location') {
            vscode.env.openExternal(vscode.Uri.file(path.dirname(ide.configPath)));
          }
        });
        finalConfig = mcpConfig;
      }
    }
  } else {
    finalConfig = mcpConfig;
  }

  fs.writeFileSync(ide.configPath, JSON.stringify(finalConfig, null, 2));
  ide.deployed = true;
}

/**
 * Deploy ekkOS MCP config to OpenAI Codex (TOML format)
 * Uses command-based config for consistency with other IDEs
 */
async function deployToCodex(ide: IDEConfig, config: EkkosConfig) {
  const dir = path.dirname(ide.configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // ekkOS MCP server config in TOML format (command-based)
  // Uses @ekkos/mcp-server@latest - only requires EKKOS_API_KEY
  const ekkosToml = `
# ═══════════════════════════════════════════════════════════════════════════
# ekkOS Memory - AI memory system with 10-layer architecture
# https://ekkos.dev (configured by ekkOS Connect extension)
# ═══════════════════════════════════════════════════════════════════════════
[mcp_servers.ekkos-memory]
command = "npx"
args = ["-y", "@ekkos/mcp-server@latest"]

[mcp_servers.ekkos-memory.env]
EKKOS_API_KEY = "${config.apiKey}"
EKKOS_USER_ID = "${config.userId}"
`;

  let existingContent = '';
  if (fs.existsSync(ide.configPath)) {
    existingContent = fs.readFileSync(ide.configPath, 'utf8');
  }

  // Check if ekkOS is already configured (handle both old and new section names)
  if (existingContent.includes('[mcp_servers.ekkos]') || existingContent.includes('[mcp_servers.ekkos-memory]')) {
    // Update existing config - replace the ekkos section (handles both old and new names)
    const updatedContent = existingContent.replace(
      /# ═+\n# ekkOS Memory[\s\S]*?\[mcp_servers\.ekkos(?:-memory)?\][\s\S]*?(?=\n\[|$)/,
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

// ============ Claude Code Plugin Deployment ============

async function deployClaudePlugins() {
  const homeDir = os.homedir();
  const claudePluginsDir = path.join(homeDir, '.claude', 'plugins', 'ekkos');

  try {
    // Create plugins directory
    fs.mkdirSync(claudePluginsDir, { recursive: true });

    // Plugin list to deploy (USER-FOCUSED: portable, universal)
    const plugins = [
      'memory-lens',                // Search & explore what ekkOS knows
      'pattern-coach',              // Interactive pattern forging
      'learning-tracker',           // Personal dashboard & growth
      'golden-loop-monitor',        // Loop health & troubleshooting
      'project-schema-validator'    // Validate user project schemas
    ];

    let deployedCount = 0;
    const extensionPath = path.join(__dirname, '..');

    for (const plugin of plugins) {
      const sourceDir = path.join(extensionPath, 'templates', 'claude-plugins', plugin);
      const destDir = path.join(claudePluginsDir, plugin);

      if (fs.existsSync(sourceDir)) {
        // Copy plugin directory recursively
        copyDirectoryRecursive(sourceDir, destDir);
        deployedCount++;
      } else {
        console.warn(`Plugin template not found: ${sourceDir}`);
      }
    }

    // Deploy Context Guardian agent (automatic context preservation)
    const claudeAgentsDir = path.join(homeDir, '.claude', 'agents');
    fs.mkdirSync(claudeAgentsDir, { recursive: true });

    const agentsSourceDir = path.join(extensionPath, 'templates', 'agents');
    if (fs.existsSync(agentsSourceDir)) {
      const agentFiles = fs.readdirSync(agentsSourceDir);
      for (const file of agentFiles) {
        if (file.endsWith('.json')) {
          const sourcePath = path.join(agentsSourceDir, file);
          const destPath = path.join(claudeAgentsDir, file);
          fs.copyFileSync(sourcePath, destPath);
        }
      }
    }

    if (deployedCount > 0) {
      vscode.window.showInformationMessage(
        `✅ Deployed ${deployedCount} ekkOS plugins + Context Guardian agent!\n\n📦 Plugins:\n• /memory-search - Search your patterns\n• /forge - Create patterns interactively\n• /my-patterns - View your dashboard\n• /loop-status - Check Golden Loop health\n• /validate-schema - Validate project schemas\n\n🛡️ Context Guardian:\nAutomatic context preservation before Claude Code compaction\n• No setup required - works automatically\n• See ~/.claude/agents/context-guardian-guide.md for details`,
        'Open Plugin Directory',
        'Learn More'
      ).then(selection => {
        if (selection === 'Open Plugin Directory') {
          vscode.env.openExternal(vscode.Uri.file(claudePluginsDir));
        } else if (selection === 'Learn More') {
          vscode.env.openExternal(vscode.Uri.parse('https://docs.ekkos.dev/plugins'));
        }
      });
    } else {
      vscode.window.showWarningMessage('No plugin templates found. Please reinstall ekkos-connect.');
    }
  } catch (error) {
    console.error('Failed to deploy Claude plugins:', error);
    vscode.window.showErrorMessage(`Failed to deploy plugins: ${error}`);
  }
}

/**
 * Setup Context Guardian agent and configuration for Claude Code users
 * This runs automatically after authentication to enable context preservation
 */
async function setupContextGuardianAgent(): Promise<void> {
  const claudeDir = getClaudeDir();
  const claudeAgentsDir = path.join(claudeDir, 'agents');
  const extensionPath = path.join(__dirname, '..');

  try {
    // Create agents directory
    fs.mkdirSync(claudeAgentsDir, { recursive: true });

    // Deploy context-guardian.json agent
    const agentSource = path.join(extensionPath, 'templates', 'agents', 'context-guardian.json');
    const agentDest = path.join(claudeAgentsDir, 'context-guardian.json');

    if (fs.existsSync(agentSource)) {
      fs.copyFileSync(agentSource, agentDest);
      log(`[ekkOS Connect] Context Guardian agent deployed to ${claudeAgentsDir}`);
    }

    // Create restoration tokens directory
    const tokensDir = path.join(claudeDir, 'restoration_tokens');
    fs.mkdirSync(tokensDir, { recursive: true });

    // Create snapshots directory for local fallback
    const snapshotsDir = path.join(claudeDir, 'snapshots');
    fs.mkdirSync(snapshotsDir, { recursive: true });

    log('[ekkOS Connect] Context Guardian directories created');
  } catch (error) {
    logError('[ekkOS Connect] Failed to setup Context Guardian:', error);
  }
}

// Helper function to copy directories recursively
function copyDirectoryRecursive(source: string, destination: string) {
  // Create destination directory
  if (!fs.existsSync(destination)) {
    fs.mkdirSync(destination, { recursive: true });
  }

  // Read source directory contents
  const entries = fs.readdirSync(source, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      // Recursively copy subdirectory
      copyDirectoryRecursive(sourcePath, destPath);
    } else {
      // Copy file
      fs.copyFileSync(sourcePath, destPath);
    }
  }
}

// ============ Full Setup Wizard Functions ============

/**
 * Deploy all Claude plugins automatically
 */
async function deployAllPlugins(): Promise<number> {
  const plugins = [
    'memory-lens',
    'pattern-coach',
    'learning-tracker',
    'golden-loop-monitor',
    'project-schema-validator'
  ];

  const claudePluginsDir = path.join(getClaudeDir(), 'plugins');
  fs.mkdirSync(claudePluginsDir, { recursive: true });

  let deployed = 0;
  const extensionPath = extensionContext?.extensionPath || '';

  for (const plugin of plugins) {
    const src = path.join(extensionPath, 'templates', 'claude-plugins', plugin);
    const dest = path.join(claudePluginsDir, plugin);

    if (fs.existsSync(src)) {
      try {
        copyDirectoryRecursive(src, dest);
        log(`[ekkOS Setup] Installed plugin: ${plugin}`);
        deployed++;
      } catch (err) {
        logError(`[ekkOS Setup] Failed to install plugin ${plugin}:`, err);
      }
    }
  }

  return deployed;
}

/**
 * Deploy global hooks to ~/.claude/hooks/
 */
async function deployGlobalHooks(): Promise<number> {
  const hooksDir = path.join(getClaudeDir(), 'hooks');
  fs.mkdirSync(hooksDir, { recursive: true });

  const extensionPath = extensionContext?.extensionPath || '';
  const platform = detectPlatform();
  let deployed = 0;

  // Determine which hook files to deploy based on platform
  // Windows: Use bash hooks if available (Git Bash/WSL), otherwise skip shell hooks
  // macOS/Linux: Use bash hooks
  const useShellHooks = platform !== 'windows' || isBashAvailable();

  // Always deploy hooks.json (configuration file)
  const configFiles = ['hooks.json'];

  // Shell hook files - only deploy on Unix or Windows with bash
  const shellHooks = useShellHooks
    ? ['user-prompt-submit.sh', 'stop.sh', 'session-start.sh']
    : [];

  const hookFiles = [...configFiles, ...shellHooks];

  for (const file of hookFiles) {
    const src = path.join(extensionPath, 'templates', 'hooks', file);
    const dest = path.join(hooksDir, file);

    if (fs.existsSync(src)) {
      try {
        fs.copyFileSync(src, dest);
        // Make shell scripts executable (only relevant on Unix-like systems)
        if (file.endsWith('.sh') && platform !== 'windows') {
          fs.chmodSync(dest, 0o755);
        }
        deployed++;
        log(`[ekkOS Setup] Deployed hook: ${file}`);
      } catch (err) {
        logError(`[ekkOS Setup] Failed to deploy hook ${file}:`, err);
      }
    }
  }

  // Copy lib directory if exists (contains JS helpers that work cross-platform)
  const libSrc = path.join(extensionPath, 'templates', 'hooks', 'lib');
  const libDest = path.join(hooksDir, 'lib');
  if (fs.existsSync(libSrc)) {
    try {
      copyDirectoryRecursive(libSrc, libDest);
      log('[ekkOS Setup] Deployed hooks/lib directory');
    } catch (err) {
      logError('[ekkOS Setup] Failed to deploy hooks/lib:', err);
    }
  }

  // Log platform-specific note
  if (platform === 'windows' && !useShellHooks) {
    log('[ekkOS Setup] Note: Shell hooks skipped on Windows (bash not available)');
    log('[ekkOS Setup] Hooks will work when Claude Code runs in WSL or Git Bash');
  }

  return deployed;
}

/**
 * Deploy ekkOS skills to ~/.claude/skills/
 * Skills are auto-invoked by Claude when their description matches user intent
 */
async function deployGlobalSkills(): Promise<number> {
  const skillsDir = path.join(getClaudeDir(), 'skills');
  fs.mkdirSync(skillsDir, { recursive: true });

  const extensionPath = extensionContext?.extensionPath || '';
  const templateSkillsDir = path.join(extensionPath, 'templates', 'skills');
  let deployed = 0;

  if (!fs.existsSync(templateSkillsDir)) {
    log('[ekkOS Setup] No skills templates found');
    return deployed;
  }

  // Get all skill directories (ekkOS_Memory_First, ekkOS_Learn, etc.)
  const skillFolders = fs.readdirSync(templateSkillsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const skillName of skillFolders) {
    const srcDir = path.join(templateSkillsDir, skillName);
    const destDir = path.join(skillsDir, skillName);

    try {
      // Create skill directory
      fs.mkdirSync(destDir, { recursive: true });

      // Copy all files in the skill directory (SKILL.md, etc.)
      const files = fs.readdirSync(srcDir);
      for (const file of files) {
        const srcFile = path.join(srcDir, file);
        const destFile = path.join(destDir, file);

        // Only copy files, not subdirectories
        if (fs.statSync(srcFile).isFile()) {
          fs.copyFileSync(srcFile, destFile);
        }
      }

      deployed++;
      log(`[ekkOS Setup] Deployed skill: ${skillName}`);
    } catch (err) {
      logError(`[ekkOS Setup] Failed to deploy skill ${skillName}:`, err);
    }
  }

  log(`[ekkOS Setup] Deployed ${deployed} ekkOS skills to ${skillsDir}`);
  return deployed;
}

/**
 * Deploy ekkOS commands to ~/.claude/commands/
 * Commands are slash-invocable (e.g., /continue) with prompt templates
 */
async function deployGlobalCommands(): Promise<number> {
  const commandsDir = path.join(getClaudeDir(), 'commands');
  fs.mkdirSync(commandsDir, { recursive: true });

  const extensionPath = extensionContext?.extensionPath || '';
  const templateCommandsDir = path.join(extensionPath, 'templates', 'commands');
  let deployed = 0;

  if (!fs.existsSync(templateCommandsDir)) {
    log('[ekkOS Setup] No command templates found');
    return deployed;
  }

  // Get all command files (*.md)
  const commandFiles = fs.readdirSync(templateCommandsDir)
    .filter(f => f.endsWith('.md'));

  for (const file of commandFiles) {
    const srcFile = path.join(templateCommandsDir, file);
    const destFile = path.join(commandsDir, file);

    try {
      fs.copyFileSync(srcFile, destFile);
      deployed++;
      log(`[ekkOS Setup] Deployed command: /${file.replace('.md', '')}`);
    } catch (err) {
      logError(`[ekkOS Setup] Failed to deploy command ${file}:`, err);
    }
  }

  log(`[ekkOS Setup] Deployed ${deployed} ekkOS commands to ${commandsDir}`);
  return deployed;
}

/**
 * Deploy global CLAUDE.md to ~/.claude/
 */
async function deployGlobalClaudeMd(): Promise<boolean> {
  const claudeDir = getClaudeDir();
  fs.mkdirSync(claudeDir, { recursive: true });

  const extensionPath = extensionContext?.extensionPath || '';
  const src = path.join(extensionPath, 'templates', 'CLAUDE.md');
  const dest = path.join(claudeDir, 'CLAUDE.md');

  if (fs.existsSync(src)) {
    try {
      fs.copyFileSync(src, dest);
      log(`[ekkOS Setup] Global CLAUDE.md deployed to ${claudeDir}`);
      return true;
    } catch (err) {
      logError('[ekkOS Setup] Failed to deploy CLAUDE.md:', err);
      return false;
    }
  }

  return false;
}

/**
 * Verify setup is working
 */
async function verifySetup(): Promise<boolean> {
  try {
    // Quick API connectivity check
    const response = await fetch(`${getMcpApiUrl()}/api/v1/health`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${currentConfig?.apiKey || ''}`,
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Sleep helper for visual effect
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Deploy MCP config silently (no dialogs) for setup wizard
 * Returns the IDE name that was configured
 */
async function deployMcpSilent(): Promise<string> {
  if (!currentConfig) {
    throw new Error('Not connected to ekkOS');
  }

  const currentIDE = detectCurrentIDE();
  const ideConfig = getCurrentIdeConfig();

  if (!ideConfig) {
    throw new Error('Unknown IDE - configure manually at platform.ekkos.dev');
  }

  if (!ideConfig.exists) {
    throw new Error(`${ideConfig.name} config directory not found`);
  }

  // Deploy without showing any dialogs
  await deployToIde(ideConfig, currentConfig);

  // Update connection status silently
  ideConnectionStatus.set(ideConfig.name, {
    status: 'checking',
    lastChecked: new Date()
  });

  log(`[ekkOS Setup] MCP configured for ${ideConfig.name}`);
  return ideConfig.name;
}

interface DependencyCheckResult {
  label: string;
  warning?: string;
  nodeVersion?: string;
  npmVersion?: string;
  bashAvailable?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// WINDOWS PREFLIGHT SYSTEM
// Runs ekkos doctor --json and parses the 3-gate result
// ═══════════════════════════════════════════════════════════════════════════

interface PreflightCheck {
  name: string;
  passed: boolean;
  detail?: string;
}

interface PreflightGate {
  id: 'interactive-claude' | 'pty' | 'mcp';
  title: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  checks: PreflightCheck[];
  fix?: string;
}

interface PreflightReport {
  platform: string;
  gates: PreflightGate[];
  canProceed: boolean;
  nodeVersion?: string;
  claudeVersion?: string;
}

/**
 * Run Windows preflight checks via ekkos doctor --json
 * Returns structured report of 3 gates: Interactive Claude, PTY, MCP
 */
async function runWindowsPreflight(): Promise<PreflightReport | null> {
  const { execSync } = require('child_process');

  try {
    // Run ekkos doctor --json to get machine-readable report
    const output = execSync('npx -y @ekkos/cli@latest doctor --json', {
      encoding: 'utf8',
      timeout: 60000,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const report = JSON.parse(output) as PreflightReport;
    log(`[ekkOS Preflight] Report received: ${report.gates.length} gates, canProceed=${report.canProceed}`);
    return report;
  } catch (error: any) {
    // If ekkos CLI not available, try to run checks directly
    log(`[ekkOS Preflight] ekkos doctor failed: ${error.message}`);

    // Fallback: run basic checks directly in extension
    return runFallbackPreflight();
  }
}

/**
 * Fallback preflight checks when ekkos CLI is not available
 */
async function runFallbackPreflight(): Promise<PreflightReport> {
  const { execSync } = require('child_process');
  const platform = detectPlatform();

  const gates: PreflightGate[] = [];

  // Gate 1: Interactive Claude
  let claudeVersion: string | undefined;
  let claudePass = false;
  const claudeChecks: PreflightCheck[] = [];

  try {
    claudeVersion = execSync('claude --version', { encoding: 'utf8', timeout: 10000 }).trim().split('\n')[0];
    claudePass = true;
    claudeChecks.push({ name: 'Claude CLI installed', passed: true, detail: claudeVersion });
  } catch {
    claudeChecks.push({ name: 'Claude CLI installed', passed: false, detail: 'Not found in PATH' });
  }

  gates.push({
    id: 'interactive-claude',
    title: 'Interactive Claude',
    status: claudePass ? 'PASS' : 'FAIL',
    checks: claudeChecks,
    fix: claudePass ? undefined : 'npm install -g @anthropic-ai/claude-code'
  });

  // Gate 2: PTY (Windows only critical)
  let nodeVersion: string | undefined;
  const ptyChecks: PreflightCheck[] = [];

  try {
    const nodeVersionRaw = execSync('node --version', { encoding: 'utf8', timeout: 5000 }).trim();
    nodeVersion = nodeVersionRaw;
    const nodeMajor = parseInt(nodeVersionRaw.replace(/^v/, '').split('.')[0], 10);
    const nodeOk = nodeMajor >= 18 && nodeMajor <= 22;
    ptyChecks.push({
      name: 'Node.js version',
      passed: nodeOk,
      detail: nodeOk ? `${nodeVersionRaw} (OK)` : `${nodeVersionRaw} (Need 20.x or 22.x LTS)`
    });
  } catch {
    ptyChecks.push({ name: 'Node.js version', passed: false, detail: 'Not found' });
  }

  // PTY check is Windows-specific
  const ptyStatus = platform === 'windows' ? 'WARN' : 'PASS';
  gates.push({
    id: 'pty',
    title: 'PTY (Terminal)',
    status: ptyStatus,
    checks: ptyChecks,
    fix: platform === 'windows' ? 'npm install -g @homebridge/node-pty-prebuilt-multiarch' : undefined
  });

  // Gate 3: MCP
  let mcpPass = false;
  const mcpChecks: PreflightCheck[] = [];

  if (claudePass) {
    try {
      const mcpList = execSync('claude mcp list', { encoding: 'utf8', timeout: 10000 });
      mcpPass = mcpList.toLowerCase().includes('ekkos') || mcpList.toLowerCase().includes('memory');
      mcpChecks.push({
        name: 'ekkOS MCP server configured',
        passed: mcpPass,
        detail: mcpPass ? 'Found' : 'No ekkOS server in claude mcp list'
      });
    } catch {
      mcpChecks.push({ name: 'ekkOS MCP server configured', passed: false, detail: 'Failed to check' });
    }
  } else {
    mcpChecks.push({ name: 'ekkOS MCP server configured', passed: false, detail: 'Claude CLI required' });
  }

  gates.push({
    id: 'mcp',
    title: 'MCP Configuration',
    status: mcpPass ? 'PASS' : 'FAIL',
    checks: mcpChecks,
    fix: mcpPass ? undefined : 'claude mcp add ekkos-memory npx -y @ekkos/cli@latest mcp'
  });

  const canProceed = !gates.some(g => g.status === 'FAIL');

  return {
    platform: platform === 'windows' ? 'Windows' : platform === 'macos' ? 'macOS' : 'Linux',
    gates,
    canProceed,
    nodeVersion,
    claudeVersion
  };
}

/**
 * Execute a remediation command in VS Code terminal
 */
async function executeRemediation(gateId: string, command: string): Promise<void> {
  const terminal = vscode.window.createTerminal({
    name: `ekkOS Fix: ${gateId}`,
    shellPath: detectPlatform() === 'windows' ? 'powershell.exe' : undefined
  });

  terminal.show();
  terminal.sendText(command);

  log(`[ekkOS Preflight] Opened terminal for ${gateId}: ${command}`);

  // Show info message
  vscode.window.showInformationMessage(
    `Running fix for ${gateId}. After it completes, click "Re-check" to verify.`,
    'Re-check'
  ).then(async (action) => {
    if (action === 'Re-check') {
      const report = await runWindowsPreflight();
      if (report?.canProceed) {
        vscode.window.showInformationMessage('All checks passed! ekkOS is ready to use.');
      } else {
        vscode.window.showWarningMessage('Some issues remain. Check the ekkOS sidebar for details.');
      }
      sidebarProvider?.refresh();
    }
  });
}

/**
 * Check and install required dependencies
 * - Verifies Node.js is available (required for npx)
 * - Verifies npm is available
 * - On Windows, checks if bash is available (Git Bash/WSL) for hooks
 * - Creates required directories
 */
async function checkAndInstallDependencies(): Promise<DependencyCheckResult> {
  const { execSync } = require('child_process');
  const platform = detectPlatform();
  const result: DependencyCheckResult = { label: 'Dependencies ready' };

  // Check Node.js
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf8', timeout: 5000 }).trim();
    result.nodeVersion = nodeVersion;
    log(`[ekkOS Setup] Node.js found: ${nodeVersion}`);
  } catch {
    result.warning = 'Node.js not found - MCP server requires Node.js';
    log('[ekkOS Setup] WARNING: Node.js not found');
  }

  // Check npm
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8', timeout: 5000 }).trim();
    result.npmVersion = npmVersion;
    log(`[ekkOS Setup] npm found: ${npmVersion}`);
  } catch {
    if (!result.warning) {
      result.warning = 'npm not found - MCP server requires npm';
    }
    log('[ekkOS Setup] WARNING: npm not found');
  }

  // On Windows, check for bash (Git Bash/WSL) for shell hooks
  if (platform === 'windows') {
    result.bashAvailable = isBashAvailable();
    if (!result.bashAvailable) {
      log('[ekkOS Setup] Note: bash not available on Windows, will use PowerShell hooks');
    } else {
      log('[ekkOS Setup] bash available on Windows (Git Bash/WSL)');
    }
  }

  // Create required directories
  const claudeDir = getClaudeDir();
  const dirs = [
    claudeDir,
    path.join(claudeDir, 'agents'),
    path.join(claudeDir, 'plugins'),
    path.join(claudeDir, 'hooks'),
    path.join(claudeDir, 'hooks', 'lib'),
    path.join(claudeDir, 'restoration_tokens'),
    path.join(claudeDir, 'snapshots')
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      log(`[ekkOS Setup] Created directory: ${dir}`);
    }
  }

  // Update label with versions
  if (result.nodeVersion && result.npmVersion) {
    result.label = `Dependencies: Node ${result.nodeVersion}, npm ${result.npmVersion}`;
  } else if (result.nodeVersion) {
    result.label = `Dependencies: Node ${result.nodeVersion}`;
  }

  return result;
}

/**
 * Run the full automated setup wizard
 * Deploys everything and shows animated progress in sidebar
 * Note: Agents, plugins, hooks, and CLAUDE.md are Claude Code specific
 */
async function runFullSetup(context: vscode.ExtensionContext): Promise<void> {
  // Detect current IDE and platform for labeling
  const currentIDE = detectCurrentIDE();
  const ideName = currentIDE === 'cursor' ? 'Cursor'
    : currentIDE === 'windsurf' ? 'Windsurf'
    : currentIDE === 'vscode' ? 'VS Code'
    : 'IDE';
  const platformName = getPlatformDisplayName();
  const claudeDir = getClaudeDir();

  const steps: SetupStep[] = [
    { id: 'account', label: `Account connected (${currentConfig?.email || (currentConfig?.userId ? `User ${currentConfig.userId.substring(0, 8)}...` : 'user')})`, status: 'done' },
    { id: 'platform', label: `Detected: ${platformName}`, status: 'done' },
    { id: 'deps', label: 'Checking dependencies', status: 'pending' },
    { id: 'mcp', label: `MCP server for ${ideName}`, status: 'pending' },
    { id: 'agent', label: 'Claude Code: Context Guardian agent', status: 'pending' },
    { id: 'plugins', label: 'Claude Code: AI plugins', status: 'pending' },
    { id: 'hooks', label: `Claude Code: Global hooks (${platformName})`, status: 'pending' },
    { id: 'skills', label: 'Claude Code: ekkOS skills', status: 'pending' },
    { id: 'commands', label: 'Claude Code: ekkOS commands', status: 'pending' },
    { id: 'instructions', label: 'Claude Code: CLAUDE.md instructions', status: 'pending' },
    { id: 'verify', label: 'Connection verification', status: 'pending' },
  ];

  // Initialize setup state
  currentSetupSteps = steps;
  setupComplete = false;
  setupStats = { agents: 0, plugins: 0, hooks: 0, skills: 0 };

  // Show animated progress in sidebar
  sidebarProvider?.refresh();

  // Run each step sequentially
  for (const step of steps) {
    if (step.status === 'done') continue; // Skip already done (account)

    step.status = 'running';
    sidebarProvider?.refresh();

    try {
      switch (step.id) {
        case 'deps':
          const depResult = await checkAndInstallDependencies();
          step.label = depResult.label;
          if (depResult.warning) {
            step.detail = depResult.warning;
          }
          break;
        case 'mcp':
          const configuredIde = await deployMcpSilent();
          step.label = `MCP server for ${configuredIde}`;
          break;
        case 'agent':
          await setupContextGuardianAgent();
          setupStats!.agents = 1;
          break;
        case 'plugins':
          setupStats!.plugins = await deployAllPlugins();
          step.label = `Claude Code: AI plugins (${setupStats!.plugins})`;
          break;
        case 'hooks':
          setupStats!.hooks = await deployGlobalHooks();
          step.label = `Claude Code: Global hooks (${setupStats!.hooks})`;
          break;
        case 'skills':
          setupStats!.skills = await deployGlobalSkills();
          step.label = `Claude Code: ekkOS skills (${setupStats!.skills})`;
          break;
        case 'commands':
          const commandCount = await deployGlobalCommands();
          step.label = `Claude Code: ekkOS commands (${commandCount})`;
          break;
        case 'instructions':
          await deployGlobalClaudeMd();
          break;
        case 'verify':
          const verified = await verifySetup();
          if (!verified) {
            step.detail = 'API check failed (will retry on reload)';
          }
          break;
      }
      step.status = 'done';
    } catch (error: any) {
      step.status = 'error';
      step.detail = error?.message || 'Unknown error';
      logError(`[ekkOS Setup] Step ${step.id} failed:`, error);
    }

    sidebarProvider?.refresh();
    await sleep(400); // Brief pause for visual effect
  }

  // Mark setup complete
  setupComplete = true;
  currentSetupSteps = null; // Clear steps, show completion screen

  sidebarProvider?.refresh();
  log('[ekkOS Setup] Full setup complete!');
}

function getClaudeMdTemplate(): string {
  // Load from templates directory if available
  const templatePath = path.join(__dirname, '..', 'templates', 'CLAUDE.md');
  if (fs.existsSync(templatePath)) {
    return fs.readFileSync(templatePath, 'utf8');
  }
  // Fallback inline template with correct tool names
  return `# ekkOS Memory System

You have access to **ekkOS memory** via 28 MCP tools.

## MANDATORY: Search Before Answering
Before answering ANY technical question, call \`search_memory\` first.

## Core Tools
- \`search_memory\` - Search all 11 memory layers
- \`forge_pattern\` - Create pattern from solution
- \`forge_directive\` - Create MUST/NEVER/PREFER/AVOID rules
- \`record_outcome\` - Track if pattern worked
- \`export_memory\` - Export your memory data (patterns, directives, plans)
- \`import_memory\` - Import memory from backup

## Forge Triggers
Call \`forge_pattern\` when you:
- Fix a bug
- Discover better approach
- Get corrected by user
- Find anti-pattern

For more info: https://docs.ekkos.dev
`;
}

function getCursorRulesTemplate(): string {
  // Load from templates directory if available
  const templatePath = path.join(__dirname, '..', 'templates', 'cursor-rules', 'ekkos-memory.md');
  if (fs.existsSync(templatePath)) {
    return fs.readFileSync(templatePath, 'utf8');
  }
  // Fallback with correct tool names
  return `# ekkOS Memory System

You have access to **ekkOS memory** via 28 MCP tools.

## MANDATORY: Search Before Answering
Before answering ANY technical question, call \`search_memory\` first.

## Core Tools
- \`search_memory\` - Search all 11 memory layers
- \`forge_pattern\` - Create pattern from solution
- \`forge_directive\` - Create MUST/NEVER/PREFER/AVOID rules
- \`export_memory\` - Export your memory for backup/sync
- \`import_memory\` - Import memory from backup

## 11 Layers
1. Working, 2. Episodic, 3. Semantic, 4. Patterns, 5. Procedural
6. Collective, 7. Meta, 8. Codebase, 9. Directives, 10. Conflict, 11. Secrets

For docs: https://docs.ekkos.dev
`;
}

function getWindsurfRulesTemplate(): string {
  const templatePath = path.join(__dirname, '..', 'templates', 'windsurf-rules', 'ekkos-memory.md');
  if (fs.existsSync(templatePath)) {
    return fs.readFileSync(templatePath, 'utf8');
  }
  return getCursorRulesTemplate(); // Fallback to cursor rules
}

// ============ Full IDE Setup (MCP + Hooks + Rules) ============

interface IdeSetupStatus {
  mcp: boolean;
  hooks: boolean;
  skills: boolean;
  rules: boolean;
}

async function getIdeSetupStatus(ideName: string): Promise<IdeSetupStatus> {
  const status: IdeSetupStatus = { mcp: false, hooks: false, skills: false, rules: false };
  const homeDir = os.homedir();

  if (ideName === 'Claude Code') {
    // MCP config (Claude Code uses ~/.claude.json for MCP servers)
    const mcpPath = path.join(homeDir, '.claude.json');
    if (fs.existsSync(mcpPath)) {
      try {
        const content = fs.readFileSync(mcpPath, 'utf8');
        status.mcp = content.includes('ekkos-memory') || content.includes('ekkos');
      } catch {}
    }
    // Hooks
    const hooksPath = path.join(homeDir, '.claude', 'hooks', 'user-prompt-submit.sh');
    const hooksPathNode = path.join(homeDir, '.claude', 'hooks', 'user-prompt-submit.js');
    status.hooks = fs.existsSync(hooksPath) || fs.existsSync(hooksPathNode);
    // Skills (check for at least one ekkOS skill)
    const skillsDir = path.join(homeDir, '.claude', 'skills');
    if (fs.existsSync(skillsDir)) {
      const skillFolders = fs.readdirSync(skillsDir, { withFileTypes: true })
        .filter(d => d.isDirectory() && d.name.startsWith('ekkOS_'));
      status.skills = skillFolders.length > 0;
    }
    // Rules (global CLAUDE.md)
    const rulesPath = path.join(homeDir, '.claude', 'CLAUDE.md');
    status.rules = fs.existsSync(rulesPath);
  } else if (ideName === 'Cursor') {
    // MCP config
    const mcpPath = path.join(homeDir, 'Library', 'Application Support', 'Cursor', 'User', 'globalStorage', 'saoudrizwan.claude-dev', 'settings', 'cline_mcp_settings.json');
    if (fs.existsSync(mcpPath)) {
      try {
        const content = fs.readFileSync(mcpPath, 'utf8');
        status.mcp = content.includes('ekkos-memory') || content.includes('ekkos');
      } catch {}
    }
    // Hooks (Cursor uses .cursor/hooks/)
    const hooksDir = path.join(homeDir, '.cursor', 'hooks');
    const hooksPath = path.join(hooksDir, 'user-prompt-submit.sh');
    status.hooks = fs.existsSync(hooksPath);
    // Rules (global .cursorrules or .cursor/rules/)
    const rulesPath = path.join(homeDir, '.cursor', 'rules', 'ekkos-memory.mdc');
    const globalRules = path.join(homeDir, '.cursorrules');
    status.rules = fs.existsSync(rulesPath) || (fs.existsSync(globalRules) && fs.readFileSync(globalRules, 'utf8').includes('ekkOS'));
  } else if (ideName === 'Windsurf') {
    // MCP config
    const mcpPath = path.join(homeDir, '.codeium', 'windsurf', 'mcp_config.json');
    if (fs.existsSync(mcpPath)) {
      try {
        const content = fs.readFileSync(mcpPath, 'utf8');
        status.mcp = content.includes('ekkos-memory') || content.includes('ekkos');
      } catch {}
    }
    // Windsurf Cascade Hooks (~/.codeium/windsurf/hooks/)
    const hooksDir = path.join(homeDir, '.codeium', 'windsurf', 'hooks');
    const hooksPath = path.join(hooksDir, 'ekkos-before-submit.sh');
    status.hooks = fs.existsSync(hooksPath);
    // Rules
    const rulesPath = path.join(homeDir, '.windsurfrules');
    status.rules = fs.existsSync(rulesPath) && fs.readFileSync(rulesPath, 'utf8').includes('ekkOS');
  }

  return status;
}

async function fullSetupForIde(ideName: string, config: EkkosConfig): Promise<{ success: boolean; message: string }> {
  const homeDir = os.homedir();
  const results: string[] = [];

  try {
    if (ideName === 'Claude Code') {
      // 1. MCP Config
      const ide = getIdeConfigs().find(i => i.name === 'Claude Code');
      if (ide) {
        await deployToIde(ide, config);
        results.push('MCP ✓');
      }

      // 2. Hooks
      const hooksDir = path.join(homeDir, '.claude', 'hooks');
      const libDir = path.join(hooksDir, 'lib');
      fs.mkdirSync(libDir, { recursive: true });

      // Copy hook files from templates
      const hookSrc = path.join(__dirname, '..', 'templates', 'hooks', 'user-prompt-submit.sh');
      const sessionStartSrc = path.join(__dirname, '..', 'templates', 'hooks', 'session-start.sh');
      const stateSrc = path.join(__dirname, '..', 'templates', 'hooks', 'lib', 'state.sh');
      const stopSrc = path.join(__dirname, '..', 'templates', 'hooks', 'stop.sh');

      if (fs.existsSync(hookSrc)) {
        fs.copyFileSync(hookSrc, path.join(hooksDir, 'user-prompt-submit.sh'));
        fs.chmodSync(path.join(hooksDir, 'user-prompt-submit.sh'), 0o755);
      }
      if (fs.existsSync(sessionStartSrc)) {
        fs.copyFileSync(sessionStartSrc, path.join(hooksDir, 'session-start.sh'));
        fs.chmodSync(path.join(hooksDir, 'session-start.sh'), 0o755);
      }
      if (fs.existsSync(stateSrc)) {
        fs.copyFileSync(stateSrc, path.join(libDir, 'state.sh'));
        fs.chmodSync(path.join(libDir, 'state.sh'), 0o755);
      }
      if (fs.existsSync(stopSrc)) {
        fs.copyFileSync(stopSrc, path.join(hooksDir, 'stop.sh'));
        fs.chmodSync(path.join(hooksDir, 'stop.sh'), 0o755);
      }
      results.push('Hooks ✓');

      // 3. Global CLAUDE.md
      const claudeMdPath = path.join(homeDir, '.claude', 'CLAUDE.md');
      fs.writeFileSync(claudeMdPath, getClaudeMdTemplate());
      results.push('Rules ✓');

    } else if (ideName === 'Cursor') {
      // 1. MCP Config
      const ide = getIdeConfigs().find(i => i.name === 'Cursor');
      if (ide) {
        await deployToIde(ide, config);
        results.push('MCP ✓');
      }

      // 2. Hooks (Cursor uses ~/.cursor/hooks.json + ~/.cursor/hooks/*.sh)
      const cursorDir = path.join(homeDir, '.cursor');
      const hooksDir = path.join(cursorDir, 'hooks');
      fs.mkdirSync(hooksDir, { recursive: true });

      // Copy hook script
      const hookScriptSrc = path.join(__dirname, '..', 'templates', 'cursor-hooks', 'before-submit-prompt.sh');
      const hookScriptDest = path.join(hooksDir, 'ekkos-before-submit.sh');
      if (fs.existsSync(hookScriptSrc)) {
        fs.copyFileSync(hookScriptSrc, hookScriptDest);
        fs.chmodSync(hookScriptDest, 0o755);
      }

      // Create/update hooks.json
      const hooksJsonPath = path.join(cursorDir, 'hooks.json');
      let hooksConfig: any = { version: 1, hooks: {} };
      if (fs.existsSync(hooksJsonPath)) {
        try {
          hooksConfig = JSON.parse(fs.readFileSync(hooksJsonPath, 'utf8'));
        } catch {}
      }
      // Add beforeSubmitPrompt hook
      if (!hooksConfig.hooks) hooksConfig.hooks = {};
      if (!hooksConfig.hooks.beforeSubmitPrompt) hooksConfig.hooks.beforeSubmitPrompt = [];
      // Check if ekkos hook already exists
      const ekkosHookExists = hooksConfig.hooks.beforeSubmitPrompt.some(
        (h: any) => h.command && h.command.includes('ekkos')
      );
      if (!ekkosHookExists) {
        hooksConfig.hooks.beforeSubmitPrompt.push({
          command: path.join(hooksDir, 'ekkos-before-submit.sh')
        });
      }
      fs.writeFileSync(hooksJsonPath, JSON.stringify(hooksConfig, null, 2));
      results.push('Hooks ✓');

      // 3. Rules (~/.cursor/rules/)
      const rulesDir = path.join(cursorDir, 'rules');
      fs.mkdirSync(rulesDir, { recursive: true });
      const rulesSrc = path.join(__dirname, '..', 'templates', 'cursor-rules', 'ekkos-memory.md');
      if (fs.existsSync(rulesSrc)) {
        fs.copyFileSync(rulesSrc, path.join(rulesDir, 'ekkos-memory.mdc'));
      } else {
        fs.writeFileSync(path.join(rulesDir, 'ekkos-memory.mdc'), getCursorRulesTemplate());
      }
      results.push('Rules ✓');

    } else if (ideName === 'Windsurf') {
      // 1. MCP Config
      const ide = getIdeConfigs().find(i => i.name === 'Windsurf');
      if (ide) {
        await deployToIde(ide, config);
        results.push('MCP ✓');
      }

      // 2. Windsurf Cascade Hooks (~/.codeium/windsurf/hooks.json + ~/.codeium/windsurf/hooks/*.sh)
      const windsurfDir = path.join(homeDir, '.codeium', 'windsurf');
      const hooksDir = path.join(windsurfDir, 'hooks');
      fs.mkdirSync(hooksDir, { recursive: true });

      // Copy hook script
      const hookScriptSrc = path.join(__dirname, '..', 'templates', 'windsurf-hooks', 'before-submit-prompt.sh');
      const hookScriptDest = path.join(hooksDir, 'ekkos-before-submit.sh');
      if (fs.existsSync(hookScriptSrc)) {
        fs.copyFileSync(hookScriptSrc, hookScriptDest);
        fs.chmodSync(hookScriptDest, 0o755);
      }

      // Create/update hooks.json
      const hooksJsonPath = path.join(windsurfDir, 'hooks.json');
      let hooksConfig: any = { version: 1, hooks: {} };
      if (fs.existsSync(hooksJsonPath)) {
        try {
          hooksConfig = JSON.parse(fs.readFileSync(hooksJsonPath, 'utf8'));
        } catch {}
      }
      // Add beforeSubmitPrompt hook
      if (!hooksConfig.hooks) hooksConfig.hooks = {};
      if (!hooksConfig.hooks.beforeSubmitPrompt) hooksConfig.hooks.beforeSubmitPrompt = [];
      // Check if ekkos hook already exists
      const ekkosHookExists = hooksConfig.hooks.beforeSubmitPrompt.some(
        (h: any) => h.command && h.command.includes('ekkos')
      );
      if (!ekkosHookExists) {
        hooksConfig.hooks.beforeSubmitPrompt.push({
          command: path.join(hooksDir, 'ekkos-before-submit.sh')
        });
      }
      fs.writeFileSync(hooksJsonPath, JSON.stringify(hooksConfig, null, 2));
      results.push('Hooks ✓');

      // 3. Global rules
      const rulesPath = path.join(homeDir, '.windsurfrules');
      const rulesSrc = path.join(__dirname, '..', 'templates', 'windsurf-rules', 'ekkos-memory.md');
      if (fs.existsSync(rulesSrc)) {
        fs.copyFileSync(rulesSrc, rulesPath);
      } else {
        fs.writeFileSync(rulesPath, getWindsurfRulesTemplate());
      }
      results.push('Rules ✓');

    } else if (ideName === 'Claude Desktop') {
      // Claude Desktop - MCP Config only (no hooks/rules)
      const claudeDesktopDir = path.join(homeDir, 'Library', 'Application Support', 'Claude');
      const mcpConfigPath = path.join(claudeDesktopDir, 'claude_desktop_config.json');

      // Ensure directory exists
      if (!fs.existsSync(claudeDesktopDir)) {
        fs.mkdirSync(claudeDesktopDir, { recursive: true });
      }

      // Create/update MCP config
      let mcpConfig: any = { mcpServers: {} };
      if (fs.existsSync(mcpConfigPath)) {
        try {
          mcpConfig = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
          if (!mcpConfig.mcpServers) mcpConfig.mcpServers = {};
        } catch {}
      }

      // Add ekkos-memory server
      mcpConfig.mcpServers['ekkos-memory'] = {
        command: 'npx',
        args: ['-y', '@ekkos/mcp-server@latest'],
        env: {
          EKKOS_API_KEY: config.apiKey,
          EKKOS_USER_ID: config.userId
        }
      };

      fs.writeFileSync(mcpConfigPath, JSON.stringify(mcpConfig, null, 2));
      results.push('MCP ✓');
    }

    return { success: true, message: results.join(' | ') };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// ============ Status Management ============

function updateStatusBar() {
  if (currentConfig) {
    const scope = currentConfig.patternScope || 'both';
    const scopeIcons: Record<string, string> = { both: '●', personal: 'P', collective: 'C' };
    const scopeLabels: Record<string, string> = { both: 'Personal + Collective', personal: 'Personal Only', collective: 'All Users' };

    statusBarItem.text = `$(database) ekkOS_ [${scopeIcons[scope]}]`;
    statusBarItem.tooltip = `Connected as ${currentConfig.email}\nScope: ${scopeLabels[scope]}\n\nClick to open settings`;
    statusBarItem.backgroundColor = undefined;
    statusBarItem.command = 'ekkos.openSidebar';
  } else {
    statusBarItem.text = '$(database) ekkOS_';
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

  // Fetch fresh activity data from API
  const activity = await fetchActivity();
  if (activity) {
    currentActivity = activity;
  }

  // Also refresh connection status
  await checkIdeConnections();
  await checkSetupStatus();

  updateStatusBar();
  sidebarProvider?.refresh();
  vscode.window.showInformationMessage('ekkOS status refreshed');
}

function openDashboard() {
  vscode.env.openExternal(vscode.Uri.parse(getPlatformUrl()));
}

function openSidebar() {
  vscode.commands.executeCommand('workbench.view.extension.ekkos');
}

// ============ Sidebar Provider ============

class EkkosSidebarProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private _revealState: { apiKey: boolean; userId: boolean } = { apiKey: false, userId: false };

  private _getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  /**
   * Render the setup progress wizard view
   */
  private _getSetupProgressHtml(nonce: string): string {
    const steps = currentSetupSteps || [];
    const completedSteps = steps.filter(s => s.status === 'done').length;
    const progress = Math.round((completedSteps / steps.length) * 100);

    const stepHtml = steps.map(step => {
      const icon = step.status === 'done' ? '✅' :
                   step.status === 'running' ? '🔄' :
                   step.status === 'error' ? '❌' : '⏳';
      return `
        <div class="setup-step ${step.status}">
          <span class="step-icon">${icon}</span>
          <span class="step-label">${step.label}</span>
          ${step.detail ? `<span class="step-detail">${step.detail}</span>` : ''}
        </div>
      `;
    }).join('');

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
      <style>
        body {
          font-family: var(--vscode-font-family);
          color: var(--vscode-foreground);
          background: var(--vscode-sideBar-background);
          padding: 20px;
          margin: 0;
        }
        .setup-wizard {
          text-align: center;
        }
        .setup-wizard h2 {
          margin: 0 0 20px 0;
          font-size: 18px;
        }
        .setup-steps {
          text-align: left;
          margin: 20px 0;
        }
        .setup-step {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .setup-step:last-child {
          border-bottom: none;
        }
        .step-icon {
          font-size: 16px;
          width: 24px;
          text-align: center;
        }
        .setup-step.running .step-icon {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .step-label {
          flex: 1;
          font-size: 13px;
        }
        .step-detail {
          font-size: 11px;
          color: var(--vscode-descriptionForeground);
        }
        .progress-container {
          margin: 20px 0;
        }
        .progress-bar {
          height: 8px;
          background: rgba(255,255,255,0.1);
          border-radius: 4px;
          overflow: hidden;
        }
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #06b6d4, #8b5cf6);
          transition: width 0.3s ease;
        }
        .progress-text {
          margin-top: 8px;
          font-size: 12px;
          color: var(--vscode-descriptionForeground);
        }
      </style>
    </head>
    <body>
      <div class="setup-wizard">
        <h2>🚀 Setting up ekkOS...</h2>
        <div class="setup-steps">${stepHtml}</div>
        <div class="progress-container">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress}%"></div>
          </div>
          <div class="progress-text">${progress}% complete</div>
        </div>
      </div>
    </body>
    </html>`;
  }

  /**
   * Render the setup complete celebration view
   */
  private _getSetupCompleteHtml(nonce: string): string {
    const stats = setupStats || { agents: 0, plugins: 0, hooks: 0 };

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
      <style>
        body {
          font-family: var(--vscode-font-family);
          color: var(--vscode-foreground);
          background: var(--vscode-sideBar-background);
          padding: 20px;
          margin: 0;
        }
        .setup-complete {
          text-align: center;
          padding: 20px 0;
        }
        .success-icon {
          font-size: 56px;
          margin-bottom: 16px;
          animation: bounce 0.6s ease;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .setup-complete h2 {
          margin: 0 0 20px 0;
          font-size: 20px;
          color: #10b981;
        }
        .setup-summary {
          background: rgba(255,255,255,0.05);
          border-radius: 12px;
          padding: 16px;
          margin: 20px 0;
          text-align: left;
        }
        .summary-item {
          padding: 8px 0;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .setup-message {
          font-size: 13px;
          color: var(--vscode-descriptionForeground);
          margin: 20px 0;
        }
        .setup-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 20px;
        }
        .btn {
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-primary {
          background: linear-gradient(135deg, #06b6d4, #8b5cf6);
          color: white;
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(139, 92, 246, 0.4);
        }
        .btn-secondary {
          background: rgba(255,255,255,0.1);
          color: var(--vscode-foreground);
        }
        .btn-secondary:hover {
          background: rgba(255,255,255,0.15);
        }
      </style>
    </head>
    <body>
      <div class="setup-complete">
        <div class="success-icon">🎉</div>
        <h2>ekkOS is Ready!</h2>

        <div class="setup-summary">
          <div class="summary-item">✅ ${stats.agents} AI Agent installed</div>
          <div class="summary-item">✅ ${stats.plugins} Claude plugins</div>
          <div class="summary-item">✅ ${stats.hooks} hooks configured</div>
          <div class="summary-item">✅ Memory system connected</div>
        </div>

        <p class="setup-message">
          Your AI now has persistent memory across sessions.
        </p>

        <div class="setup-actions">
          <button class="btn btn-primary" id="reloadBtn">
            Reload IDE to Activate
          </button>
          <button class="btn btn-secondary" id="continueBtn">
            Continue to Dashboard
          </button>
        </div>
      </div>
      <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        document.getElementById('reloadBtn').addEventListener('click', function() {
          vscode.postMessage({ command: 'reloadWindow' });
        });
        document.getElementById('continueBtn').addEventListener('click', function() {
          vscode.postMessage({ command: 'dismissSetupComplete' });
        });
      </script>
    </body>
    </html>`;
  }

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

    // Refresh activity when sidebar becomes visible (event-based, not polling)
    webviewView.onDidChangeVisibility(() => {
      if (webviewView.visible) {
        fetchActivity().then(activity => {
          if (activity) {
            currentActivity = activity;
            this.refresh();
          }
        });
      }
    });

    webviewView.webview.onDidReceiveMessage(async (message) => {
      console.log('[ekkOS ext] received message:', message);
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
        case 'deployToIde':
          if (message.ideName && currentConfig) {
            const allIdes = getIdeConfigs();
            const ide = allIdes.find((c: IDEConfig) => c.name === message.ideName);
            if (ide && ide.exists) {
              deployToIde(ide, currentConfig).then(() => {
                vscode.window.showInformationMessage(`✓ ekkOS Memory configured for ${ide.name}`);
                checkIdeConnections();
                sidebarProvider?.refresh();
              }).catch((e: any) => {
                vscode.window.showErrorMessage(`Failed to configure ${ide.name}: ${e.message}`);
              });
            } else {
              vscode.window.showWarningMessage(`${message.ideName} is not installed on this system`);
            }
          }
          break;
        case 'fullSetupIde':
          if (message.ideName && currentConfig) {
            fullSetupForIde(message.ideName, currentConfig).then((result) => {
              if (result.success) {
                vscode.window.showInformationMessage(`✓ ${message.ideName} fully configured! ${result.message}`);
              } else {
                vscode.window.showErrorMessage(`Setup failed: ${result.message}`);
              }
              checkIdeConnections();
              sidebarProvider?.refresh();
            });
          } else {
            vscode.window.showWarningMessage('Please connect to ekkOS first');
          }
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
          vscode.env.openExternal(vscode.Uri.parse(`${getPlatformUrl()}/login`));
          break;
        case 'openDocs':
          vscode.env.openExternal(vscode.Uri.parse('https://docs.ekkos.dev'));
          break;
        case 'openSettings':
          // Open extension settings focused on ekkOS configuration
          vscode.commands.executeCommand('workbench.action.openSettings', 'ekkos');
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
        case 'copyCredential':
          if (currentConfig && message.field) {
            const value = message.field === 'apiKey' ? currentConfig.apiKey : currentConfig.userId;
            const label = message.field === 'apiKey' ? 'API Key' : 'User ID';
            vscode.env.clipboard.writeText(value).then(() => {
              vscode.window.showInformationMessage(`${label} copied to clipboard!`);
            });
          }
          break;
        case 'revealCredential':
          // Security: Never send full credentials to webview
          // Users can copy securely via copyCredential command
          if (currentConfig && this._view) {
            const field = message.field as 'apiKey' | 'userId';
            if (field === 'apiKey' || field === 'userId') {
              const value = field === 'apiKey' ? currentConfig.apiKey : currentConfig.userId;
              // Track reveal state per field
              this._revealState[field] = !this._revealState[field];
              const revealed = this._revealState[field];
              // Only show slightly more characters when "revealed", never the full value
              const masked = value.substring(0, 8) + '...' + value.substring(value.length - 4);
              const partialReveal = value.substring(0, 12) + '...' + value.substring(value.length - 6);
              this._view.webview.postMessage({
                command: 'credentialRevealed',
                field: field,
                revealed: revealed,
                value: revealed ? partialReveal : masked,  // Never send full value
                masked: masked
              });
            }
          }
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
        case 'reloadWindow':
          // Reload the IDE window to activate new configuration
          vscode.commands.executeCommand('workbench.action.reloadWindow');
          break;
        case 'dismissSetupComplete':
          // Clear setup complete state and show normal dashboard
          setupComplete = false;
          setupStats = null;
          sidebarProvider?.refresh();
          break;
        case 'manualApiKey':
          handleManualApiKey(message.apiKey, this._context);
          break;
        case 'setScope':
          if (currentConfig && message.scope) {
            currentConfig.patternScope = message.scope;
            await saveConfigAsync(currentConfig);
            updateStatusBar();
          }
          break;
        case 'setScopeAndRefresh':
          if (currentConfig && message.scope) {
            currentConfig.patternScope = message.scope;
            await saveConfigAsync(currentConfig);
            updateStatusBar();
            // Fetch new activity with updated scope and refresh UI
            fetchActivity().then(activity => {
              if (activity) {
                currentActivity = activity;
                sidebarProvider?.refresh();
              }
            });
          }
          break;
        case 'openConfigFile':
          {
            const homeDir = os.homedir();
            let filePath: string | null = null;
            let isDirectory = false;

            const ide = message.ide as string;
            const fileType = message.fileType as string;

            if (ide === 'claude-code') {
              if (fileType === 'mcp') {
                filePath = path.join(homeDir, '.claude.json');
              } else if (fileType === 'hooks') {
                filePath = path.join(homeDir, '.claude', 'hooks');
                isDirectory = true;
              } else if (fileType === 'rules') {
                filePath = path.join(homeDir, '.claude', 'CLAUDE.md');
              }
            } else if (ide === 'cursor') {
              if (fileType === 'mcp') {
                filePath = path.join(homeDir, '.cursor', 'mcp.json');
              } else if (fileType === 'hooks') {
                filePath = path.join(homeDir, '.cursor', 'hooks.json');
              } else if (fileType === 'rules') {
                filePath = path.join(homeDir, '.cursorrules');
              }
            } else if (ide === 'windsurf') {
              if (fileType === 'mcp') {
                filePath = path.join(homeDir, '.codeium', 'windsurf', 'mcp_config.json');
              } else if (fileType === 'hooks') {
                filePath = path.join(homeDir, '.codeium', 'windsurf', 'hooks.json');
              } else if (fileType === 'rules') {
                filePath = path.join(homeDir, '.windsurfrules');
              }
            } else if (ide === 'claude-desktop') {
              if (fileType === 'mcp') {
                if (process.platform === 'darwin') {
                  filePath = path.join(homeDir, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
                } else if (process.platform === 'win32') {
                  filePath = path.join(process.env.APPDATA || homeDir, 'Claude', 'claude_desktop_config.json');
                } else {
                  filePath = path.join(homeDir, '.config', 'Claude', 'claude_desktop_config.json');
                }
              }
            }

            if (filePath) {
              if (isDirectory) {
                // Open directory in file explorer / Finder
                if (fs.existsSync(filePath)) {
                  vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(filePath));
                } else {
                  vscode.window.showWarningMessage(`Directory not found: ${filePath}`);
                }
              } else {
                // Open file in editor
                if (fs.existsSync(filePath)) {
                  vscode.workspace.openTextDocument(filePath).then(doc => {
                    vscode.window.showTextDocument(doc);
                  });
                } else {
                  vscode.window.showWarningMessage(`File not found: ${filePath}`);
                }
              }
            } else {
              vscode.window.showWarningMessage(`${fileType} not available for ${ide}`);
            }
          }
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

    // Generate nonce for CSP
    const nonce = this._getNonce();

    // Check if we're in setup progress mode
    if (currentSetupSteps) {
      return this._getSetupProgressHtml(nonce);
    }

    // Check if setup just completed
    if (setupComplete && setupStats) {
      return this._getSetupCompleteHtml(nonce);
    }

    // Get extension version from package.json
    const extensionVersion = this._context.extension.packageJSON.version || '0.0.0';

    // Get brain icon URI for webview
    const brainIconPath = vscode.Uri.joinPath(this._extensionUri, 'resources', 'ekkos-icon.svg');
    const brainIconUri = this._view?.webview.asWebviewUri(brainIconPath).toString() || '';

    // Golden Loop status section - REAL-TIME per-turn tracking
    const currentTurn = currentGoldenLoopTurn;
    const phaseEmojis = {
      idle: '⏸️',
      capture: '📥',
      learn: '🧠',
      retrieve: '🔍',
      inject: '💉',
      measure: '📊',
      complete: '✅'
    };
    const phaseLabels = {
      idle: 'Idle',
      capture: 'Capturing',
      learn: 'Learning',
      retrieve: 'Retrieving',
      inject: 'Injecting',
      measure: 'Measuring',
      complete: 'Complete'
    };

    const goldenLoopHtml = activity ? `
      <div class="section golden-loop">
        <h3>Golden Loop - Turn ${currentTurn?.turn || 0}</h3>
        ${currentTurn ? `
          <div class="current-phase">
            <span class="phase-icon">${phaseEmojis[currentTurn.phase]}</span>
            <span class="phase-label">${phaseLabels[currentTurn.phase]}</span>
          </div>
          <div class="phase-flow">
            <span class="${currentTurn.phase === 'capture' || currentTurn.turn > 0 ? 'active' : ''}">📥</span>
            <span class="arrow">→</span>
            <span class="${currentTurn.phase === 'learn' ? 'active' : ''}">🧠</span>
            <span class="arrow">→</span>
            <span class="${currentTurn.phase === 'retrieve' || currentTurn.stats.retrieved > 0 ? 'active' : ''}">🔍</span>
            <span class="arrow">→</span>
            <span class="${currentTurn.phase === 'inject' || currentTurn.stats.applied > 0 ? 'active' : ''}">💉</span>
            <span class="arrow">→</span>
            <span class="${currentTurn.phase === 'measure' || currentTurn.stats.forged > 0 ? 'active' : ''}">📊</span>
          </div>
          <div class="loop-stats">
            <div class="stat">
              <span class="stat-icon">🔍</span>
              <span class="stat-value">${currentTurn.stats.retrieved}</span>
              <span class="stat-label">Retrieved</span>
            </div>
            <div class="stat">
              <span class="stat-icon">✨</span>
              <span class="stat-value">${currentTurn.stats.applied}</span>
              <span class="stat-label">Applied</span>
            </div>
            <div class="stat">
              <span class="stat-icon">🔥</span>
              <span class="stat-value">${currentTurn.stats.forged}</span>
              <span class="stat-label">Forged</span>
            </div>
          </div>
        ` : `
          <div class="loop-stats">
            <div class="stat">
              <span class="stat-icon">🔍</span>
              <span class="stat-value">${activity.goldenLoop.retrievals}</span>
              <span class="stat-label">Retrieved (Total)</span>
            </div>
            <div class="stat">
              <span class="stat-icon">✨</span>
              <span class="stat-value">${activity.goldenLoop.applications}</span>
              <span class="stat-label">Applied (Total)</span>
            </div>
            <div class="stat">
              <span class="stat-icon">🔥</span>
              <span class="stat-value">${activity.goldenLoop.forged}</span>
              <span class="stat-label">Forged (Total)</span>
            </div>
            <div class="stat">
              <span class="stat-icon">📈</span>
              <span class="stat-value">${activity.goldenLoop.successRate}%</span>
              <span class="stat-label">Success</span>
            </div>
          </div>
        `}
      </div>

      <div class="section usage">
        <h3>Usage This Month</h3>
        <div class="usage-bar">
          <div class="usage-label">
            <span>Ekkos</span>
            <span>${activity.usage.ekkos.used} / ${activity.usage.ekkos.limit === -1 ? '∞' : activity.usage.ekkos.limit}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${activity.usage.ekkos.limit <= 0 ? 0 : Math.min(100, (activity.usage.ekkos.used / activity.usage.ekkos.limit) * 100)}%"></div>
          </div>
        </div>
        <div class="usage-bar">
          <div class="usage-label">
            <span>Pattern Forging</span>
            <span>${activity.usage.crystallizations.used} / ${activity.usage.crystallizations.limit === -1 ? '∞' : activity.usage.crystallizations.limit}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${activity.usage.crystallizations.limit <= 0 ? 0 : Math.min(100, (activity.usage.crystallizations.used / activity.usage.crystallizations.limit) * 100)}%"></div>
          </div>
        </div>
        <div class="usage-bar">
          <div class="usage-label">
            <span>API Requests</span>
            <span>${activity.usage.apiRequests?.used ?? 0} / ${(activity.usage.apiRequests?.limit ?? 100) === -1 ? '∞' : (activity.usage.apiRequests?.limit ?? 100)}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill api" style="width: ${(activity.usage.apiRequests?.limit ?? 100) <= 0 ? 0 : Math.min(100, ((activity.usage.apiRequests?.used ?? 0) / (activity.usage.apiRequests?.limit ?? 100)) * 100)}%"></div>
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
    // Use tier from API (database) as source of truth, fall back to local config
    const userTier = (activity?.tier || config?.tier || 'free') as 'free' | 'pro' | 'team' | 'enterprise';
    const isPremiumTier = userTier === 'enterprise' || userTier === 'team' || userTier === 'pro';
    const usageStats = activity?.usage || {
      ekkos: { used: 0, limit: isPremiumTier ? -1 : 100 },
      crystallizations: { used: 0, limit: isPremiumTier ? -1 : 50 },
      apiRequests: { used: 0, limit: isPremiumTier ? -1 : 100 }
    };

    // Calculate usage percentages for tier enforcement
    const ekkosPercent = usageStats.ekkos.limit === -1 ? 0 : (usageStats.ekkos.used / usageStats.ekkos.limit) * 100;
    const crystallizePercent = usageStats.crystallizations.limit === -1 ? 0 : (usageStats.crystallizations.used / usageStats.crystallizations.limit) * 100;
    const ekkosStatus = ekkosPercent >= 100 ? 'exceeded' : ekkosPercent >= 80 ? 'warning' : 'normal';
    const crystallizeStatus = crystallizePercent >= 100 ? 'exceeded' : crystallizePercent >= 80 ? 'warning' : 'normal';
    const showUpgradeBanner = userTier === 'free' && (ekkosPercent >= 80 || crystallizePercent >= 80);
    const limitExceeded = userTier === 'free' && (ekkosPercent >= 100 || crystallizePercent >= 100);
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
          <img src="${brainIconUri}" width="48" height="48" alt="ekkOS Brain" style="filter: brightness(0) invert(1) drop-shadow(0 0 8px rgba(255, 255, 255, 0.2));" />
          <div class="brand-text">
            <div class="brand-name">ekkOS_™ <span class="version-badge">v${extensionVersion}</span></div>
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
          <div class="user-avatar">${config.email ? config.email.charAt(0).toUpperCase() : '👤'}</div>
          <div class="user-details">
            <div class="user-email">${config.email || (config.userId ? `User ${config.userId.substring(0, 8)}...` : 'Connected User')}</div>
            <div class="user-tier tier-${userTier}">
              <span class="tier-icon">${userTier === 'enterprise' ? '👑' : userTier === 'pro' ? '⭐' : userTier === 'team' ? '🤝' : '🆓'}</span>
              ${TIER_NAMES[userTier] || userTier.toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      <div class="section golden-loop-section">
        <div class="section-header">
          <h3>🔄 Golden Loop</h3>
          <button class="refresh-btn" data-cmd="refresh" title="Refresh stats">↻</button>
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

      <div class="section collective-section">
        <h3>🌐 Pattern Library</h3>
        <div class="collective-stats">
          <div class="collective-main">
            <span class="collective-total">${(activity?.collective?.displayTotal ?? activity?.collective?.total ?? 0).toLocaleString()}</span>
            <span class="collective-label">${
              config.patternScope === 'personal' ? 'your personal patterns' :
              config.patternScope === 'collective' ? 'collective patterns (all users)' :
              'total patterns available'
            }</span>
          </div>
          <div class="collective-details">
            <div class="collective-item">
              <span class="collective-icon">👤</span>
              <span class="collective-value">${(activity?.collective?.yourPatterns ?? 0).toLocaleString()}</span>
              <span class="collective-sublabel">Personal</span>
            </div>
            <div class="collective-item">
              <span class="collective-icon">🌐</span>
              <span class="collective-value">${(activity?.collective?.total ?? 0).toLocaleString()}</span>
              <span class="collective-sublabel">Collective</span>
            </div>
            <div class="collective-item">
              <span class="collective-icon">🎁</span>
              <span class="collective-value">${(activity?.collective?.yourContributions ?? 0).toLocaleString()}</span>
              <span class="collective-sublabel">Contributed</span>
            </div>
          </div>
        </div>
      </div>

      <div class="section scope-section">
        <h3>🎯 Pattern Scope</h3>
        <div class="scope-card">
          <div class="scope-options">
            <label class="scope-option ${config.patternScope === 'both' || !config.patternScope ? 'selected' : ''}">
              <input type="radio" name="scope" value="both" ${config.patternScope === 'both' || !config.patternScope ? 'checked' : ''} data-cmd="setScope" data-scope="both">
              <span class="scope-icon">●</span>
              <span class="scope-label">Both</span>
              <span class="scope-desc">Personal + Collective</span>
            </label>
            <label class="scope-option ${config.patternScope === 'personal' ? 'selected' : ''}">
              <input type="radio" name="scope" value="personal" ${config.patternScope === 'personal' ? 'checked' : ''} data-cmd="setScope" data-scope="personal">
              <span class="scope-icon">P</span>
              <span class="scope-label">Personal</span>
              <span class="scope-desc">Only your patterns</span>
            </label>
            <label class="scope-option ${config.patternScope === 'collective' ? 'selected' : ''}">
              <input type="radio" name="scope" value="collective" ${config.patternScope === 'collective' ? 'checked' : ''} data-cmd="setScope" data-scope="collective">
              <span class="scope-icon">C</span>
              <span class="scope-label">Collective</span>
              <span class="scope-desc">All users' patterns</span>
            </label>
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
              <div class="progress-bar-fill ${ekkosStatus}" style="width: ${usageStats.ekkos.limit <= 0 ? 5 : Math.min(100, (usageStats.ekkos.used / usageStats.ekkos.limit) * 100)}%">
                <div class="progress-shimmer"></div>
              </div>
            </div>
            ${ekkosStatus === 'exceeded' ? '<div class="limit-message">⚠️ Limit reached</div>' : ''}
          </div>
          <div class="usage-item ${crystallizeStatus}">
            <div class="usage-header">
              <span class="usage-icon">💎</span>
              <span class="usage-name">Pattern Forging</span>
              <span class="usage-count ${crystallizeStatus}">${usageStats.crystallizations.used.toLocaleString()} / ${usageStats.crystallizations.limit === -1 ? '∞' : usageStats.crystallizations.limit.toLocaleString()}</span>
            </div>
            <div class="progress-track">
              <div class="progress-bar-fill crystallize ${crystallizeStatus}" style="width: ${usageStats.crystallizations.limit <= 0 ? 5 : Math.min(100, (usageStats.crystallizations.used / usageStats.crystallizations.limit) * 100)}%">
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
            <div class="upgrade-title">${limitExceeded ? 'Developer Tier Limit Reached' : 'Approaching Developer Tier Limit'}</div>
            <div class="upgrade-message">${limitExceeded
              ? 'Upgrade to Professional for unlimited memory and pattern forging.'
              : Math.max(Math.round(ekkosPercent), Math.round(crystallizePercent)) + '% of Developer tier used. Upgrade to Professional for more.'}</div>
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

      <div class="section credentials-section">
        <h3>🔑 Your Credentials</h3>
        <div class="credentials-card">
          <div class="credential-row">
            <span class="credential-label">API Key</span>
            <div class="credential-value-row">
              <code class="credential-value" id="apiKeyValue">${config.apiKey.substring(0, 8)}...${config.apiKey.substring(config.apiKey.length - 4)}</code>
              <button class="copy-btn" data-cmd="copyCredential" data-field="apiKey" title="Copy API Key">
                <span class="copy-icon">📋</span>
              </button>
              <button class="reveal-btn" data-cmd="revealCredential" data-field="apiKey" title="Show/Hide">
                <span class="reveal-icon" id="apiKeyRevealIcon">👁</span>
              </button>
            </div>
          </div>
          <div class="credential-row">
            <span class="credential-label">User ID</span>
            <div class="credential-value-row">
              <code class="credential-value" id="userIdValue">${config.userId.substring(0, 8)}...${config.userId.substring(config.userId.length - 4)}</code>
              <button class="copy-btn" data-cmd="copyCredential" data-field="userId" title="Copy User ID">
                <span class="copy-icon">📋</span>
              </button>
              <button class="reveal-btn" data-cmd="revealCredential" data-field="userId" title="Show/Hide">
                <span class="reveal-icon" id="userIdRevealIcon">👁</span>
              </button>
            </div>
          </div>
          <div class="credentials-hint">
            API Endpoint: <code style="font-size: 9px; background: rgba(139,92,246,0.1); padding: 2px 4px; border-radius: 3px;">${getMcpApiUrl()}</code><br/>
            Use these to manually configure IDEs not auto-detected
          </div>
        </div>
      </div>

      ${vscode.workspace.getConfiguration('ekkos').get<boolean>('allowDiskApiKey', true) ? `
      <!-- Security Notice: Disk Key Storage -->
      <div class="section security-notice-section">
        <div class="security-notice" style="background: linear-gradient(135deg, rgba(234, 179, 8, 0.1), rgba(234, 179, 8, 0.05)); border: 1px solid rgba(234, 179, 8, 0.3); border-radius: 8px; padding: 12px; margin-top: 8px;">
          <div style="display: flex; align-items: flex-start; gap: 10px;">
            <span style="font-size: 16px;">🔐</span>
            <div style="flex: 1;">
              <div style="font-weight: 600; color: #eab308; font-size: 11px; margin-bottom: 4px;">Hook Key Stored on Disk</div>
              <div style="font-size: 10px; color: rgba(255,255,255,0.7); line-height: 1.4;">
                CLI hooks (Cursor/Claude Code) require storing a hook key in <code style="font-size: 9px; background: rgba(234,179,8,0.2); padding: 1px 4px; border-radius: 3px;">~/.ekkos/config.json</code> with chmod 600 permissions.
                <a href="https://docs.ekkos.dev/security/disk-keys" style="color: #eab308; text-decoration: underline; margin-left: 4px;">Learn more</a>
              </div>
              <div style="margin-top: 6px;">
                <button class="security-btn" data-cmd="openSettings" style="font-size: 9px; padding: 4px 8px; background: rgba(234,179,8,0.2); border: 1px solid rgba(234,179,8,0.4); border-radius: 4px; color: #eab308; cursor: pointer;">
                  Disable in Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      ` : ''}

      <!-- CURRENT IDE - Prominent display -->
      <div class="section current-ide-section">
        ${(() => {
          const currentIDE = detectCurrentIDE();
          const ideNameMap: Record<string, string> = {
            'windsurf': 'Windsurf',
            'cursor': 'Cursor',
            'claude-code': 'Claude Code',
            'vscode': 'VS Code'
          };
          const ideLogoMap: Record<string, string> = {
            'Windsurf': 'windsurf.svg',
            'Cursor': 'cursor.svg',
            'Claude Code': 'claude-code.svg',
            'VS Code': 'vscode.svg'
          };
          const currentIdeName = ideNameMap[currentIDE] || 'Unknown IDE';
          const logoFile = ideLogoMap[currentIdeName] || 'vscode.svg';
          const logoPath = vscode.Uri.joinPath(this._extensionUri, 'resources', 'logos', 'ides', logoFile);
          const logoUri = this._view?.webview.asWebviewUri(logoPath).toString() || '';
          const currentIdeConfig = ideConfigs.find(ide => ide.name === currentIdeName || (currentIdeName === 'VS Code' && ide.name === 'Cursor'));
          const currentStatus = currentIdeConfig ? getIdeConnectionStatus(currentIdeConfig.name) : { status: 'unknown' };
          const isConfigured = currentStatus.status === 'configured';

          return `
            <div class="current-ide-header">
              <span class="header-icon">🎯</span>
              <h3>You're Using</h3>
            </div>
            <div class="current-ide-card ${isConfigured ? 'configured' : 'needs-setup'}">
              <div class="current-ide-logo-wrapper">
                <img src="${logoUri}" alt="${currentIdeName}" class="current-ide-logo" />
              </div>
              <div class="current-ide-info">
                <div class="current-ide-name">${currentIdeName}</div>
                <div class="current-ide-status ${isConfigured ? 'ok' : 'warn'}">
                  ${isConfigured ? '✓ MCP + Hooks + Rules Ready' : '○ Needs Full Setup'}
                </div>
              </div>
              <button class="btn ${isConfigured ? 'btn-secondary' : 'btn-primary btn-glow'}" data-cmd="fullSetupIde" data-idename="${currentIdeName}" style="margin-left: auto;">
                ${isConfigured ? '⚙️ Reinstall' : '🚀 Full Setup'}
              </button>
            </div>
            <div class="setup-details">
              <span class="setup-badge ${isConfigured ? 'active' : ''}"><span class="badge-dot"></span>MCP</span>
              <span class="setup-badge ${isConfigured ? 'active' : ''}"><span class="badge-dot"></span>Hooks</span>
              <span class="setup-badge ${isConfigured ? 'active' : ''}"><span class="badge-dot"></span>Rules</span>
            </div>
          `;
        })()}
      </div>

      <!-- OTHER IDEs - Expandable list -->
      <div class="section other-ides-section">
        <div class="section-header" data-cmd="toggleOtherIdes" style="cursor: pointer;">
          <h3>📋 Other AI Editors</h3>
          <span class="expand-icon" id="other-ides-toggle">▶</span>
        </div>
        <div class="other-ides-list" id="other-ides-list" style="display: none;">
          ${(() => {
            const currentIDE = detectCurrentIDE();
            const ideNameMap: Record<string, string> = {
              'windsurf': 'Windsurf',
              'cursor': 'Cursor',
              'claude-code': 'Claude Code',
              'vscode': 'VS Code'
            };
            // Get IDE logo URIs
            const getIdeLogo = (ideName: string): string => {
              const logoMap: Record<string, string> = {
                'Windsurf': 'windsurf.svg',
                'Cursor': 'cursor.svg',
                'Claude Code': 'claude-code.svg',
                'Claude Desktop': 'claude-desktop.svg',
                'VS Code': 'vscode.svg',
                'Codex': 'codex.svg'
              };
              const filename = logoMap[ideName] || 'vscode.svg';
              const logoPath = vscode.Uri.joinPath(this._extensionUri, 'resources', 'logos', 'ides', filename);
              return this._view?.webview.asWebviewUri(logoPath).toString() || '';
            };

            const currentIdeName = ideNameMap[currentIDE];

            // Filter out current IDE and show others
            return ideConfigs.filter(ide => ide.name !== currentIdeName && !(currentIdeName === 'VS Code' && ide.name === 'Cursor')).map(ide => {
              const connStatus = getIdeConnectionStatus(ide.name);
              const logoUrl = getIdeLogo(ide.name);
              let statusClass = 'not-installed';
              let statusText = 'Not Installed';
              let showButton = false;

              if (!ide.exists) {
                statusClass = 'not-installed';
                statusText = 'Not Installed';
              } else if (connStatus.status === 'configured') {
                statusClass = 'configured';
                statusText = '✓ Ready';
                showButton = true;
              } else if (connStatus.status === 'not-configured') {
                statusClass = 'not-configured';
                statusText = 'Not Setup';
                showButton = true;
              } else {
                statusClass = 'unknown';
                statusText = 'Unknown';
                showButton = ide.exists;
              }

              return `
                <div class="other-ide-row">
                  <span class="other-ide-icon"><img src="${logoUrl}" alt="${ide.name}" style="width: 20px; height: 20px; object-fit: contain;" /></span>
                  <span class="other-ide-name">${ide.name}</span>
                  <span class="other-ide-status ${statusClass}">${statusText}</span>
                  ${showButton ? `<button class="btn-mini" data-cmd="fullSetupIde" data-idename="${ide.name}">${connStatus.status === 'configured' ? '⚙️' : '🚀'}</button>` : ''}
                </div>
              `;
            }).join('');
          })()}
          <div class="other-ides-hint">
            One-click: MCP + Hooks + Rules
          </div>
        </div>
      </div>

      <div class="section setup-section">
        <div class="section-header">
          <h3>🔧 System Diagnostics</h3>
          <button class="refresh-btn" data-cmd="runDiagnostics" title="Run full diagnostics">⚡</button>
        </div>
        <div class="diagnostic-grid">
          <div class="diagnostic-item ${setupStatus?.apiConnection?.status === 'connected' ? 'ok' : 'warn'}">
            <span class="diag-icon">${setupStatus?.apiConnection?.status === 'connected' ? '✅' : '⚠️'}</span>
            <span class="diag-label">API Connection</span>
            <span class="diag-value">${setupStatus?.apiConnection?.latency ? setupStatus.apiConnection.latency + 'ms' : (setupStatus?.apiConnection?.status || 'N/A')}</span>
          </div>
          ${(() => {
            const currentIDE = detectCurrentIDE();
            const diagnostics: string[] = [];
            
            // Windsurf only needs MCP config (no hooks)
            if (currentIDE === 'windsurf') {
              const windsurfConfig = ideConfigs.find(ide => ide.name === 'Windsurf');
              const windsurfStatus = windsurfConfig ? getIdeConnectionStatus('Windsurf') : { status: 'unknown' };
              diagnostics.push(`
                <div class="diagnostic-item ${windsurfStatus.status === 'configured' ? 'ok' : windsurfStatus.status === 'not-configured' ? 'warn' : 'info'}">
                  <span class="diag-icon">${windsurfStatus.status === 'configured' ? '✅' : '○'}</span>
                  <span class="diag-label">Windsurf MCP Config</span>
                  <span class="diag-value">${windsurfStatus.status === 'configured' ? 'Active' : windsurfStatus.status === 'not-configured' ? 'Not Set' : 'Checking...'}</span>
                </div>
              `);
              return diagnostics.join('');
            }
            
            // Claude Code needs hooks - global only
            if (currentIDE === 'claude-code') {
              diagnostics.push(`
                <div class="diagnostic-item ${setupStatus?.globalHooks?.claudeMd?.hasEkkos ? 'ok' : 'warning'}">
                  <span class="diag-icon">${setupStatus?.globalHooks?.claudeMd?.hasEkkos ? '✅' : '⚠️'}</span>
                  <span class="diag-label">Global CLAUDE.md</span>
                  <span class="diag-value">${setupStatus?.globalHooks?.claudeMd?.hasEkkos ? 'Active' : 'Not Setup'}</span>
                </div>
                <div class="diagnostic-item ${setupStatus?.globalHooks?.claudeDir?.hasHooks ? 'ok' : 'warning'}">
                  <span class="diag-icon">${setupStatus?.globalHooks?.claudeDir?.hasHooks ? '✅' : '⚠️'}</span>
                  <span class="diag-label">Global Hooks (~/.claude/)</span>
                  <span class="diag-value">${setupStatus?.globalHooks?.claudeDir?.hasHooks ? 'Active' : 'Not Setup'}</span>
                </div>
              `);
              return diagnostics.join('');
            }
            
            // Cursor needs .cursorrules - only show global (recommended)
            if (currentIDE === 'cursor') {
              diagnostics.push(`
                <div class="diagnostic-item ${setupStatus?.globalHooks?.cursorrules?.hasEkkos ? 'ok' : 'warning'}">
                  <span class="diag-icon">${setupStatus?.globalHooks?.cursorrules?.hasEkkos ? '✅' : '⚠️'}</span>
                  <span class="diag-label">Global .cursorrules</span>
                  <span class="diag-value">${setupStatus?.globalHooks?.cursorrules?.hasEkkos ? 'Active' : 'Not Setup'}</span>
                </div>
              `);
              return diagnostics.join('');
            }
            
            // VS Code or unknown - show minimal
            return '';
          })()}
        </div>
      </div>

      <div class="section actions-section">
        <h3>🛠️ Management</h3>

        <div class="action-card" data-cmd="openDashboard">
          <div class="action-card-icon">📊</div>
          <div class="action-card-content">
            <div class="action-card-title">Open Web Dashboard</div>
            <div class="action-card-desc">View patterns, manage settings, see learning analytics</div>
          </div>
          <div class="action-card-arrow">→</div>
        </div>

        <div class="action-card action-card-help" data-cmd="openDocs">
          <div class="action-card-icon">📚</div>
          <div class="action-card-content">
            <div class="action-card-title">Documentation & Help</div>
            <div class="action-card-desc">Learn about Golden Loop, memory layers, and best practices</div>
          </div>
          <div class="action-card-arrow">→</div>
        </div>

        <div class="section-divider"></div>

        <h3>Config Files</h3>
        <p class="config-files-desc">Open MCP, hooks, and rules files for each IDE</p>

        ${(() => {
          // Generate logo URIs for config files section
          const getConfigLogo = (filename: string) => {
            const logoPath = vscode.Uri.joinPath(this._extensionUri, 'resources', 'logos', 'ides', filename);
            return this._view?.webview.asWebviewUri(logoPath).toString() || '';
          };
          const claudeCodeLogo = getConfigLogo('claude-code.svg');
          const cursorLogo = getConfigLogo('cursor.svg');
          const windsurfLogo = getConfigLogo('windsurf.svg');
          const claudeDesktopLogo = getConfigLogo('claude-desktop.svg');

          return `
        <div class="config-files-grid">
          <div class="config-ide-row">
            <div class="config-ide-header">
              <span class="config-ide-icon"><img src="${claudeCodeLogo}" alt="Claude Code" style="width: 18px; height: 18px; object-fit: contain;" /></span>
              <span class="config-ide-name">Claude Code</span>
            </div>
            <div class="config-ide-buttons">
              <button class="config-btn" data-cmd="openConfigFile" data-ide="claude-code" data-filetype="mcp" title="~/.claude.json">MCP</button>
              <button class="config-btn" data-cmd="openConfigFile" data-ide="claude-code" data-filetype="hooks" title="~/.claude/hooks/">Hooks</button>
              <button class="config-btn" data-cmd="openConfigFile" data-ide="claude-code" data-filetype="rules" title="~/.claude/CLAUDE.md">Rules</button>
            </div>
          </div>
          <div class="config-ide-row">
            <div class="config-ide-header">
              <span class="config-ide-icon"><img src="${cursorLogo}" alt="Cursor" style="width: 18px; height: 18px; object-fit: contain;" /></span>
              <span class="config-ide-name">Cursor</span>
            </div>
            <div class="config-ide-buttons">
              <button class="config-btn" data-cmd="openConfigFile" data-ide="cursor" data-filetype="mcp" title="~/.cursor/mcp.json">MCP</button>
              <button class="config-btn" data-cmd="openConfigFile" data-ide="cursor" data-filetype="hooks" title="~/.cursor/hooks.json">Hooks</button>
              <button class="config-btn" data-cmd="openConfigFile" data-ide="cursor" data-filetype="rules" title="~/.cursorrules">Rules</button>
            </div>
          </div>
          <div class="config-ide-row">
            <div class="config-ide-header">
              <span class="config-ide-icon"><img src="${windsurfLogo}" alt="Windsurf" style="width: 18px; height: 18px; object-fit: contain;" /></span>
              <span class="config-ide-name">Windsurf</span>
            </div>
            <div class="config-ide-buttons">
              <button class="config-btn" data-cmd="openConfigFile" data-ide="windsurf" data-filetype="mcp" title="~/.codeium/windsurf/mcp_config.json">MCP</button>
              <button class="config-btn" data-cmd="openConfigFile" data-ide="windsurf" data-filetype="hooks" title="~/.codeium/windsurf/hooks.json">Hooks</button>
              <button class="config-btn" data-cmd="openConfigFile" data-ide="windsurf" data-filetype="rules" title="~/.windsurfrules">Rules</button>
            </div>
          </div>
          <div class="config-ide-row">
            <div class="config-ide-header">
              <span class="config-ide-icon"><img src="${claudeDesktopLogo}" alt="Claude Desktop" style="width: 18px; height: 18px; object-fit: contain;" /></span>
              <span class="config-ide-name">Claude Desktop</span>
            </div>
            <div class="config-ide-buttons">
              <button class="config-btn" data-cmd="openConfigFile" data-ide="claude-desktop" data-filetype="mcp" title="~/Library/Application Support/Claude/claude_desktop_config.json">MCP</button>
              <button class="config-btn config-btn-disabled" disabled title="Claude Desktop doesn't support hooks">Hooks</button>
              <button class="config-btn config-btn-disabled" disabled title="Claude Desktop doesn't support rules">Rules</button>
            </div>
          </div>
        </div>`;
        })()}

        <div class="section-divider"></div>

        <button class="btn btn-ghost btn-disconnect" data-cmd="disconnect">
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
          <img src="${brainIconUri}" width="64" height="64" alt="ekkOS Brain" style="margin-bottom: 12px; filter: brightness(0) invert(1) drop-shadow(0 0 12px rgba(255, 255, 255, 0.3));" />
          <div class="logo-glow"></div>
          <div class="logo">ekkOS_™ <span class="version-badge-welcome">v${extensionVersion}</span></div>
          <div class="logo-tagline">Universal AI Memory Gateway</div>
        </div>

        <div class="welcome-card">
          ${(() => {
            const currentIDE = detectCurrentIDE();

            // Get logo URIs for webview
            const getLogoUri = (filename: string) => {
              const logoPath = vscode.Uri.joinPath(this._extensionUri, 'resources', 'logos', 'ides', filename);
              return this._view?.webview.asWebviewUri(logoPath).toString() || '';
            };

            const ideInfo: Record<string, { name: string; logo: string; steps: string[] }> = {
              'windsurf': {
                name: 'Windsurf',
                logo: getLogoUri('windsurf.svg'),
                steps: [
                  '1. Click "Connect to ekkOS" below',
                  '2. Enter the code at platform.ekkos.dev',
                  '3. Restart Windsurf to activate'
                ]
              },
              'cursor': {
                name: 'Cursor',
                logo: getLogoUri('cursor.svg'),
                steps: [
                  '1. Click "Connect to ekkOS" below',
                  '2. Enter the code at platform.ekkos.dev',
                  '3. Reload Cursor window (Cmd+Shift+P → "Reload Window")'
                ]
              },
              'claude-code': {
                name: 'Claude Code',
                logo: getLogoUri('claude-code.svg'),
                steps: [
                  '1. Click "Connect to ekkOS" below',
                  '2. Enter the code at platform.ekkos.dev',
                  '3. Restart Claude Code to activate'
                ]
              },
              'vscode': {
                name: 'VS Code',
                logo: getLogoUri('vscode.svg'),
                steps: [
                  '1. Click "Connect to ekkOS" below',
                  '2. Enter the code at platform.ekkos.dev',
                  '3. Restart VS Code to activate'
                ]
              },
              'unknown': {
                name: 'Your IDE',
                logo: getLogoUri('vscode.svg'), // fallback to VS Code logo
                steps: [
                  '1. Click "Connect to ekkOS" below',
                  '2. Enter the code at platform.ekkos.dev',
                  '3. Restart your IDE to activate'
                ]
              }
            };
            const info = ideInfo[currentIDE] || ideInfo['unknown'];

            return `
              <div style="text-align: center; margin-bottom: 24px;">
                <div style="margin-bottom: 16px;">
                  <img src="${info.logo}" alt="${info.name}" style="width: 64px; height: 64px; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));" />
                </div>
                <h2 style="margin-bottom: 8px;">Connect ${info.name}</h2>
                <p style="color: var(--vscode-descriptionForeground); font-size: 13px;">3 simple steps to get started</p>
              </div>
              <div style="background: var(--vscode-editor-background); border: 1px solid var(--vscode-widget-border); border-radius: 8px; padding: 16px; margin: 20px 0;">
                ${info.steps.map(step => `
                  <div style="padding: 8px 0; color: var(--vscode-foreground); font-size: 13px;">${step}</div>
                `).join('')}
              </div>
            `;
          })()}
        </div>

        <div class="features-preview" style="margin: 24px 0;">
          <div class="feature">
            <span class="feature-icon">🧠</span>
            <span class="feature-text">Your AI remembers everything</span>
          </div>
          <div class="feature">
            <span class="feature-icon">⚡</span>
            <span class="feature-text">Automatic setup - no manual config</span>
          </div>
        </div>

        <div class="welcome-actions">
          <button class="btn btn-primary btn-glow" data-cmd="connect" style="margin-bottom: 12px; width: 100%; font-size: 14px; padding: 12px 24px;">
            <span class="btn-icon">🚀</span>
            Connect to ekkOS
          </button>
          <p class="hint" style="margin-bottom: 16px;">
            You'll receive a code to enter at platform.ekkos.dev
          </p>
          
          <div class="divider-with-text" style="margin: 20px 0;">
            <span>or use API key</span>
          </div>
          <div class="apikey-input-group">
            <input type="text" id="manualApiKey" placeholder="ekk_xxxxxxxx_xxxxx..." class="apikey-input" />
            <button class="btn btn-secondary" data-cmd="submitApiKey">Connect</button>
          </div>
          <p class="hint apikey-hint" style="font-size: 10px; margin-top: 8px;">
            Get your API key from <a href="https://platform.ekkos.dev/dashboard/settings?tab=api-keys" target="_blank">platform settings</a>
          </p>
        </div>
      </div>
    `;

    return `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this._view?.webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${this._view?.webview.cspSource} https: data:;">
  <style nonce="${nonce}">
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

    /* ============ Golden Loop Phase Flow ============ */
    .current-phase {
      text-align: center;
      padding: 12px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: 8px;
      margin-bottom: 12px;
    }
    .phase-icon {
      font-size: 28px;
      display: inline-block;
      margin-right: 8px;
    }
    .phase-label {
      font-size: 14px;
      font-weight: 600;
      color: var(--vscode-foreground);
    }
    .phase-flow {
      display: flex;
      align-items: center;
      justify-content: space-around;
      padding: 12px 8px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: 8px;
      margin-bottom: 12px;
      font-size: 18px;
    }
    .phase-flow span {
      opacity: 0.3;
      transition: opacity 0.3s ease;
    }
    .phase-flow span.active {
      opacity: 1;
      filter: drop-shadow(0 0 8px currentColor);
    }
    .phase-flow .arrow {
      font-size: 14px;
      opacity: 0.5;
    }

    /* ============ Collective Memory Section ============ */
    .collective-section {
      margin-top: 12px;
    }
    .section-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .section-header-row h3 {
      margin: 0;
    }
    .scope-toggle-mini {
      display: flex;
      gap: 4px;
      background: var(--vscode-editor-background);
      padding: 2px;
      border-radius: 8px;
      border: 1px solid var(--vscode-widget-border);
    }
    .scope-btn {
      background: transparent;
      border: none;
      padding: 4px 8px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      opacity: 0.5;
      transition: all 0.2s ease;
    }
    .scope-btn:hover {
      opacity: 0.8;
      background: var(--vscode-button-secondaryBackground);
    }
    .scope-btn.active {
      opacity: 1;
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(6, 182, 212, 0.3));
      box-shadow: 0 0 8px rgba(139, 92, 246, 0.3);
    }
    .scope-toggle-section {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--vscode-widget-border);
    }
    .scope-label {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .collective-stats {
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(6, 182, 212, 0.1) 100%);
      border: 1px solid rgba(139, 92, 246, 0.3);
      border-radius: 12px;
      padding: 16px;
    }
    .collective-main {
      text-align: center;
      margin-bottom: 12px;
      padding-bottom: 12px;
      border-bottom: 1px solid var(--vscode-widget-border);
    }
    .collective-total {
      font-size: 32px;
      font-weight: bold;
      display: block;
      background: linear-gradient(135deg, #8b5cf6, #06b6d4);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .collective-label {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      display: block;
      margin-top: 4px;
    }
    .collective-details {
      display: flex;
      justify-content: space-around;
    }
    .collective-item {
      text-align: center;
    }
    .collective-icon {
      font-size: 16px;
      display: block;
      margin-bottom: 2px;
    }
    .collective-value {
      font-size: 18px;
      font-weight: 600;
      color: var(--vscode-foreground);
      display: block;
    }
    .collective-sublabel {
      font-size: 9px;
      color: var(--vscode-descriptionForeground);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

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
      background: linear-gradient(90deg, #22c55e, #16a34a);
      border-radius: 3px;
      position: relative;
      min-width: 4px;
      transition: width 0.5s ease;
      overflow: hidden;
    }
    .progress-bar-fill.crystallize {
      background: linear-gradient(90deg, #a855f7, #9333ea);
    }
    .progress-bar-fill.api {
      background: linear-gradient(90deg, #f59e0b, #f97316);
    }
    .progress-bar-fill.moderate {
      background: linear-gradient(90deg, #eab308, #ca8a04) !important;
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

    /* ============ Credentials Section ============ */
    .credentials-card {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: 10px;
      padding: 12px;
    }
    .credential-row {
      margin-bottom: 12px;
    }
    .credential-row:last-of-type {
      margin-bottom: 8px;
    }
    .credential-label {
      display: block;
      font-size: 10px;
      font-weight: 600;
      color: var(--vscode-descriptionForeground);
      margin-bottom: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .credential-value-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .credential-value {
      flex: 1;
      font-family: monospace;
      font-size: 11px;
      background: rgba(139, 92, 246, 0.1);
      padding: 8px 10px;
      border-radius: 6px;
      border: 1px solid rgba(139, 92, 246, 0.2);
      word-break: break-all;
    }
    .copy-btn, .reveal-btn {
      background: linear-gradient(135deg, #06b6d4, #8b5cf6);
      border: none;
      color: white;
      padding: 6px 10px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    .reveal-btn {
      background: rgba(139, 92, 246, 0.2);
      color: var(--vscode-foreground);
    }
    .copy-btn:hover, .reveal-btn:hover {
      transform: scale(1.05);
      box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
    }
    .reveal-btn:hover {
      background: rgba(139, 92, 246, 0.3);
    }
    .credentials-hint {
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      padding-top: 4px;
      border-top: 1px solid var(--vscode-widget-border);
    }

    /* ============ Scope Section ============ */
    .scope-card {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: 10px;
      padding: 8px;
    }
    .scope-options {
      display: flex;
      gap: 6px;
    }
    .scope-option {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 8px 4px;
      border-radius: 8px;
      border: 1px solid var(--vscode-widget-border);
      cursor: pointer;
      transition: all 0.2s;
      background: transparent;
    }
    .scope-option:hover {
      background: rgba(139, 92, 246, 0.1);
      border-color: rgba(139, 92, 246, 0.3);
    }
    .scope-option.selected {
      background: rgba(139, 92, 246, 0.15);
      border-color: #8b5cf6;
    }
    .scope-option input[type="radio"] {
      display: none;
    }
    .scope-icon {
      font-size: 16px;
      font-weight: bold;
      color: #8b5cf6;
      margin-bottom: 2px;
    }
    .scope-label {
      font-size: 11px;
      font-weight: 600;
    }
    .scope-desc {
      font-size: 9px;
      color: var(--vscode-descriptionForeground);
      text-align: center;
    }

    /* ============ Current IDE Section (Prominent) ============ */
    .current-ide-section {
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.08), rgba(6, 182, 212, 0.04));
      border: 1px solid rgba(139, 92, 246, 0.2);
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }
    .current-ide-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 16px;
    }
    .current-ide-header .header-icon {
      font-size: 16px;
    }
    .current-ide-header h3 {
      margin: 0;
      font-size: 13px;
      color: var(--vscode-descriptionForeground);
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
    }
    .current-ide-card {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: var(--vscode-editor-background);
      border-radius: 12px;
      border: 1px solid var(--vscode-widget-border);
      transition: all 0.3s ease;
    }
    .current-ide-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    }
    .current-ide-card.configured {
      border-color: rgba(34, 197, 94, 0.4);
      background: linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(34, 197, 94, 0.02));
    }
    .current-ide-card.needs-setup {
      border-color: rgba(234, 179, 8, 0.4);
      background: linear-gradient(135deg, rgba(234, 179, 8, 0.08), rgba(234, 179, 8, 0.02));
    }
    /* 3D Logo Wrapper */
    .current-ide-logo-wrapper {
      width: 56px;
      height: 56px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(145deg, rgba(255, 255, 255, 0.1), rgba(0, 0, 0, 0.05));
      border-radius: 14px;
      box-shadow:
        0 4px 8px rgba(0, 0, 0, 0.2),
        0 8px 16px rgba(0, 0, 0, 0.1),
        inset 0 1px 1px rgba(255, 255, 255, 0.1);
      transform: perspective(500px) rotateY(-5deg) rotateX(5deg);
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    .current-ide-card:hover .current-ide-logo-wrapper {
      transform: perspective(500px) rotateY(0deg) rotateX(0deg) scale(1.08);
      box-shadow:
        0 8px 16px rgba(0, 0, 0, 0.25),
        0 16px 32px rgba(0, 0, 0, 0.15),
        inset 0 1px 2px rgba(255, 255, 255, 0.15);
    }
    .current-ide-logo {
      width: 36px;
      height: 36px;
      filter: drop-shadow(2px 2px 4px rgba(0, 0, 0, 0.3));
      transition: all 0.3s ease;
    }
    .current-ide-card:hover .current-ide-logo {
      filter: drop-shadow(4px 4px 8px rgba(0, 0, 0, 0.4));
    }
    .current-ide-info {
      flex: 1;
    }
    .current-ide-name {
      font-size: 18px;
      font-weight: 700;
      color: var(--vscode-foreground);
      letter-spacing: -0.3px;
    }
    .current-ide-status {
      font-size: 12px;
      margin-top: 6px;
      font-weight: 500;
    }
    .current-ide-status.ok { color: #22c55e; }
    .current-ide-status.warn { color: #eab308; }
    .setup-details {
      display: flex;
      gap: 10px;
      margin-top: 14px;
      justify-content: center;
    }
    .setup-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 10px;
      padding: 4px 12px;
      background: rgba(100, 100, 100, 0.15);
      color: var(--vscode-descriptionForeground);
      border-radius: 20px;
      font-weight: 500;
      transition: all 0.2s ease;
    }
    .setup-badge.active {
      background: rgba(34, 197, 94, 0.15);
      color: #22c55e;
    }
    .setup-badge .badge-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
      opacity: 0.6;
    }
    .setup-badge.active .badge-dot {
      opacity: 1;
      box-shadow: 0 0 6px currentColor;
    }

    /* ============ IDE Setup Grid ============ */
    .ide-setup-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      margin-bottom: 12px;
    }
    .ide-setup-card {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: 8px;
      padding: 12px;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: center;
    }
    .ide-setup-card:hover {
      border-color: rgba(139, 92, 246, 0.5);
      background: rgba(139, 92, 246, 0.05);
      transform: translateY(-1px);
    }
    .ide-setup-icon {
      font-size: 24px;
      margin-bottom: 6px;
    }
    .ide-setup-name {
      font-size: 12px;
      font-weight: 600;
      color: var(--vscode-foreground);
      margin-bottom: 6px;
    }
    .ide-setup-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      justify-content: center;
    }
    .ide-setup-badges .setup-badge {
      font-size: 8px;
      padding: 1px 5px;
    }

    /* ============ Other IDEs Section (Collapsed) ============ */
    .other-ides-section {
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: 10px;
      padding: 12px;
      margin-bottom: 12px;
    }
    .other-ides-section .section-header {
      margin-bottom: 0;
    }
    .other-ides-section .section-header h3 {
      font-size: 12px;
      margin: 0;
      color: var(--vscode-descriptionForeground);
    }
    .expand-icon {
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      transition: transform 0.2s;
    }
    .expand-icon.expanded {
      transform: rotate(90deg);
    }
    .other-ides-list {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--vscode-widget-border);
    }
    .other-ide-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px;
      border-radius: 6px;
      margin-bottom: 4px;
    }
    .other-ide-row:hover {
      background: rgba(139, 92, 246, 0.05);
    }
    .other-ide-icon { font-size: 18px; width: 24px; text-align: center; }
    .other-ide-name { flex: 1; font-size: 12px; font-weight: 500; }
    .other-ide-status {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 4px;
    }
    .other-ide-status.configured { color: #22c55e; background: rgba(34, 197, 94, 0.1); }
    .other-ide-status.not-configured { color: #eab308; background: rgba(234, 179, 8, 0.1); }
    .other-ide-status.not-installed { color: #6b7280; background: rgba(107, 114, 128, 0.1); }
    .other-ide-status.unknown { color: #6b7280; background: rgba(107, 114, 128, 0.1); }
    .btn-mini {
      font-size: 12px;
      padding: 4px 8px;
      border: none;
      background: rgba(139, 92, 246, 0.2);
      color: var(--vscode-foreground);
      border-radius: 4px;
      cursor: pointer;
    }
    .btn-mini:hover {
      background: rgba(139, 92, 246, 0.4);
    }
    .other-ides-hint {
      font-size: 10px;
      color: var(--vscode-descriptionForeground);
      text-align: center;
      margin-top: 8px;
      font-style: italic;
    }

    /* ============ Generic Button Styles ============ */
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
    /* Config Files Section */
    .config-files-desc {
      font-size: 11px;
      color: var(--vscode-descriptionForeground);
      margin: 0 0 12px 0;
    }
    .config-files-grid {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .config-ide-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      background: var(--vscode-editor-background);
      border: 1px solid var(--vscode-widget-border);
      border-radius: 6px;
    }
    .config-ide-header {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .config-ide-icon {
      font-size: 14px;
    }
    .config-ide-name {
      font-size: 12px;
      font-weight: 500;
      color: var(--vscode-foreground);
    }
    .config-ide-buttons {
      display: flex;
      gap: 4px;
    }
    .config-btn {
      padding: 3px 8px;
      font-size: 10px;
      font-weight: 500;
      border: 1px solid var(--vscode-button-border, var(--vscode-widget-border));
      border-radius: 4px;
      background: var(--vscode-button-secondaryBackground);
      color: var(--vscode-button-secondaryForeground);
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .config-btn:hover:not(:disabled) {
      background: var(--vscode-button-secondaryHoverBackground);
      border-color: var(--vscode-focusBorder);
    }
    .config-btn:disabled,
    .config-btn-disabled {
      opacity: 0.35;
      cursor: not-allowed;
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
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .version-badge {
      font-size: 10px;
      font-weight: 600;
      background: rgba(139, 92, 246, 0.2);
      color: #8b5cf6;
      -webkit-text-fill-color: #8b5cf6;
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid rgba(139, 92, 246, 0.3);
      letter-spacing: 0.5px;
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
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
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
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .version-badge-welcome {
      font-size: 11px;
      font-weight: 600;
      background: rgba(139, 92, 246, 0.15);
      color: #a78bfa;
      -webkit-text-fill-color: #a78bfa;
      padding: 3px 8px;
      border-radius: 6px;
      border: 1px solid rgba(139, 92, 246, 0.3);
      letter-spacing: 0.5px;
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
  <script nonce="${nonce}">
    console.log('[ekkOS webview] boot');
    const vscode = acquireVsCodeApi();
    console.log('[ekkOS webview] acquired vscode api');

    // Global event delegation for data-cmd buttons (CSP-safe)
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-cmd]');
      if (!el) return;
      const command = el.getAttribute('data-cmd');
      const ide = el.getAttribute('data-ide');
      const filetype = el.getAttribute('data-filetype');
      const ideName = el.getAttribute('data-idename');
      const scope = el.getAttribute('data-scope');
      const field = el.getAttribute('data-field');

      // Handle local UI actions
      if (command === 'toggleOtherIdes') {
        const list = document.getElementById('other-ides-list');
        const toggle = document.getElementById('other-ides-toggle');
        if (list && toggle) {
          const isHidden = list.style.display === 'none';
          list.style.display = isHidden ? 'block' : 'none';
          toggle.classList.toggle('expanded', isHidden);
        }
        return;
      }

      if (command === 'setScope' && scope) {
        // Update UI immediately
        document.querySelectorAll('.scope-option').forEach(opt => {
          opt.classList.remove('selected');
          if (opt.querySelector('input[value="' + scope + '"]')) {
            opt.classList.add('selected');
          }
        });
      }

      if (command === 'submitApiKey') {
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
        return;
      }

      // Build message with optional params
      const msg = { command };
      if (ide) msg.ide = ide;
      if (filetype) msg.fileType = filetype;
      if (ideName) msg.ideName = ideName;
      if (scope) msg.scope = scope;
      if (field) msg.field = field;

      console.log('[ekkOS webview] posting message:', msg);
      vscode.postMessage(msg);
    });

    // Handle change events for radio/checkbox inputs (CSP-safe)
    document.addEventListener('change', (e) => {
      const el = e.target.closest('[data-cmd]');
      if (!el) return;
      const command = el.getAttribute('data-cmd');
      const scope = el.getAttribute('data-scope');

      if (command === 'setScope' && scope) {
        // Update UI immediately
        document.querySelectorAll('.scope-option').forEach(opt => {
          opt.classList.remove('selected');
          if (opt.querySelector('input[value="' + scope + '"]')) {
            opt.classList.add('selected');
          }
        });
        vscode.postMessage({ command: 'setScope', scope });
      }
    });

    function connect() { vscode.postMessage({ command: 'connect' }); }
    function connectWithIde(ideId) { vscode.postMessage({ command: 'connectWithIde', ideId }); }
    function disconnect() { vscode.postMessage({ command: 'disconnect' }); }
    function openPlatform() { vscode.postMessage({ command: 'openPlatform' }); }
    function deployMcp() { vscode.postMessage({ command: 'deployMcp' }); }
    function deployToIde(ideName) { vscode.postMessage({ command: 'deployToIde', ideName }); }
    function fullSetupIde(ideName) { vscode.postMessage({ command: 'fullSetupIde', ideName }); }
    function toggleOtherIdes() {
      const list = document.getElementById('other-ides-list');
      const toggle = document.getElementById('other-ides-toggle');
      if (list && toggle) {
        const isHidden = list.style.display === 'none';
        list.style.display = isHidden ? 'block' : 'none';
        toggle.classList.toggle('expanded', isHidden);
      }
    }
    function deployInstructions() { vscode.postMessage({ command: 'deployInstructions' }); }
    function openDashboard() { vscode.postMessage({ command: 'openDashboard' }); }
    function openDocs() { vscode.postMessage({ command: 'openDocs' }); }
    function openExternal(url) { vscode.postMessage({ command: 'openExternal', url }); }
    function openConfigFile(ide, fileType) { vscode.postMessage({ command: 'openConfigFile', ide, fileType }); }
    function refresh() { vscode.postMessage({ command: 'refresh' }); }
    function setupGlobal() { vscode.postMessage({ command: 'setupGlobal' }); }
    function setupProject() { vscode.postMessage({ command: 'setupRules' }); }
    // Secure credential handling - credentials stay on extension host
    function copyCredential(field) {
      vscode.postMessage({ command: 'copyCredential', field: field });
    }

    function revealCredential(field) {
      vscode.postMessage({ command: 'revealCredential', field: field });
    }

    // Handle credential reveal response from extension
    window.addEventListener('message', event => {
      const message = event.data;
      if (message.command === 'credentialRevealed') {
        const valueEl = document.getElementById(message.field + 'Value');
        const iconEl = document.getElementById(message.field + 'RevealIcon');
        if (valueEl && iconEl) {
          if (message.revealed) {
            valueEl.textContent = message.value;
            iconEl.textContent = '🙈';
          } else {
            valueEl.textContent = message.masked;
            iconEl.textContent = '👁';
          }
        }
      }
    });

    function setScope(scope) {
      // Update UI immediately
      document.querySelectorAll('.scope-option').forEach(opt => {
        opt.classList.remove('selected');
        if (opt.querySelector('input[value="' + scope + '"]')) {
          opt.classList.add('selected');
        }
      });
      // Send to extension
      vscode.postMessage({ command: 'setScope', scope: scope });
    }

    function setScopeAndRefresh(scope, el) {
      // Update toggle buttons immediately
      document.querySelectorAll('.scope-btn').forEach(btn => btn.classList.remove('active'));
      if (el) el.classList.add('active');
      // Send to extension and request refresh
      vscode.postMessage({ command: 'setScopeAndRefresh', scope: scope });
    }

    // Legacy alias for backwards compatibility
    function copyApiKey(key) { copyToClipboard(key, 'API Key'); }
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
  const currentIDE = detectCurrentIDE();
  const extensionPath = context.extensionPath;

  // Define paths
  const cursorRulesDir = path.join(workspaceRoot, '.cursor', 'rules');
  const cursorHooksDir = path.join(workspaceRoot, '.cursor', 'hooks');
  const claudeHooksDir = path.join(workspaceRoot, '.claude', 'hooks');
  const claudeHooksLibDir = path.join(claudeHooksDir, 'lib');
  const windsurfRulesDir = path.join(workspaceRoot, '.windsurf', 'rules');

  // Track what was installed for the success message
  const installed: string[] = [];

  try {
    // ========== CURSOR (deploy only if Cursor or VS Code) ==========
    if (currentIDE === 'cursor' || currentIDE === 'vscode') {
      if (!fs.existsSync(cursorRulesDir)) {
        fs.mkdirSync(cursorRulesDir, { recursive: true });
      }
      if (!fs.existsSync(cursorHooksDir)) {
        fs.mkdirSync(cursorHooksDir, { recursive: true });
      }

      // Cursor rules (new .md format)
      const cursorRuleSource = path.join(extensionPath, 'templates', 'cursor-rules', 'ekkos-memory.md');
      const cursorRuleDest = path.join(cursorRulesDir, 'ekkos-memory.md');
      if (fs.existsSync(cursorRuleSource)) {
        fs.copyFileSync(cursorRuleSource, cursorRuleDest);
        console.log(`✓ Created Cursor rule: ekkos-memory.md`);
      }

      // Legacy .mdc rules for backwards compatibility
      const legacyRuleTemplates = ['00-hooks-contract.mdc', '30-ekkos-core.mdc', '31-ekkos-messages.mdc'];
      for (const template of legacyRuleTemplates) {
        const source = path.join(extensionPath, 'templates', 'rules', template);
        const dest = path.join(cursorRulesDir, template);
        if (fs.existsSync(source)) {
          fs.copyFileSync(source, dest);
        }
      }

      installed.push('Cursor rules (.cursor/rules/)');
    }

    // ========== WINDSURF (deploy only if Windsurf) ==========
    if (currentIDE === 'windsurf') {
      if (!fs.existsSync(windsurfRulesDir)) {
        fs.mkdirSync(windsurfRulesDir, { recursive: true });
      }

      const windsurfRuleSource = path.join(extensionPath, 'templates', 'windsurf-rules', 'ekkos-memory.md');
      const windsurfRuleDest = path.join(windsurfRulesDir, 'ekkos-memory.md');
      if (fs.existsSync(windsurfRuleSource)) {
        fs.copyFileSync(windsurfRuleSource, windsurfRuleDest);
        console.log(`✓ Created Windsurf rule: ekkos-memory.md`);
      }

      installed.push('Windsurf rules (.windsurf/rules/)');
    }

    // ========== PLATFORM DETECTION ==========
    const isWindows = process.platform === 'win32';

    // Check if bash is available on Windows
    let hasBash = !isWindows; // Unix systems always have bash
    if (isWindows) {
      try {
        const { execSync } = require('child_process');
        execSync('where bash', { stdio: 'ignore' });
        hasBash = true;
      } catch {
        hasBash = false;
      }
    }

    // Use Node.js hooks when bash isn't available (more portable)
    const useNodeHooks = isWindows && !hasBash;

    // ========== CURSOR HOOKS (only for Cursor/VS Code) ==========
    if (currentIDE === 'cursor' || currentIDE === 'vscode') {
      const cursorHookSource = path.join(extensionPath, 'templates', 'cursor-hooks', 'before-submit-prompt.sh');
      const cursorHookDest = path.join(cursorHooksDir, 'before-submit-prompt.sh');
      if (fs.existsSync(cursorHookSource)) {
        fs.copyFileSync(cursorHookSource, cursorHookDest);
        // chmod only works on Unix-like systems
        if (!isWindows) {
          fs.chmodSync(cursorHookDest, 0o755);
        }
        console.log(`✓ Created Cursor hook: before-submit-prompt.sh`);
      }

      // Create .cursor/hooks.json for Cursor 1.7+
      const cursorHooksJsonPath = path.join(workspaceRoot, '.cursor', 'hooks.json');
      if (!fs.existsSync(cursorHooksJsonPath)) {
        // On Windows without bash, use node.exe; with bash, use bash command
        const hookCommand = isWindows
          ? (hasBash ? "bash ./.cursor/hooks/before-submit-prompt.sh" : "node ./.cursor/hooks/before-submit-prompt.js")
          : "./.cursor/hooks/before-submit-prompt.sh";
        const cursorHooksConfig = {
          version: 1,
          hooks: {
            beforeSubmitPrompt: [
              { command: hookCommand }
            ]
          }
        };
        fs.writeFileSync(cursorHooksJsonPath, JSON.stringify(cursorHooksConfig, null, 2));
        console.log(`✓ Created Cursor hooks.json`);
      }

      installed.push('Cursor hooks (.cursor/hooks/)');
      if (isWindows && !hasBash) {
        installed.push('ℹ️ Windows: Using Node.js hooks (bash not detected)');
      }
    }

    // ========== CLAUDE CODE HOOKS (for Claude Code IDE or as standalone) ==========
    if (currentIDE === 'claude-code' || currentIDE === 'unknown') {
      if (!fs.existsSync(claudeHooksLibDir)) {
        fs.mkdirSync(claudeHooksLibDir, { recursive: true });
      }

      // Deploy shell hooks (always needed for macOS/Linux and Windows with bash)
      const claudeHookTemplates = ['user-prompt-submit.sh', 'stop.sh'];
      for (const template of claudeHookTemplates) {
        const source = path.join(extensionPath, 'templates', 'hooks', template);
        const dest = path.join(claudeHooksDir, template);
        if (fs.existsSync(source)) {
          fs.copyFileSync(source, dest);
          // chmod only works on Unix-like systems
          if (!isWindows) {
            fs.chmodSync(dest, 0o755);
          }
          console.log(`✓ Created Claude hook: ${template}`);
        }
      }

      // Copy Claude hook library (shell version)
      const libSource = path.join(extensionPath, 'templates', 'hooks', 'lib', 'state.sh');
      const libDest = path.join(claudeHooksLibDir, 'state.sh');
      if (fs.existsSync(libSource)) {
        fs.copyFileSync(libSource, libDest);
        if (!isWindows) {
          fs.chmodSync(libDest, 0o755);
        }
      }

      // Deploy Node.js hooks (for Windows without bash)
      if (useNodeHooks) {
        const nodeHookTemplates = ['user-prompt-submit.js', 'stop.js'];
        for (const template of nodeHookTemplates) {
          const source = path.join(extensionPath, 'templates', 'hooks-node', template);
          const dest = path.join(claudeHooksDir, template);
          if (fs.existsSync(source)) {
            fs.copyFileSync(source, dest);
            console.log(`✓ Created Claude Node.js hook: ${template}`);
          }
        }

        // Copy Node.js hook library
        const nodeLibSource = path.join(extensionPath, 'templates', 'hooks-node', 'lib', 'state.js');
        const nodeLibDest = path.join(claudeHooksLibDir, 'state.js');
        if (fs.existsSync(nodeLibSource)) {
          fs.copyFileSync(nodeLibSource, nodeLibDest);
        }
      }

      // Create .claude/settings.json
      const claudeSettingsPath = path.join(workspaceRoot, '.claude', 'settings.json');
      if (!fs.existsSync(claudeSettingsPath)) {
        let hookCommands: { sessionStart: string; submit: string; stop: string };

        if (useNodeHooks) {
          // Windows without bash: use Node.js hooks
          hookCommands = {
            sessionStart: 'node ' + path.join(workspaceRoot, '.claude', 'hooks', 'session-start.js'),
            submit: 'node ' + path.join(workspaceRoot, '.claude', 'hooks', 'user-prompt-submit.js'),
            stop: 'node ' + path.join(workspaceRoot, '.claude', 'hooks', 'stop.js')
          };
        } else if (isWindows && hasBash) {
          // Windows with bash: prefix with bash
          hookCommands = {
            sessionStart: 'bash ' + path.join(workspaceRoot, '.claude', 'hooks', 'session-start.sh'),
            submit: 'bash ' + path.join(workspaceRoot, '.claude', 'hooks', 'user-prompt-submit.sh'),
            stop: 'bash ' + path.join(workspaceRoot, '.claude', 'hooks', 'stop.sh')
          };
        } else {
          // macOS/Linux: use shell hooks directly
          hookCommands = {
            sessionStart: path.join(workspaceRoot, '.claude', 'hooks', 'session-start.sh'),
            submit: path.join(workspaceRoot, '.claude', 'hooks', 'user-prompt-submit.sh'),
            stop: path.join(workspaceRoot, '.claude', 'hooks', 'stop.sh')
          };
        }

        const claudeSettings = {
          hooks: {
            "session-start": [{ matcher: "", hooks: [hookCommands.sessionStart] }],
            "user-prompt-submit": [{ matcher: "", hooks: [hookCommands.submit] }],
            "stop": [{ matcher: "", hooks: [hookCommands.stop] }]
          }
        };
        fs.writeFileSync(claudeSettingsPath, JSON.stringify(claudeSettings, null, 2));
      }

      installed.push('Claude Code hooks (.claude/hooks/)');
      if (useNodeHooks) {
        installed.push('ℹ️ Windows: Using Node.js hooks (native, no bash needed)');
      } else if (isWindows && hasBash) {
        installed.push('ℹ️ Windows: Using bash hooks via Git Bash');
      }
    }

    // ========== CLAUDE.md (always deploy - works in all IDEs) ==========
    const claudeMdSource = path.join(extensionPath, 'templates', 'CLAUDE.md');
    const claudeMdDest = path.join(workspaceRoot, 'CLAUDE.md');
    if (fs.existsSync(claudeMdSource) && !fs.existsSync(claudeMdDest)) {
      fs.copyFileSync(claudeMdSource, claudeMdDest);
      console.log(`✓ Created CLAUDE.md (project instructions)`);
      installed.push('CLAUDE.md (project instructions)');
    }

    // ========== SUCCESS MESSAGE ==========
    const ideNames: Record<string, string> = {
      'cursor': 'Cursor',
      'vscode': 'VS Code',
      'windsurf': 'Windsurf',
      'claude-code': 'Claude Code',
      'unknown': 'your IDE'
    };
    const ideName = ideNames[currentIDE] || 'your IDE';

    const buttons = [];
    if (currentIDE === 'cursor' || currentIDE === 'vscode') {
      buttons.push('View Rules');
    } else if (currentIDE === 'windsurf') {
      buttons.push('View Rules');
    } else if (currentIDE === 'claude-code' || currentIDE === 'unknown') {
      buttons.push('View Hooks');
    }
    buttons.push('Dismiss');

    const selection = await vscode.window.showInformationMessage(
      `✅ ekkOS™ installed for ${ideName}!\n\n` +
      `Installed:\n• ${installed.join('\n• ')}\n\n` +
      'Golden Loop is now AUTOMATIC!',
      ...buttons
    );

    if (selection === 'View Rules') {
      if (currentIDE === 'windsurf') {
        const uri = vscode.Uri.file(path.join(windsurfRulesDir, 'ekkos-memory.md'));
        await vscode.commands.executeCommand('vscode.open', uri);
      } else {
        const uri = vscode.Uri.file(path.join(cursorRulesDir, 'ekkos-memory.md'));
        await vscode.commands.executeCommand('vscode.open', uri);
      }
    } else if (selection === 'View Hooks') {
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

    // Copy Claude Code hooks (chmod only on Unix-like systems)
    const isWindows = process.platform === 'win32';
    const claudeHookTemplates = ['user-prompt-submit.sh', 'session-start.sh', 'stop.sh'];
    for (const template of claudeHookTemplates) {
      const source = path.join(extensionPath, 'templates', 'hooks', template);
      const dest = path.join(globalClaudeHooksDir, template);

      if (fs.existsSync(source)) {
        fs.copyFileSync(source, dest);
        if (!isWindows) {
          fs.chmodSync(dest, 0o755);
        }
        console.log(`✓ Created global Claude hook: ${template}`);
      }
    }

    // Copy lib/state.sh
    const libSource = path.join(extensionPath, 'templates', 'hooks', 'lib', 'state.sh');
    const libDest = path.join(globalClaudeLibDir, 'state.sh');
    if (fs.existsSync(libSource)) {
      fs.copyFileSync(libSource, libDest);
      if (!isWindows) {
        fs.chmodSync(libDest, 0o755);
      }
      console.log(`✓ Created global Claude hook lib: state.sh`);
    }

    // Create/update global Claude settings
    let claudeSettings: any = {};
    if (fs.existsSync(globalClaudeSettingsPath)) {
      try {
        claudeSettings = JSON.parse(fs.readFileSync(globalClaudeSettingsPath, 'utf8'));
      } catch { /* Use empty */ }
    }

    // Use absolute paths - on Windows, prefix with bash for Git Bash/WSL
    const hookPrefix = isWindows ? 'bash ' : '';
    claudeSettings.hooks = {
      ...claudeSettings.hooks,
      "session-start": [{ matcher: "", hooks: [hookPrefix + path.join(homeDir, '.claude', 'hooks', 'session-start.sh')] }],
      "user-prompt-submit": [{ matcher: "", hooks: [hookPrefix + path.join(homeDir, '.claude', 'hooks', 'user-prompt-submit.sh')] }],
      "stop": [{ matcher: "", hooks: [hookPrefix + path.join(homeDir, '.claude', 'hooks', 'stop.sh')] }]
    };
    fs.writeFileSync(globalClaudeSettingsPath, JSON.stringify(claudeSettings, null, 2));
    console.log(`✓ Updated global Claude settings`);

    // Setup global .cursorrules for Cursor (at ~/.cursorrules)
    const globalCursorrules = path.join(homeDir, '.cursorrules');
    if (!fs.existsSync(globalCursorrules)) {
      const cursorRulesContent = getCursorRulesTemplate();
      fs.writeFileSync(globalCursorrules, cursorRulesContent);
      console.log(`✓ Created global .cursorrules`);
    } else {
      // Check if it already has ekkOS
      const existingContent = fs.readFileSync(globalCursorrules, 'utf8');
      if (!existingContent.includes('ekkOS')) {
        // Append ekkOS section
        const cursorRulesContent = getCursorRulesTemplate();
        fs.appendFileSync(globalCursorrules, '\n\n' + cursorRulesContent);
        console.log(`✓ Updated global .cursorrules with ekkOS`);
      }
    }

    // Show success message
    const windowsNote = isWindows ? '\n\n⚠️ Windows: Hooks require Git Bash or WSL to be installed.' : '';
    const selection = await vscode.window.showInformationMessage(
      '✅ ekkOS™ Global Hooks Installed!\n\n' +
      'Claude Code hooks + global .cursorrules are now active.\n' +
      'No per-project setup needed!' + windowsNote,
      'Open Claude Settings', 'Open .cursorrules', 'Dismiss'
    );

    if (selection === 'Open Claude Settings') {
      const uri = vscode.Uri.file(globalClaudeSettingsPath);
      await vscode.commands.executeCommand('vscode.open', uri);
    } else if (selection === 'Open .cursorrules') {
      const uri = vscode.Uri.file(globalCursorrules);
      await vscode.commands.executeCommand('vscode.open', uri);
    }

    return true;
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to setup global hooks: ${(error as Error).message}`);
    console.error('Global hooks setup error:', error);
    return false;
  }
}

/**
 * Deploy global hooks quietly (no UI messages) - for auto-deployment on login
 * This enables "set it and forget it" context continuity without user intervention
 */
async function deployGlobalHooksQuietly(): Promise<void> {
  const homeDir = os.homedir();
  const isWindows = process.platform === 'win32';

  // Check if hooks are already installed
  const globalClaudeHooksDir = path.join(homeDir, '.claude', 'hooks');
  const hookFile = path.join(globalClaudeHooksDir, 'user-prompt-submit.sh');

  // Only deploy if hooks don't exist or are older than templates
  if (fs.existsSync(hookFile)) {
    // Check if our hooks are already there (look for ekkOS marker)
    const content = fs.readFileSync(hookFile, 'utf8');
    if (content.includes('ekkOS') || content.includes('SEAMLESS CONTEXT CONTINUITY')) {
      log('[ekkOS Connect] Global hooks already installed, skipping auto-deploy');
      return;
    }
  }

  // Find extension path - use module resolution
  const extensionPath = path.dirname(path.dirname(__filename));
  const templatesDir = path.join(extensionPath, 'templates', 'hooks');

  // If templates don't exist, skip silently
  if (!fs.existsSync(templatesDir)) {
    log('[ekkOS Connect] Hook templates not found, skipping auto-deploy');
    return;
  }

  // Create hooks directory
  const globalClaudeLibDir = path.join(globalClaudeHooksDir, 'lib');
  if (!fs.existsSync(globalClaudeLibDir)) {
    fs.mkdirSync(globalClaudeLibDir, { recursive: true });
  }

  // Copy hooks
  const hookTemplates = ['user-prompt-submit.sh', 'session-start.sh', 'stop.sh'];
  for (const template of hookTemplates) {
    const source = path.join(templatesDir, template);
    const dest = path.join(globalClaudeHooksDir, template);
    if (fs.existsSync(source)) {
      fs.copyFileSync(source, dest);
      if (!isWindows) {
        fs.chmodSync(dest, 0o755);
      }
    }
  }

  // Copy lib/state.sh if exists
  const libSource = path.join(templatesDir, 'lib', 'state.sh');
  const libDest = path.join(globalClaudeLibDir, 'state.sh');
  if (fs.existsSync(libSource)) {
    fs.copyFileSync(libSource, libDest);
    if (!isWindows) {
      fs.chmodSync(libDest, 0o755);
    }
  }

  // Update Claude settings.json to register hooks
  const globalClaudeSettingsPath = path.join(homeDir, '.claude', 'settings.json');
  let claudeSettings: any = {};
  if (fs.existsSync(globalClaudeSettingsPath)) {
    try {
      claudeSettings = JSON.parse(fs.readFileSync(globalClaudeSettingsPath, 'utf8'));
    } catch { /* Use empty */ }
  }

  const hookPrefix = isWindows ? 'bash ' : '';
  claudeSettings.hooks = {
    ...claudeSettings.hooks,
    "session-start": [{ matcher: "", hooks: [hookPrefix + path.join(homeDir, '.claude', 'hooks', 'session-start.sh')] }],
    "user-prompt-submit": [{ matcher: "", hooks: [hookPrefix + path.join(homeDir, '.claude', 'hooks', 'user-prompt-submit.sh')] }],
    "stop": [{ matcher: "", hooks: [hookPrefix + path.join(homeDir, '.claude', 'hooks', 'stop.sh')] }]
  };
  fs.writeFileSync(globalClaudeSettingsPath, JSON.stringify(claudeSettings, null, 2));

  log('[ekkOS Connect] Global hooks auto-deployed for seamless context continuity');
}

/**
 * Register ekkOS Chat Participant for automatic pattern injection
 * This intercepts chat requests and injects relevant patterns before the AI responds
 */
function registerChatParticipant(context: vscode.ExtensionContext) {
  // Check if chat API is available (VS Code 1.90+)
  if (!vscode.chat || !(vscode.chat as any).createChatParticipant) {
    console.log('[ekkOS] Chat Participant API not available in this version');
    console.log('[ekkOS] Falling back to MCP tools only');
    vscode.window.showInformationMessage(
      'ekkOS Connect: Chat participant (@ekkos) requires newer Cursor version. Using MCP tools instead.',
      'Learn More'
    ).then(selection => {
      if (selection === 'Learn More') {
        vscode.env.openExternal(vscode.Uri.parse('https://docs.ekkos.dev/integrations/cursor'));
      }
    });
    return;
  }

  const participant = (vscode.chat as any).createChatParticipant('ekkos-connect.memory', async (
    request: any,
    context: any,
    stream: any,
    token: vscode.CancellationToken
  ) => {
    try {
      // Get user's prompt
      const userPrompt = request.prompt;

      // Show progress
      stream.progress('🧠 Retrieving patterns from ekkOS memory...');

      // Retrieve patterns from ekkOS API
      const config = loadConfig();
      if (!config || !config.apiKey) {
        stream.markdown('⚠️ ekkOS not connected. Click the ekkOS icon in the sidebar to connect your account.');
        return {};
      }

      // Call /api/v1/context/retrieve
      const response = await fetch(`${getMcpApiUrl()}/api/v1/context/retrieve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: userPrompt,
          user_id: config.userId,
          session_id: 'vscode-chat',
          max_per_layer: 5,
          include_layers: ['working', 'episodic', 'semantic', 'patterns', 'procedural', 'collective', 'codebase', 'directives']
        })
      });

      if (!response.ok) {
        stream.markdown(`⚠️ Failed to retrieve patterns (${response.status})`);
      } else {
        const data = await response.json() as { layers?: { patterns?: unknown[] }; formatted_context?: string };
        const patternCount = data.layers?.patterns?.length || 0;

        if (patternCount > 0) {
          // Build messages array with patterns prepended
          const patternContext = data.formatted_context || '';
          
          // Show patterns to user
          stream.markdown(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
          stream.markdown(`🧠 **ekkOS Memory**\n`);
          stream.markdown(`✓ ${patternCount} patterns loaded\n`);
          stream.markdown(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`);
          stream.markdown(patternContext + '\n\n');
          stream.markdown(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`);

          // Build enhanced messages for language model
          const messages = [
            (vscode as any).LanguageModelChatMessage.User(`CONTEXT FROM ekkOS MEMORY:\n\n${patternContext}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\nUSER QUESTION:\n${userPrompt}`)
          ];

          // Add conversation history
          for (const historyItem of context.history) {
            if (historyItem.participant === 'ekkos-connect.memory') {
              // Only include our own history
              if ((historyItem as any).prompt) {
                messages.push((vscode as any).LanguageModelChatMessage.User((historyItem as any).prompt));
              }
            }
          }

          // Call language model with enhanced context
          stream.progress('Generating response with ekkOS patterns...');
          
          const chatResponse = await request.model.sendRequest(messages, {}, token);

          // Stream response
          for await (const fragment of chatResponse.text) {
            stream.markdown(fragment);
          }

        } else {
          // No patterns found, just forward to model
          stream.markdown('🔍 No patterns found. Responding without memory context.\n\n');
          
          const messages = [(vscode as any).LanguageModelChatMessage.User(userPrompt)];
          const chatResponse = await request.model.sendRequest(messages, {}, token);
          
          for await (const fragment of chatResponse.text) {
            stream.markdown(fragment);
          }
        }
      }

      return {};
    } catch (error) {
      stream.markdown(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return {};
    }
  });

  // Set participant icon
  const iconPath = vscode.Uri.joinPath(context.extensionUri, 'resources', 'ekkos-icon.svg');
  participant.iconPath = iconPath;

  context.subscriptions.push(participant);
  console.log('[ekkOS] Chat participant registered: @ekkos');
}

// ============ Session Context View Provider ============

class SessionContextViewProvider implements vscode.WebviewViewProvider {
  private _panel: SessionContextPanel | undefined;

  constructor(
    private readonly _context: vscode.ExtensionContext
  ) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._context.extensionUri]
    };

    const config = currentConfig;
    if (!config) {
      webviewView.webview.html = this.getNotConnectedHtml();
      return;
    }

    const apiUrl = vscode.workspace.getConfiguration('ekkos').get<string>('apiUrl') || 'https://api.ekkos.dev';

    this._panel = new SessionContextPanel(
      webviewView,
      apiUrl,
      config.apiKey
    );
  }

  private getNotConnectedHtml(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background: var(--vscode-sideBar-background);
            padding: 24px;
            text-align: center;
          }
          .message {
            margin: 48px 0;
          }
          .emoji {
            font-size: 48px;
            margin-bottom: 16px;
          }
          h3 {
            margin: 0 0 8px 0;
          }
          p {
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="message">
          <div class="emoji">🔌</div>
          <h3>Not Connected</h3>
          <p>Connect your ekkOS account to view session context</p>
        </div>
      </body>
      </html>
    `;
  }

  public dispose() {
    this._panel?.dispose();
  }
}

export function deactivate() {
  statusBarItem?.dispose();
  stopActivityPolling();
  stopGoldenLoopFileWatcher();  // Stop Golden Loop file watcher
  stopContextMonitor();  // Stop Endless Context monitoring
  stopAutoClearFlagWatcher();  // Stop auto-clear flag watcher
}






