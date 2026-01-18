/**
 * Session Context Panel for ekkOS Extension
 *
 * Displays real-time context window usage for active Claude Code sessions.
 * Replaces the old "Recent Activity" section with premium UX.
 */

import * as vscode from 'vscode';
import { renderSessionCard, SessionCardState } from './components/session-card';
import { getSessionContextStyles } from './components/styles';

export interface SessionContext {
  sessionId: string;
  sessionName: string;
  model: string;
  contextUsed: number;
  contextMax: number;
  contextPercent: number;
  turnCount: number;
  startedAt: string;
  lastActivityAt: string;
  filesInPlay: string[];
  status: 'active' | 'idle' | 'approaching_limit' | 'compacted';
  compactionWarning: boolean;
}

interface SessionContextResponse {
  sessions: SessionContext[];
  latency_ms: number;
}

// Cold storage session from time-machine API
interface HistorySession {
  session_id: string;
  session_name: string;
  total_turns: number;
  started_at: string;
  last_activity: string;
  preview: string;
}

interface HistorySessionsResponse {
  success: boolean;
  sessions: HistorySession[];
  total: number;
  pagination: {
    offset: number;
    limit: number;
    has_more: boolean;
  };
}

// Threshold constants for warnings
const THRESHOLD_WARNING = 80;
const THRESHOLD_CRITICAL = 95;

export class SessionContextPanel {
  private readonly _panel: vscode.WebviewView;
  private readonly _apiUrl: string;
  private readonly _apiKey: string;
  private _sessions: SessionContext[] = [];
  private _previousSessions: Map<string, SessionContext> = new Map();
  private _isLoading: boolean = false;
  private _error: string | null = null;
  private _updateInterval: ReturnType<typeof setInterval> | null = null;
  private _viewMode: 'compact' | 'expanded' = 'expanded';
  private _filterQuery: string = '';
  private _focusedSessionId: string | null = null;
  private _refreshRate: number = 10000; // Default 10 seconds
  private _thresholdsCrossed: Map<string, number> = new Map(); // Track last notified threshold
  private _activeTab: 'hot' | 'history' = 'hot';
  private _historySessions: HistorySession[] = [];
  private _historyLoading: boolean = false;
  private _historyError: string | null = null;
  private _historyOffset: number = 0;
  private _historyHasMore: boolean = false;
  private _historyTotal: number = 0;

  constructor(
    panel: vscode.WebviewView,
    apiUrl: string,
    apiKey: string
  ) {
    this._panel = panel;
    this._apiUrl = apiUrl;
    this._apiKey = apiKey;

    // Set up message handler
    this._panel.webview.onDidReceiveMessage(this.handleMessage.bind(this));

    // Initial load
    this.refresh();

    // Start adaptive refresh
    this.startAdaptiveRefresh();
  }

  private startAdaptiveRefresh(): void {
    if (this._updateInterval) {
      clearInterval(this._updateInterval);
    }
    this._updateInterval = setInterval(() => this.refresh(), this._refreshRate);
  }

  private updateRefreshRate(): void {
    // Adaptive refresh: faster when high usage sessions exist
    const hasHighUsage = this._sessions.some(s => s.contextPercent >= THRESHOLD_WARNING);
    const hasActiveSession = this._sessions.some(s => s.status === 'active');

    let newRate: number;
    if (hasHighUsage) {
      newRate = 3000; // 3 seconds when approaching limits
    } else if (hasActiveSession) {
      newRate = 5000; // 5 seconds when active
    } else {
      newRate = 15000; // 15 seconds when idle
    }

    if (newRate !== this._refreshRate) {
      this._refreshRate = newRate;
      this.startAdaptiveRefresh();
    }
  }

  public dispose(): void {
    if (this._updateInterval) {
      clearInterval(this._updateInterval);
      this._updateInterval = null;
    }
  }

  public async refresh(): Promise<void> {
    // Only show loading state if we have no data yet (initial load)
    // This prevents the flash/spinner on background refreshes
    const isInitialLoad = this._sessions.length === 0;

    this._isLoading = true;
    this._error = null;

    // Only re-render for initial load - keep existing content during refresh
    if (isInitialLoad) {
      this.render();
    }

    try {
      const response = await fetch(`${this._apiUrl}/api/v1/working/sessions/context`, {
        headers: {
          'Authorization': `Bearer ${this._apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as SessionContextResponse;
      const newSessions = data.sessions || [];

      // Check for threshold crossings and notify
      this.checkThresholdCrossings(newSessions);

      // Store previous values for change detection
      this._previousSessions.clear();
      for (const session of this._sessions) {
        this._previousSessions.set(session.sessionId, session);
      }

      this._sessions = newSessions;
      this._error = null;

      // Update adaptive refresh rate
      this.updateRefreshRate();
    } catch (error) {
      console.error('[SessionContext] Fetch error:', error);
      this._error = error instanceof Error ? error.message : 'Unknown error';
      this._sessions = [];
    } finally {
      this._isLoading = false;
      this.render();
    }
  }

  public async fetchHistory(loadMore: boolean = false): Promise<void> {
    if (!loadMore) {
      this._historyOffset = 0;
      this._historySessions = [];
    }

    this._historyLoading = true;
    this._historyError = null;
    this.render();

    try {
      const limit = 20;
      const response = await fetch(
        `${this._apiUrl}/api/v1/context/time-machine/sessions?limit=${limit}&offset=${this._historyOffset}`,
        {
          headers: {
            'Authorization': `Bearer ${this._apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as HistorySessionsResponse;

      if (loadMore) {
        this._historySessions = [...this._historySessions, ...(data.sessions || [])];
      } else {
        this._historySessions = data.sessions || [];
      }

      this._historyHasMore = data.pagination?.has_more || false;
      this._historyTotal = data.total || 0;
      this._historyOffset += data.sessions?.length || 0;
      this._historyError = null;
    } catch (error) {
      console.error('[SessionContext] History fetch error:', error);
      this._historyError = error instanceof Error ? error.message : 'Unknown error';
    } finally {
      this._historyLoading = false;
      this.render();
    }
  }

  public setActiveTab(tab: 'hot' | 'history'): void {
    this._activeTab = tab;
    if (tab === 'history' && this._historySessions.length === 0) {
      this.fetchHistory();
    } else {
      this.render();
    }
  }

  private checkThresholdCrossings(newSessions: SessionContext[]): void {
    for (const session of newSessions) {
      const lastThreshold = this._thresholdsCrossed.get(session.sessionId) || 0;
      const currentPercent = session.contextPercent;

      // Check if crossed critical threshold (95%)
      if (currentPercent >= THRESHOLD_CRITICAL && lastThreshold < THRESHOLD_CRITICAL) {
        this._thresholdsCrossed.set(session.sessionId, THRESHOLD_CRITICAL);
        vscode.window.showWarningMessage(
          `⚠️ ${session.sessionName}: ${currentPercent.toFixed(0)}% context used - compaction imminent!`,
          'View Session'
        ).then(action => {
          if (action === 'View Session') {
            this.focusSession(session.sessionId);
          }
        });
      }
      // Check if crossed warning threshold (80%)
      else if (currentPercent >= THRESHOLD_WARNING && lastThreshold < THRESHOLD_WARNING) {
        this._thresholdsCrossed.set(session.sessionId, THRESHOLD_WARNING);
        vscode.window.showInformationMessage(
          `📊 ${session.sessionName}: ${currentPercent.toFixed(0)}% context used - consider wrapping up soon`
        );
      }
      // Reset if dropped below thresholds (e.g., after compaction)
      else if (currentPercent < THRESHOLD_WARNING && lastThreshold > 0) {
        this._thresholdsCrossed.delete(session.sessionId);
      }
    }
  }

  /**
   * Calculate estimated turns remaining before compaction
   */
  private calculateTurnsRemaining(session: SessionContext): number | null {
    if (session.turnCount < 2) return null; // Need at least 2 turns for estimate

    const tokensPerTurn = session.contextUsed / session.turnCount;
    if (tokensPerTurn <= 0) return null;

    const remainingTokens = session.contextMax - session.contextUsed;
    const turnsRemaining = Math.floor(remainingTokens / tokensPerTurn);

    return Math.max(0, turnsRemaining);
  }

  public setViewMode(mode: 'compact' | 'expanded'): void {
    this._viewMode = mode;
    this.render();
  }

  public setFilterQuery(query: string): void {
    this._filterQuery = query.toLowerCase();
    this.render();
  }

  private getFilteredSessions(): SessionContext[] {
    let sessions = this._sessions;

    // Filter by search query
    if (this._filterQuery) {
      sessions = sessions.filter(session =>
        session.sessionName.toLowerCase().includes(this._filterQuery) ||
        session.sessionId.toLowerCase().includes(this._filterQuery)
      );
    }

    // Sort: active first, then by context usage (highest first)
    return this.sortSessions(sessions);
  }

  private sortSessions(sessions: SessionContext[]): SessionContext[] {
    return [...sessions].sort((a, b) => {
      // Focused session always first
      if (a.sessionId === this._focusedSessionId) return -1;
      if (b.sessionId === this._focusedSessionId) return 1;

      // Active sessions before idle
      const statusOrder = { active: 0, approaching_limit: 1, idle: 2, compacted: 3 };
      const aOrder = statusOrder[a.status] ?? 2;
      const bOrder = statusOrder[b.status] ?? 2;
      if (aOrder !== bOrder) return aOrder - bOrder;

      // Higher context usage first (closer to compaction = more attention needed)
      return b.contextPercent - a.contextPercent;
    });
  }

  public focusSession(sessionId: string): void {
    this._focusedSessionId = sessionId;
    this.render();
  }

  public clearFocus(): void {
    this._focusedSessionId = null;
    this.render();
  }

  private render(): void {
    const filteredSessions = this.getFilteredSessions();

    this._panel.webview.html = this.getHtmlContent(filteredSessions);
  }

  private getHtmlContent(sessions: SessionContext[]): string {
    const nonce = this.getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <title>Session Context</title>
  ${getSessionContextStyles()}
</head>
<body>
  <div class="session-context-panel">
    ${this.renderHeader()}
    ${this.renderContent(sessions)}
  </div>
  <script nonce="${nonce}">
    ${this.getScripts()}
  </script>
</body>
</html>`;
  }

  private renderHeader(): string {
    return `
      <div class="panel-header">
        <div class="panel-tabs">
          <button
            class="tab-button ${this._activeTab === 'hot' ? 'active' : ''}"
            data-tab="hot"
          >
            <span class="tab-icon">⚡</span>
            <span class="tab-label">Live</span>
            <span class="tab-count">${this._sessions.length}</span>
          </button>
          <button
            class="tab-button ${this._activeTab === 'history' ? 'active' : ''}"
            data-tab="history"
          >
            <span class="tab-icon">📚</span>
            <span class="tab-label">History</span>
            ${this._historyTotal > 0 ? `<span class="tab-count">${this._historyTotal}</span>` : ''}
          </button>
        </div>
        <div class="panel-controls">
          ${this._activeTab === 'hot' ? `
            <input
              type="text"
              class="search-input"
              placeholder="Filter sessions..."
              value="${this._filterQuery}"
              data-action="search"
            />
          ` : ''}
          <button
            class="control-button"
            data-action="refresh"
            title="Refresh"
            ${(this._activeTab === 'hot' ? this._isLoading : this._historyLoading) ? 'disabled' : ''}
          >
            <span class="icon ${(this._activeTab === 'hot' ? this._isLoading : this._historyLoading) ? 'spinning' : ''}">↻</span>
          </button>
          ${this._activeTab === 'hot' ? `
            <button
              class="control-button"
              data-action="toggle-view"
              title="Toggle View"
            >
              <span class="icon">${this._viewMode === 'compact' ? '▣' : '☰'}</span>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  private renderContent(sessions: SessionContext[]): string {
    // Route to appropriate tab content
    if (this._activeTab === 'history') {
      return this.renderHistoryContent();
    }

    // Hot sessions tab
    if (this._error) {
      return this.renderError();
    }

    if (this._isLoading && sessions.length === 0) {
      return this.renderLoading();
    }

    if (sessions.length === 0) {
      return this.renderEmpty();
    }

    return `
      <div class="session-list">
        ${sessions.map((session, index) => this.renderSession(session, index)).join('')}
      </div>
    `;
  }

  private renderHistoryContent(): string {
    if (this._historyError) {
      return `
        <div class="state-container">
          <div class="error-state">
            <div class="error-icon">⚠️</div>
            <h4>Cannot load history</h4>
            <p class="error-message">${this._historyError}</p>
            <button class="retry-button" onclick="handleRefresh()">Retry</button>
          </div>
        </div>
      `;
    }

    if (this._historyLoading && this._historySessions.length === 0) {
      return this.renderLoading();
    }

    if (this._historySessions.length === 0) {
      return `
        <div class="state-container">
          <div class="empty-state">
            <div class="empty-icon">📚</div>
            <h4>No session history</h4>
            <p class="empty-message">Your past sessions will appear here</p>
          </div>
        </div>
      `;
    }

    return `
      <div class="history-list">
        ${this._historySessions.map((session, index) => this.renderHistorySession(session, index)).join('')}
        ${this._historyHasMore ? `
          <button
            class="load-more-button ${this._historyLoading ? 'loading' : ''}"
            onclick="handleLoadMore()"
            ${this._historyLoading ? 'disabled' : ''}
          >
            ${this._historyLoading ? 'Loading...' : 'Load More'}
          </button>
        ` : ''}
      </div>
    `;
  }

  private renderHistorySession(session: HistorySession, index: number): string {
    const timeAgo = this.formatTimeAgo(session.last_activity);
    const startDate = new Date(session.started_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <div
        class="history-card"
        tabindex="0"
        role="button"
        data-history-session="${session.session_name}"
      >
        <div class="history-header">
          <span class="history-name">${session.session_name}</span>
          <button
            class="copy-button"
            data-copy-session="${session.session_name}"
            title="Copy /continue command"
          >
            <span class="icon">📋</span>
          </button>
        </div>
        <div class="history-preview">${this.escapeHtml(session.preview)}</div>
        <div class="history-meta">
          <span class="history-turns">${session.total_turns} turns</span>
          <span class="meta-separator">·</span>
          <span class="history-time" title="${startDate}">${timeAgo}</span>
        </div>
      </div>
    `;
  }

  private formatTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  private renderSession(session: SessionContext, index: number): string {
    const previousSession = this._previousSessions.get(session.sessionId);
    const turnsRemaining = this.calculateTurnsRemaining(session);

    const state: SessionCardState = {
      session,
      viewMode: this._viewMode,
      isExpanded: false,
      isFocused: session.sessionId === this._focusedSessionId,
      turnsRemaining,
      previousPercent: previousSession?.contextPercent
    };

    return renderSessionCard(state, index);
  }

  private renderLoading(): string {
    return `
      <div class="state-container">
        <div class="loading-skeleton">
          ${[1, 2, 3].map(() => `
            <div class="skeleton-card">
              <div class="skeleton-header"></div>
              <div class="skeleton-bar"></div>
              <div class="skeleton-text"></div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  private renderError(): string {
    return `
      <div class="state-container">
        <div class="error-state">
          <div class="error-icon">⚠️</div>
          <h4>Cannot reach ekkOS API</h4>
          <p class="error-message">${this._error}</p>
          <button class="retry-button" onclick="handleRefresh()">
            Retry
          </button>
        </div>
      </div>
    `;
  }

  private renderEmpty(): string {
    return `
      <div class="state-container">
        <div class="empty-state">
          <div class="empty-icon">💤</div>
          <h4>No active sessions</h4>
          <p class="empty-message">Start a Claude Code session to see context tracking here</p>
        </div>
      </div>
    `;
  }

  private getScripts(): string {
    return `
      const vscode = acquireVsCodeApi();
      console.log('[SessionContext Webview] Scripts loaded, vscode API acquired');

      function handleRefresh() {
        console.log('[SessionContext Webview] Refresh clicked');
        vscode.postMessage({ command: 'refresh' });
      }

      function handleToggleView() {
        console.log('[SessionContext Webview] Toggle view clicked');
        vscode.postMessage({ command: 'toggleView' });
      }

      function handleSearch(query) {
        console.log('[SessionContext Webview] Search:', query);
        vscode.postMessage({ command: 'search', query });
      }

      function handleSessionClick(sessionId) {
        console.log('[SessionContext Webview] Session clicked:', sessionId);
        vscode.postMessage({ command: 'selectSession', sessionId });
      }

      function handleCopySessionId(sessionId, event) {
        console.log('[SessionContext Webview] Copy button clicked for:', sessionId);
        event.stopPropagation();
        event.preventDefault();
        vscode.postMessage({ command: 'copySessionId', sessionId });
        console.log('[SessionContext Webview] Message posted to extension');
      }

      function handleToggleFiles(index, event) {
        event.stopPropagation();
        const filesList = document.getElementById('files-' + index);
        if (filesList) {
          filesList.classList.toggle('expanded');
        }
      }

      function handleOpenFile(filePath, event) {
        console.log('[SessionContext Webview] Open file clicked:', filePath);
        event.stopPropagation();
        event.preventDefault();
        vscode.postMessage({ command: 'openFile', filePath });
      }

      function handleClearClick(event) {
        console.log('[SessionContext Webview] Clear button clicked');
        event.stopPropagation();
        event.preventDefault();
        vscode.postMessage({ command: 'clearContext' });
      }

      function handleTabChange(tab) {
        console.log('[SessionContext Webview] Tab changed:', tab);
        vscode.postMessage({ command: 'tabChange', tab });
      }

      function handleLoadMore() {
        console.log('[SessionContext Webview] Load more clicked');
        vscode.postMessage({ command: 'loadMore' });
      }

      function handleHistorySessionClick(sessionId) {
        console.log('[SessionContext Webview] History session clicked:', sessionId);
        vscode.postMessage({ command: 'historySessionClick', sessionId });
      }

      // Event delegation for all clickable elements (CSP-safe)
      document.addEventListener('click', (e) => {
        const target = e.target;

        // Tab buttons
        const tabButton = target.closest('[data-tab]');
        if (tabButton) {
          handleTabChange(tabButton.dataset.tab);
          return;
        }

        // History cards
        const historyCard = target.closest('[data-history-session]');
        if (historyCard && !target.closest('.copy-button')) {
          handleHistorySessionClick(historyCard.dataset.historySession);
          return;
        }

        // Load more button
        if (target.closest('.load-more-button')) {
          handleLoadMore();
          return;
        }

        // Refresh button
        if (target.closest('[data-action="refresh"]')) {
          handleRefresh();
          return;
        }

        // Toggle view button
        if (target.closest('[data-action="toggle-view"]')) {
          handleToggleView();
          return;
        }

        // Copy button
        const copyBtn = target.closest('[data-copy-session]');
        if (copyBtn) {
          e.stopPropagation();
          handleCopySessionId(copyBtn.dataset.copySession, e);
          return;
        }

        // Session card click
        const sessionCard = target.closest('[data-session-id]');
        if (sessionCard && !target.closest('.copy-button')) {
          handleSessionClick(sessionCard.dataset.sessionId);
          return;
        }

        // Files toggle
        const filesToggle = target.closest('[data-files-toggle]');
        if (filesToggle) {
          handleToggleFiles(filesToggle.dataset.filesToggle, e);
          return;
        }

        // Open file
        const fileItem = target.closest('[data-file-path]');
        if (fileItem) {
          handleOpenFile(fileItem.dataset.filePath, e);
          return;
        }

        // Clear context button
        if (target.closest('[data-action="clear"]')) {
          handleClearClick(e);
          return;
        }
      });

      // Search input handler
      document.addEventListener('input', (e) => {
        const target = e.target;
        if (target.matches('[data-action="search"]')) {
          handleSearch(target.value);
        }
      });

      // Keyboard navigation
      document.addEventListener('keydown', (e) => {
        if (e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
          e.preventDefault();
          handleRefresh();
        }
      });
    `;
  }

  private async handleMessage(message: any): Promise<void> {
    console.log('[SessionContext] Received message:', message.command, message);

    try {
      switch (message.command) {
        case 'refresh':
          if (this._activeTab === 'history') {
            await this.fetchHistory();
          } else {
            await this.refresh();
          }
          break;

        case 'tabChange':
          this.setActiveTab(message.tab);
          break;

        case 'loadMore':
          await this.fetchHistory(true);
          break;

        case 'historySessionClick': {
          // Copy /continue command for the session
          const continueCmd = `/continue ${message.sessionId}`;
          await vscode.env.clipboard.writeText(continueCmd);
          await vscode.window.showInformationMessage(
            `✓ Copied: ${continueCmd}`,
            'OK'
          );
          break;
        }

        case 'toggleView':
          this.setViewMode(this._viewMode === 'compact' ? 'expanded' : 'compact');
          break;

        case 'search':
          this.setFilterQuery(message.query || '');
          break;

        case 'selectSession':
          this.focusSession(message.sessionId);
          vscode.window.showInformationMessage(`Focused on session: ${message.sessionId}`);
          break;

        case 'copySessionId': {
          const textToCopy = `/continue ${message.sessionId}`;
          console.log('[SessionContext] Copying to clipboard:', textToCopy);
          await vscode.env.clipboard.writeText(textToCopy);
          console.log('[SessionContext] Clipboard write complete');
          await vscode.window.showInformationMessage(
            `✓ Copied: ${textToCopy}`,
            'OK'
          );
          break;
        }

        case 'clearContext': {
          const clearCommand = '/clear';
          console.log('[SessionContext] Copying to clipboard:', clearCommand);
          await vscode.env.clipboard.writeText(clearCommand);
          console.log('[SessionContext] Clipboard write complete');
          await vscode.window.showInformationMessage(
            '✓ Copied /clear to clipboard. Paste in Claude Code to clear context.',
            'OK'
          );
          break;
        }

        case 'openFile': {
          const filePath = message.filePath;
          console.log('[SessionContext] Opening file:', filePath);

          try {
            // Try to open the file in the editor
            const uri = vscode.Uri.file(filePath);
            const doc = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(doc, { preview: false });
            console.log('[SessionContext] File opened successfully');
          } catch (fileError) {
            console.error('[SessionContext] Failed to open file:', fileError);
            // Show error but don't throw - file might not exist
            vscode.window.showWarningMessage(
              `Could not open file: ${filePath}. File may have been moved or deleted.`
            );
          }
          break;
        }
      }
    } catch (error) {
      console.error('[SessionContext] Error handling message:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Failed to copy: ${errorMessage}`);
    }
  }

  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}
