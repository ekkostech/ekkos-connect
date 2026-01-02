/**
 * Enhanced Activity Feed Component for ekkOS Extension
 * 
 * Displays recent activity with clickable items that open modals
 * with detailed pattern information.
 */

export interface ActivityItem {
  type: 'retrieve' | 'apply' | 'forge';
  id: string;
  message: string;
  timestamp: string;
  icon: string;
  success?: boolean;
  query?: string;
  patternCount?: number;
  retrievedPatternIds?: string[];
  patternTitle?: string;
}

export function renderActivityFeed(activityFeed: ActivityItem[]): string {
  if (activityFeed.length === 0) {
    return `
      <div class="activity-empty">
        <p>No recent activity</p>
        <p class="text-muted">Activity will appear here as you use ekkOS</p>
      </div>
    `;
  }

  return `
    <div class="activity-feed">
      ${activityFeed.map((item, index) => renderActivityItem(item, index)).join('')}
    </div>
    ${renderActivityModal()}
  `;
}

function renderActivityItem(item: ActivityItem, index: number): string {
  const timeAgo = formatTimeAgo(item.timestamp);
  const truncatedMessage = item.message.length > 50
    ? item.message.substring(0, 50) + '...'
    : item.message;

  return `
    <div 
      class="activity-item ${item.type}" 
      data-index="${index}"
      onclick="openActivityModal(${index})"
      style="cursor: pointer;"
      title="Click to view details"
    >
      <div class="activity-icon">${item.icon}</div>
      <div class="activity-content">
        <div class="activity-message">${truncatedMessage}</div>
        <div class="activity-time">${timeAgo}</div>
      </div>
      <div class="activity-arrow">→</div>
    </div>
  `;
}

function renderActivityModal(): string {
  return `
    <div id="activity-modal" class="activity-modal" onclick="closeActivityModal(event)">
      <div class="activity-modal-content" onclick="event.stopPropagation()">
        <div class="activity-modal-header">
          <h3 id="modal-title">Activity Details</h3>
          <button class="activity-modal-close" onclick="closeActivityModal(event)">×</button>
        </div>
        <div class="activity-modal-body" id="modal-body">
          <!-- Content populated by JavaScript -->
        </div>
      </div>
    </div>
  `;
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
  return `${diffDays}d ago`;
}

export function getActivityFeedStyles(): string {
  return `
    <style>
      .activity-feed {
        display: flex;
        flex-direction: column;
        gap: 8px;
        max-height: 400px;
        overflow-y: auto;
        padding: 8px 0;
      }

      .activity-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        transition: all 0.2s ease;
      }

      .activity-item:hover {
        background: rgba(255, 255, 255, 0.1);
        border-color: rgba(139, 92, 246, 0.5);
        transform: translateX(4px);
      }

      .activity-icon {
        font-size: 20px;
        flex-shrink: 0;
      }

      .activity-content {
        flex: 1;
        min-width: 0;
      }

      .activity-message {
        color: #e2e8f0;
        font-size: 14px;
        margin-bottom: 4px;
        word-break: break-word;
      }

      .activity-time {
        color: #94a3b8;
        font-size: 12px;
      }

      .activity-arrow {
        color: #94a3b8;
        font-size: 16px;
        opacity: 0;
        transition: opacity 0.2s;
      }

      .activity-item:hover .activity-arrow {
        opacity: 1;
      }

      .activity-empty {
        text-align: center;
        padding: 40px 20px;
        color: #94a3b8;
      }

      .activity-empty p {
        margin: 8px 0;
      }

      .text-muted {
        color: #64748b;
        font-size: 12px;
      }

      /* Modal Styles */
      .activity-modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        z-index: 1000;
        align-items: center;
        justify-content: center;
        animation: fadeIn 0.2s ease;
      }

      .activity-modal.active {
        display: flex;
      }

      .activity-modal-content {
        background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        width: 90%;
        max-width: 600px;
        max-height: 80vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        animation: slideUp 0.3s ease;
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes slideUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .activity-modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px 24px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .activity-modal-header h3 {
        margin: 0;
        color: #f1f5f9;
        font-size: 18px;
        font-weight: 600;
      }

      .activity-modal-close {
        background: none;
        border: none;
        color: #94a3b8;
        font-size: 28px;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s;
      }

      .activity-modal-close:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #f1f5f9;
      }

      .activity-modal-body {
        padding: 24px;
        overflow-y: auto;
        flex: 1;
      }

      .modal-section {
        margin-bottom: 24px;
      }

      .modal-section:last-child {
        margin-bottom: 0;
      }

      .modal-section-title {
        color: #cbd5e1;
        font-size: 14px;
        font-weight: 600;
        margin-bottom: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .modal-query {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 16px;
        color: #e2e8f0;
        font-size: 14px;
        line-height: 1.6;
        word-break: break-word;
      }

      .modal-patterns {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .modal-pattern-item {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 16px;
        transition: all 0.2s;
      }

      .modal-pattern-item:hover {
        background: rgba(255, 255, 255, 0.08);
        border-color: rgba(139, 92, 246, 0.5);
      }

      .pattern-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 8px;
      }

      .pattern-title {
        color: #f1f5f9;
        font-size: 16px;
        font-weight: 600;
        margin: 0;
      }

      .pattern-meta {
        display: flex;
        gap: 16px;
        margin-top: 12px;
        flex-wrap: wrap;
      }

      .pattern-meta-item {
        display: flex;
        align-items: center;
        gap: 6px;
        color: #94a3b8;
        font-size: 12px;
      }

      .pattern-content {
        color: #cbd5e1;
        font-size: 14px;
        line-height: 1.6;
        margin-top: 8px;
      }

      .success-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        background: rgba(34, 197, 94, 0.2);
        color: #4ade80;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
      }

      .failure-badge {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 8px;
        background: rgba(239, 68, 68, 0.2);
        color: #f87171;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
      }

      .loading-spinner {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 40px;
        color: #94a3b8;
      }

      .no-patterns {
        text-align: center;
        padding: 40px 20px;
        color: #94a3b8;
      }
    </style>
  `;
}

export function getActivityFeedScript(activityFeed: ActivityItem[], apiKey: string, apiBaseUrl: string): string {
  return `
    <script>
      const activityFeed = ${JSON.stringify(activityFeed)};
      const apiKey = ${JSON.stringify(apiKey)};
      const apiBaseUrl = ${JSON.stringify(apiBaseUrl)};

      function openActivityModal(index) {
        const item = activityFeed[index];
        const modal = document.getElementById('activity-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');

        if (!modal || !modalTitle || !modalBody) return;

        modalTitle.textContent = getModalTitle(item);
        modalBody.innerHTML = '<div class="loading-spinner">Loading details...</div>';
        modal.classList.add('active');

        // Load pattern details based on type
        if (item.type === 'retrieve' && item.retrievedPatternIds && item.retrievedPatternIds.length > 0) {
          loadPatternDetails(item, modalBody);
        } else {
          renderSimpleDetails(item, modalBody);
        }
      }

      function closeActivityModal(event) {
        event?.stopPropagation();
        const modal = document.getElementById('activity-modal');
        if (modal) {
          modal.classList.remove('active');
        }
      }

      function getModalTitle(item) {
        switch(item.type) {
          case 'retrieve':
            return '🔍 Pattern Retrieval Details';
          case 'apply':
            return item.success ? '✅ Pattern Applied' : '❌ Pattern Application Failed';
          case 'forge':
            return '💡 Pattern Forged';
          default:
            return 'Activity Details';
        }
      }

      async function loadPatternDetails(item, modalBody) {
        try {
          // Fetch pattern details from API
          const patternIds = item.retrievedPatternIds || [];
          const patterns = [];

          for (const patternId of patternIds.slice(0, 10)) { // Limit to 10 patterns
            try {
              const response = await fetch(\`\${apiBaseUrl}/api/v1/patterns/\${patternId}\`, {
                headers: {
                  'Authorization': \`Bearer \${apiKey}\`,
                  'Content-Type': 'application/json'
                }
              });

              if (response.ok) {
                const pattern = await response.json();
                patterns.push(pattern);
              }
            } catch (error) {
              console.warn('Failed to fetch pattern:', patternId, error);
            }
          }

          renderRetrievalDetails(item, patterns, modalBody);
        } catch (error) {
          console.error('Failed to load pattern details:', error);
          modalBody.innerHTML = \`
            <div class="no-patterns">
              <p>Failed to load pattern details</p>
              <p class="text-muted">\${error.message}</p>
            </div>
          \`;
        }
      }

      function renderRetrievalDetails(item, patterns, modalBody) {
        const html = \`
          <div class="modal-section">
            <div class="modal-section-title">Query</div>
            <div class="modal-query">\${escapeHtml(item.query || 'No query available')}</div>
          </div>

          <div class="modal-section">
            <div class="modal-section-title">
              Retrieved Patterns (\${patterns.length}\${item.patternCount ? \` of \${item.patternCount}\` : ''}\`)
            </div>
            \${patterns.length > 0 ? \`
              <div class="modal-patterns">
                \${patterns.map(pattern => \`
                  <div class="modal-pattern-item">
                    <div class="pattern-header">
                      <h4 class="pattern-title">\${escapeHtml(pattern.title || 'Untitled Pattern')}</h4>
                    </div>
                    <div class="pattern-content">
                      \${escapeHtml(pattern.content || pattern.guidance || pattern.title || 'No description available')}
                    </div>
                    <div class="pattern-meta">
                      \${pattern.success_rate ? \`
                        <div class="pattern-meta-item">
                          <span>📈</span>
                          <span>Success: \${Math.round(pattern.success_rate * 100)}%</span>
                        </div>
                      \` : ''}
                      \${pattern.applied_count ? \`
                        <div class="pattern-meta-item">
                          <span>✨</span>
                          <span>Applied \${pattern.applied_count}x</span>
                        </div>
                      \` : ''}
                      \${pattern.tags && pattern.tags.length > 0 ? \`
                        <div class="pattern-meta-item">
                          <span>🏷️</span>
                          <span>\${pattern.tags.slice(0, 3).join(', ')}</span>
                        </div>
                      \` : ''}
                    </div>
                  </div>
                \`).join('')}
              </div>
            \` : \`
              <div class="no-patterns">
                <p>No patterns were retrieved for this query</p>
              </div>
            \`}
          </div>

          <div class="modal-section">
            <div class="modal-section-title">Timestamp</div>
            <div style="color: #94a3b8; font-size: 14px;">
              \${new Date(item.timestamp).toLocaleString()}
            </div>
          </div>
        \`;

        modalBody.innerHTML = html;
      }

      function renderSimpleDetails(item, modalBody) {
        const html = \`
          <div class="modal-section">
            <div class="modal-section-title">Details</div>
            <div class="modal-query">\${escapeHtml(item.message)}</div>
          </div>
          \${item.query ? \`
            <div class="modal-section">
              <div class="modal-section-title">Query</div>
              <div class="modal-query">\${escapeHtml(item.query)}</div>
            </div>
          \` : ''}
          \${item.patternTitle ? \`
            <div class="modal-section">
              <div class="modal-section-title">Pattern</div>
              <div class="modal-query">\${escapeHtml(item.patternTitle)}</div>
            </div>
          \` : ''}
          <div class="modal-section">
            <div class="modal-section-title">Timestamp</div>
            <div style="color: #94a3b8; font-size: 14px;">
              \${new Date(item.timestamp).toLocaleString()}
            </div>
          </div>
        \`;

        modalBody.innerHTML = html;
      }

      function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      // Close modal on Escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          closeActivityModal();
        }
      });
    </script>
  `;
}

