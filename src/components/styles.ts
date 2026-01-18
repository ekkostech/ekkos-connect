/**
 * Session Context Panel Styles
 *
 * Premium UX styles with animations, hover states, and accessibility features.
 */

export function getSessionContextStyles(): string {
  return `
<style>
  /* === BASE STYLES === */
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: var(--vscode-font-family);
    font-size: var(--vscode-font-size);
    color: var(--vscode-foreground);
    background: linear-gradient(180deg, #0a0a1a 0%, #050510 100%);
    padding: 0;
    margin: 0;
    min-height: 100vh;
    position: relative;
  }

  /* ekkOS watermark */
  body::after {
    content: 'ekkOS';
    position: fixed;
    bottom: 20px;
    left: 20px;
    font-size: 72px;
    font-weight: 800;
    color: rgba(30, 30, 60, 0.4);
    letter-spacing: -2px;
    pointer-events: none;
    z-index: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  .session-context-panel {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 16px;
    min-height: 100vh;
    position: relative;
    z-index: 1;
  }

  /* === PANEL HEADER === */
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--vscode-panel-border);
  }

  .panel-title {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.5px;
    color: var(--vscode-descriptionForeground);
    text-transform: uppercase;
  }

  /* === TAB NAVIGATION === */
  .panel-tabs {
    display: flex;
    gap: 4px;
  }

  .tab-button {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: transparent;
    color: var(--vscode-descriptionForeground);
    border: 1px solid transparent;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    transition: all 200ms ease;
  }

  .tab-button:hover {
    background: var(--vscode-list-hoverBackground);
    color: var(--vscode-foreground);
  }

  .tab-button.active {
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border-color: var(--vscode-button-background);
  }

  .tab-icon {
    font-size: 14px;
  }

  .tab-label {
    font-weight: 600;
  }

  .tab-count {
    font-size: 10px;
    padding: 1px 6px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 10px;
    font-weight: 700;
  }

  .tab-button.active .tab-count {
    background: rgba(0, 0, 0, 0.2);
  }

  .panel-controls {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .search-input {
    padding: 4px 8px;
    font-size: 12px;
    background: var(--vscode-input-background);
    color: var(--vscode-input-foreground);
    border: 1px solid var(--vscode-input-border);
    border-radius: 4px;
    outline: none;
    transition: border-color 200ms ease;
  }

  .search-input:focus {
    border-color: var(--vscode-focusBorder);
  }

  .control-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    background: transparent;
    color: var(--vscode-foreground);
    border: 1px solid var(--vscode-button-border, transparent);
    border-radius: 4px;
    cursor: pointer;
    transition: all 150ms ease;
  }

  .control-button:hover:not(:disabled) {
    background: var(--vscode-button-hoverBackground);
    transform: scale(1.05);
  }

  .control-button:active:not(:disabled) {
    transform: scale(0.95);
  }

  .control-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .control-button .icon {
    font-size: 16px;
    display: block;
  }

  .control-button .icon.spinning {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* === SESSION LIST === */
  .session-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  /* === SESSION CARD === */
  .session-card {
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    padding: 12px;
    cursor: pointer;
    transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
  }

  .session-card:hover {
    border-color: var(--vscode-focusBorder);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }

  .session-card:focus {
    outline: 2px solid var(--vscode-focusBorder);
    outline-offset: 2px;
  }

  .session-card.active {
    border-color: var(--vscode-focusBorder);
    /* No background change - green dot + badge already indicate active */
  }

  /* Focused session - minimal styling (no blue highlight) */
  .session-card.focused {
    /* No special styling for focused - user preference */
  }

  /* Idle session (dimmed) */
  .session-card.idle {
    opacity: 0.7;
    background: var(--vscode-sideBar-background);
  }

  .session-card.idle:hover {
    opacity: 0.9;
  }

  .session-card.idle .claude-logo {
    opacity: 0.5;
  }

  .session-card.idle .session-name {
    color: var(--vscode-descriptionForeground);
  }

  .session-card.idle .progress-bar-fill {
    opacity: 0.6;
  }

  /* Active session indicator */
  .session-card.status-active::after {
    content: '';
    position: absolute;
    top: 8px;
    right: 8px;
    width: 8px;
    height: 8px;
    background: #22c55e;
    border-radius: 50%;
    animation: active-pulse 2s ease-in-out infinite;
  }

  @keyframes active-pulse {
    0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
    50% { opacity: 0.8; box-shadow: 0 0 0 4px rgba(34, 197, 94, 0); }
  }

  /* Context increased animation - flash effect when tokens increase */
  .session-card.context-increased {
    animation: context-flash 800ms ease-out;
  }

  @keyframes context-flash {
    0% {
      box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5);
      border-color: rgba(59, 130, 246, 0.8);
    }
    50% {
      box-shadow: 0 0 12px 4px rgba(59, 130, 246, 0.3);
      border-color: rgba(59, 130, 246, 0.6);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
      border-color: var(--vscode-panel-border);
    }
  }

  /* === CARD HEADER === */
  .card-header,
  .card-header-compact {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .session-info,
  .session-info-inline {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
  }

  .claude-logo {
    width: 24px;
    height: 24px;
    color: var(--vscode-foreground);
    opacity: 0.8;
    flex-shrink: 0;
  }

  .session-details {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .session-name-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .session-name {
    font-size: 14px;
    font-weight: 600;
    font-family: 'Monaco', 'Courier New', monospace;
    color: var(--vscode-foreground);
  }

  .session-model {
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
  }

  .copy-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    background: transparent;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    opacity: 0.6;
    transition: all 150ms ease;
  }

  .copy-button:hover {
    opacity: 1;
    background: var(--vscode-button-hoverBackground);
    transform: scale(1.1);
  }

  .copy-button:active {
    transform: scale(0.9);
  }

  .copy-button .icon {
    font-size: 12px;
  }

  .status-badge {
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .status-badge.idle {
    background: var(--vscode-badge-background);
    color: var(--vscode-badge-foreground);
    opacity: 0.6;
  }

  .status-badge.warning {
    background: #f97316;
    color: white;
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }

  /* === PROGRESS BAR === */
  .progress-bar-container {
    width: 100%;
    height: 6px;
    background: var(--vscode-progressBar-background);
    border-radius: 3px;
    overflow: hidden;
    margin: 8px 0;
    position: relative;
  }

  .progress-bar-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 600ms cubic-bezier(0.4, 0, 0.2, 1),
                background-color 300ms ease;
    position: relative;
  }

  .progress-bar-fill.pulse {
    animation: pulse-glow 1.5s ease-in-out infinite;
  }

  @keyframes pulse-glow {
    0%, 100% {
      box-shadow: 0 0 4px currentColor;
    }
    50% {
      box-shadow: 0 0 12px currentColor;
    }
  }

  .progress-glow {
    position: absolute;
    top: 0;
    right: 0;
    width: 20px;
    height: 100%;
    background: linear-gradient(to right, transparent, rgba(255, 255, 255, 0.4));
    animation: shimmer 2s ease-in-out infinite;
  }

  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  /* === CARD STATS === */
  .card-stats {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--vscode-panel-border);
  }

  .session-stats-inline {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .stat-value {
    font-size: 13px;
    font-weight: 600;
    font-family: 'Monaco', 'Courier New', monospace;
    color: var(--vscode-foreground);
  }

  .stat-label {
    font-size: 10px;
    color: var(--vscode-descriptionForeground);
  }

  .token-count {
    font-size: 12px;
    font-family: 'Monaco', 'Courier New', monospace;
    color: var(--vscode-descriptionForeground);
  }

  .percentage {
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 11px;
    font-weight: 700;
    font-family: 'Monaco', 'Courier New', monospace;
  }

  .percentage.healthy {
    background: #22c55e;
    color: white;
  }

  .percentage.moderate {
    background: #eab308;
    color: black;
  }

  .percentage.warning {
    background: #f97316;
    color: white;
  }

  .percentage.critical {
    background: #ef4444;
    color: white;
    animation: pulse 1.5s ease-in-out infinite;
  }

  .compaction-warning {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid #ef4444;
    border-radius: 4px;
    animation: pulse-border 2s ease-in-out infinite;
  }

  .compaction-warning.clickable {
    cursor: pointer;
    transition: all 150ms ease;
  }

  .compaction-warning.clickable:hover {
    background: rgba(239, 68, 68, 0.2);
    transform: scale(1.05);
  }

  .compaction-warning.clickable:active {
    transform: scale(0.95);
  }

  @keyframes pulse-border {
    0%, 100% { border-color: #ef4444; }
    50% { border-color: #fca5a5; }
  }

  .warning-icon {
    font-size: 14px;
  }

  .warning-text {
    font-size: 10px;
    font-weight: 700;
    color: #ef4444;
    letter-spacing: 0.5px;
  }

  /* === CARD META === */
  .card-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
  }

  .meta-item {
    display: inline-block;
  }

  .meta-files {
    cursor: pointer;
    text-decoration: underline;
    text-decoration-style: dotted;
  }

  .meta-files:hover {
    color: var(--vscode-foreground);
  }

  .meta-separator {
    opacity: 0.5;
  }

  /* === FILES LIST === */
  .files-list {
    max-height: 0;
    overflow: hidden;
    transition: max-height 400ms cubic-bezier(0.4, 0, 0.2, 1);
    margin-top: 0;
  }

  .files-list.expanded {
    max-height: 300px;
    margin-top: 12px;
  }

  .files-header {
    font-size: 11px;
    font-weight: 600;
    color: var(--vscode-descriptionForeground);
    margin-bottom: 6px;
  }

  .files-items {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .file-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-family: 'Monaco', 'Courier New', monospace;
    color: var(--vscode-foreground);
    padding: 4px 6px;
    border-radius: 3px;
    background: var(--vscode-input-background);
  }

  .file-item.clickable {
    cursor: pointer;
    transition: all 150ms ease;
  }

  .file-item.clickable:hover {
    background: var(--vscode-list-hoverBackground);
    color: var(--vscode-textLink-foreground);
    transform: translateX(4px);
  }

  .file-item.clickable:active {
    transform: translateX(2px);
    opacity: 0.8;
  }

  .file-item.more {
    font-style: italic;
    opacity: 0.7;
  }

  .file-icon {
    font-size: 12px;
    flex-shrink: 0;
  }

  .file-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .files-empty {
    font-size: 11px;
    font-style: italic;
    color: var(--vscode-descriptionForeground);
    opacity: 0.6;
  }

  /* === COMPACT VIEW === */
  .session-card.compact {
    padding: 10px;
  }

  .session-card.compact .card-header-compact {
    margin-bottom: 6px;
  }

  /* === LOADING STATE === */
  .state-container {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 48px 16px;
  }

  .loading-skeleton {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .skeleton-card {
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    padding: 12px;
  }

  .skeleton-header,
  .skeleton-bar,
  .skeleton-text {
    background: linear-gradient(
      90deg,
      var(--vscode-input-background) 0%,
      var(--vscode-input-placeholderForeground) 50%,
      var(--vscode-input-background) 100%
    );
    background-size: 200% 100%;
    animation: shimmer-skeleton 1.5s ease-in-out infinite;
    border-radius: 4px;
  }

  .skeleton-header {
    height: 24px;
    width: 60%;
    margin-bottom: 8px;
  }

  .skeleton-bar {
    height: 6px;
    width: 100%;
    margin-bottom: 8px;
  }

  .skeleton-text {
    height: 14px;
    width: 80%;
  }

  @keyframes shimmer-skeleton {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* === ERROR STATE === */
  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    text-align: center;
    max-width: 300px;
  }

  .error-icon {
    font-size: 48px;
    opacity: 0.6;
  }

  .error-state h4 {
    font-size: 14px;
    font-weight: 600;
    color: var(--vscode-errorForeground);
  }

  .error-message {
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    font-family: 'Monaco', 'Courier New', monospace;
  }

  .retry-button {
    padding: 6px 16px;
    background: var(--vscode-button-background);
    color: var(--vscode-button-foreground);
    border: none;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 150ms ease;
  }

  .retry-button:hover {
    background: var(--vscode-button-hoverBackground);
    transform: translateY(-1px);
  }

  .retry-button:active {
    transform: translateY(0);
  }

  /* === EMPTY STATE === */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    text-align: center;
    max-width: 300px;
  }

  .empty-icon {
    font-size: 48px;
    opacity: 0.5;
  }

  .empty-state h4 {
    font-size: 14px;
    font-weight: 600;
    color: var(--vscode-foreground);
  }

  .empty-message {
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
  }

  /* === HISTORY LIST === */
  .history-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .history-card {
    background: var(--vscode-editor-background);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    padding: 12px;
    cursor: pointer;
    transition: all 200ms ease;
  }

  .history-card:hover {
    border-color: var(--vscode-focusBorder);
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  }

  .history-card:focus {
    outline: 2px solid var(--vscode-focusBorder);
    outline-offset: 2px;
  }

  .history-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .history-name {
    font-size: 13px;
    font-weight: 600;
    font-family: 'Monaco', 'Courier New', monospace;
    color: var(--vscode-foreground);
  }

  .history-preview {
    font-size: 12px;
    color: var(--vscode-descriptionForeground);
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    margin-bottom: 8px;
  }

  .history-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    color: var(--vscode-descriptionForeground);
  }

  .history-turns {
    font-weight: 600;
    color: var(--vscode-foreground);
  }

  .history-time {
    opacity: 0.8;
  }

  .load-more-button {
    width: 100%;
    padding: 10px 16px;
    background: var(--vscode-button-secondaryBackground);
    color: var(--vscode-button-secondaryForeground);
    border: 1px solid var(--vscode-panel-border);
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 150ms ease;
    margin-top: 8px;
  }

  .load-more-button:hover:not(:disabled) {
    background: var(--vscode-button-secondaryHoverBackground);
    transform: translateY(-1px);
  }

  .load-more-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .load-more-button.loading {
    opacity: 0.7;
  }

  /* === ACCESSIBILITY === */
  @media (prefers-reduced-motion: reduce) {
    * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }

  @media (prefers-contrast: high) {
    .session-card {
      border-width: 2px;
    }

    .progress-bar-container {
      border: 1px solid var(--vscode-foreground);
    }
  }

  /* === KEYBOARD NAVIGATION === */
  .session-card:focus-visible {
    outline: 2px solid var(--vscode-focusBorder);
    outline-offset: 2px;
  }
</style>
  `;
}
