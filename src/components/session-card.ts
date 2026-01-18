/**
 * Session Card Component
 *
 * Renders individual session cards with context usage, progress bars,
 * and interactive elements.
 */

import { SessionContext } from '../session-context-panel';
import { renderProgressBar } from './progress-bar';

export interface SessionCardState {
  session: SessionContext;
  viewMode: 'compact' | 'expanded';
  isExpanded: boolean;
  isFocused?: boolean;
  turnsRemaining?: number | null;
  previousPercent?: number;
}

export function renderSessionCard(state: SessionCardState, index: number): string {
  const { session, viewMode, isFocused = false, turnsRemaining, previousPercent } = state;

  if (viewMode === 'compact') {
    return renderCompactCard(session, index, isFocused, turnsRemaining);
  }

  return renderExpandedCard(session, index, isFocused, turnsRemaining, previousPercent);
}

function renderCompactCard(session: SessionContext, index: number, isFocused: boolean = false, turnsRemaining?: number | null): string {
  const statusBadge = getStatusBadge(session, turnsRemaining);
  const progressBar = renderProgressBar(session.contextPercent, session.contextUsed, session.contextMax);
  const focusedClass = isFocused ? 'focused' : '';
  const statusClass = `status-${session.status}`;
  const displayName = session.sessionName || session.sessionId;

  return `
    <div
      class="session-card compact ${session.status} ${focusedClass} ${statusClass}"
      data-session-id="${session.sessionId}"
      tabindex="0"
      role="button"
      aria-label="Session ${displayName}, ${session.contextPercent}% context used${turnsRemaining !== null && turnsRemaining !== undefined ? `, ~${turnsRemaining} turns remaining` : ''}${isFocused ? ', currently focused' : ''}"
    >
      <div class="card-header-compact">
        <div class="session-info-inline">
          ${getClaudeLogo()}
          <span class="session-name">${displayName}</span>
          <button
            class="copy-button"
            data-copy-session="${session.sessionName || session.sessionId}"
            title="Copy /continue ${displayName}"
            aria-label="Copy continue command for ${displayName}"
          >
            <span class="icon">📋</span>
          </button>
          ${statusBadge}
        </div>
        <div class="session-stats-inline">
          <span class="token-count">${formatNumber(session.contextUsed)} / ${formatNumber(session.contextMax)}</span>
          <span class="percentage ${getPercentageClass(session.contextPercent)}">${session.contextPercent.toFixed(1)}%</span>
        </div>
      </div>
      ${progressBar}
    </div>
  `;
}

function renderExpandedCard(session: SessionContext, index: number, isFocused: boolean = false, turnsRemaining?: number | null, previousPercent?: number): string {
  const statusBadge = getStatusBadge(session, turnsRemaining);
  const progressBar = renderProgressBar(session.contextPercent, session.contextUsed, session.contextMax);
  const timeAgo = formatTimeAgo(session.lastActivityAt);
  const sessionStarted = formatTimeAgo(session.startedAt);
  const focusedClass = isFocused ? 'focused' : '';
  const statusClass = `status-${session.status}`;
  const displayName = session.sessionName || session.sessionId;

  // Detect if context increased since last refresh
  const contextIncreased = previousPercent !== undefined && session.contextPercent > previousPercent;
  const changeClass = contextIncreased ? 'context-increased' : '';

  return `
    <div
      class="session-card expanded ${session.status} ${focusedClass} ${statusClass} ${changeClass}"
      data-session-id="${session.sessionId}"
      tabindex="0"
      role="button"
      aria-label="Session ${displayName}, ${session.contextPercent}% context used, ${session.turnCount} turns, ${session.filesInPlay.length} files${turnsRemaining !== null && turnsRemaining !== undefined ? `, ~${turnsRemaining} turns remaining` : ''}${isFocused ? ', currently focused' : ''}"
    >
      <div class="card-header">
        <div class="session-info">
          ${getClaudeLogo()}
          <div class="session-details">
            <div class="session-name-row">
              <span class="session-name">${displayName}</span>
              <button
                class="copy-button"
                data-copy-session="${session.sessionName || session.sessionId}"
                title="Copy /continue ${displayName}"
                aria-label="Copy continue command for ${displayName}"
              >
                <span class="icon">📋</span>
              </button>
            </div>
            <span class="session-model">${session.model}</span>
          </div>
        </div>
        ${statusBadge}
      </div>

      ${progressBar}

      <div class="card-stats">
        <div class="stat-item">
          <span class="stat-value">${formatNumber(session.contextUsed)} / ${formatNumber(session.contextMax)}</span>
          <span class="stat-label">tokens (${session.contextPercent.toFixed(1)}%)</span>
        </div>
        ${turnsRemaining !== null && turnsRemaining !== undefined && turnsRemaining <= 20 ? `
          <div class="turns-prediction ${turnsRemaining <= 5 ? 'critical' : turnsRemaining <= 10 ? 'warning' : ''}">
            <span class="prediction-icon">⏱️</span>
            <span class="prediction-text">~${turnsRemaining} turns left</span>
          </div>
        ` : ''}
        ${session.compactionWarning ? `
          <div class="compaction-warning clickable" data-action="clear" title="Click to copy /clear command">
            <span class="warning-icon">⚠️</span>
            <span class="warning-text">CLEAR SOON</span>
          </div>
        ` : ''}
      </div>

      <div class="card-meta">
        <span class="meta-item" title="${session.turnCount} turns">
          Turn ${session.turnCount}
        </span>
        <span class="meta-separator">·</span>
        <span
          class="meta-item meta-files"
          title="${session.filesInPlay.join(', ')}"
          data-files-toggle="${index}"
        >
          ${session.filesInPlay.length} file${session.filesInPlay.length !== 1 ? 's' : ''}
        </span>
        <span class="meta-separator">·</span>
        <span class="meta-item" title="Last activity: ${new Date(session.lastActivityAt).toLocaleString()}">
          ${timeAgo}
        </span>
      </div>

      <div id="files-${index}" class="files-list collapsed">
        ${session.filesInPlay.length > 0 ? `
          <div class="files-header">Files in Play:</div>
          <ul class="files-items">
            ${session.filesInPlay.slice(0, 10).map(file => `
              <li class="file-item clickable" title="Click to open: ${file}" data-file-path="${escapeFilePath(file)}">
                <span class="file-icon">📄</span>
                <span class="file-name">${truncateFilePath(file, 40)}</span>
              </li>
            `).join('')}
            ${session.filesInPlay.length > 10 ? `
              <li class="file-item more">
                <span class="more-text">+${session.filesInPlay.length - 10} more</span>
              </li>
            ` : ''}
          </ul>
        ` : `
          <div class="files-empty">No files yet</div>
        `}
      </div>
    </div>
  `;
}

function getClaudeLogo(): string {
  return `
    <div class="claude-logo" aria-label="Claude">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="4" width="16" height="16" rx="3" fill="currentColor" opacity="0.1"/>
        <path d="M8 12L10.5 14.5L16 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" fill="none" opacity="0.3"/>
      </svg>
    </div>
  `;
}

function getStatusBadge(session: SessionContext, turnsRemaining?: number | null): string {
  if (session.status === 'idle') {
    return '<span class="status-badge idle">idle</span>';
  }

  // Show turns remaining in badge if critical
  if (turnsRemaining !== null && turnsRemaining !== undefined && turnsRemaining <= 10) {
    return `<span class="status-badge ${turnsRemaining <= 5 ? 'critical' : 'warning'}">${turnsRemaining}t left</span>`;
  }

  if (session.compactionWarning) {
    return `<span class="status-badge warning">${session.contextPercent.toFixed(0)}%</span>`;
  }

  return '';
}

function getPercentageClass(percent: number): string {
  if (percent >= 95) return 'critical';
  if (percent >= 80) return 'warning';
  if (percent >= 60) return 'moderate';
  return 'healthy';
}

function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

function formatTimeAgo(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

function escapeFilePath(path: string): string {
  // Escape special characters for use in onclick handler
  return path
    .replace(/\\/g, '\\\\')  // Escape backslashes
    .replace(/'/g, "\\'");    // Escape single quotes
}

function truncateFilePath(path: string, maxLength: number): string {
  if (path.length <= maxLength) return path;

  const parts = path.split('/');
  if (parts.length <= 2) {
    return path.substring(0, maxLength - 3) + '...';
  }

  // Keep first and last part, truncate middle
  const first = parts[0];
  const last = parts[parts.length - 1];
  const available = maxLength - first.length - last.length - 6; // 6 for '/.../''

  if (available <= 0) {
    return `${first}/.../${last}`;
  }

  return `${first}/.../${last}`;
}
