/**
 * Golden Loop Status Bar - Compact Visual Tracker
 *
 * Shows: 🔄 Golden Loop | 🔍 795 | ✨ 421 | 🔥 386 | 📈 100%
 */

import * as vscode from 'vscode';

export interface GoldenLoopStats {
  retrieved: number;   // 🔍 Patterns retrieved
  applied: number;     // ✨ Patterns applied
  forged: number;      // 🔥 Patterns forged
  successRate: number; // 📈 Success rate (0-100)
}

export class GoldenLoopStatusBar {
  private statusBarItem: vscode.StatusBarItem;
  private stats: GoldenLoopStats = {
    retrieved: 0,
    applied: 0,
    forged: 0,
    successRate: 100
  };
  private currentPhase: string | null = null;

  constructor(context: vscode.ExtensionContext) {
    // Create status bar item (left side, high priority)
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      999
    );
    this.statusBarItem.command = 'ekkos.showGoldenLoopDetails';
    this.statusBarItem.tooltip = 'Click to view Golden Loop details';
    context.subscriptions.push(this.statusBarItem);

    // Register command
    context.subscriptions.push(
      vscode.commands.registerCommand('ekkos.showGoldenLoopDetails', () => {
        this.showDetails();
      })
    );

    this.updateDisplay();
    this.statusBarItem.show();
  }

  /**
   * Update stats from API or local tracking
   */
  public updateStats(stats: Partial<GoldenLoopStats>): void {
    this.stats = { ...this.stats, ...stats };
    this.updateDisplay();
  }

  /**
   * Increment a specific stat
   */
  public increment(stat: keyof GoldenLoopStats, amount: number = 1): void {
    if (stat === 'successRate') {
      this.stats.successRate = Math.min(100, Math.max(0, amount));
    } else {
      (this.stats[stat] as number) += amount;
    }
    this.updateDisplay();
  }

  /**
   * Set current active phase
   */
  public setPhase(phase: 'capture' | 'retrieve' | 'inject' | 'learn' | 'measure' | null): void {
    this.currentPhase = phase;
    this.updateDisplay();
  }

  /**
   * Update the status bar display
   */
  private updateDisplay(): void {
    const parts: string[] = [];

    // Phase indicator (if active)
    if (this.currentPhase) {
      parts.push(this.getPhaseIndicator(this.currentPhase));
    } else {
      parts.push('$(sync~spin)'); // Spinning sync icon when idle
    }

    // Golden Loop header
    parts.push('Golden Loop');

    // Stats with emojis
    if (this.stats.retrieved > 0) {
      parts.push(`$(search) ${this.formatNumber(this.stats.retrieved)}`);
    }
    if (this.stats.applied > 0) {
      parts.push(`$(star) ${this.formatNumber(this.stats.applied)}`);
    }
    if (this.stats.forged > 0) {
      parts.push(`$(flame) ${this.formatNumber(this.stats.forged)}`);
    }

    // Success rate with color
    const successIcon = this.getSuccessIcon(this.stats.successRate);
    parts.push(`${successIcon} ${this.stats.successRate}%`);

    this.statusBarItem.text = parts.join(' | ');

    // Color based on success rate
    if (this.stats.successRate >= 90) {
      this.statusBarItem.backgroundColor = undefined; // Default (good)
    } else if (this.stats.successRate >= 70) {
      this.statusBarItem.backgroundColor = new vscode.ThemeColor(
        'statusBarItem.warningBackground'
      );
    } else {
      this.statusBarItem.backgroundColor = new vscode.ThemeColor(
        'statusBarItem.errorBackground'
      );
    }

    // Update tooltip with detailed breakdown
    this.statusBarItem.tooltip = this.buildTooltip();
  }

  /**
   * Get phase indicator icon
   */
  private getPhaseIndicator(phase: string): string {
    const icons: Record<string, string> = {
      capture: '$(inbox)',       // 📥 Capture
      retrieve: '$(search)',      // 🔍 Retrieve
      inject: '$(arrow-right)',   // 💉 Inject
      learn: '$(lightbulb)',      // 🧠 Learn
      measure: '$(graph)',        // 📊 Measure
    };
    return icons[phase] || '$(circle-filled)';
  }

  /**
   * Get success rate icon
   */
  private getSuccessIcon(rate: number): string {
    if (rate >= 90) return '$(pass-filled)';    // ✅
    if (rate >= 70) return '$(warning)';        // ⚠️
    return '$(error)';                          // ❌
  }

  /**
   * Format number with abbreviations
   */
  private formatNumber(num: number): string {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  }

  /**
   * Build detailed tooltip
   */
  private buildTooltip(): string {
    const lines = [
      '🔄 Golden Loop Status',
      '',
      `🔍 Retrieved: ${this.stats.retrieved} patterns`,
      `✨ Applied: ${this.stats.applied} patterns`,
      `🔥 Forged: ${this.stats.forged} patterns`,
      `📈 Success Rate: ${this.stats.successRate}%`,
      '',
      'Click to view detailed stats'
    ];

    if (this.currentPhase) {
      lines.unshift(`Currently: ${this.currentPhase.toUpperCase()}`);
    }

    return lines.join('\n');
  }

  /**
   * Show detailed view
   */
  private showDetails(): void {
    const panel = vscode.window.createWebviewPanel(
      'goldenLoopDetails',
      'Golden Loop Details',
      vscode.ViewColumn.Beside,
      { enableScripts: true }
    );

    panel.webview.html = this.getWebviewContent();
  }

  /**
   * Generate webview HTML
   */
  private getWebviewContent(): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
          }
          h1 {
            font-size: 24px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 10px;
          }
          .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-top: 20px;
          }
          .stat-card {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            text-align: center;
          }
          .stat-icon {
            font-size: 48px;
            margin-bottom: 10px;
          }
          .stat-value {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .stat-label {
            font-size: 14px;
            opacity: 0.7;
          }
          .flow {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .phase {
            text-align: center;
            flex: 1;
          }
          .phase-icon {
            font-size: 32px;
            margin-bottom: 10px;
          }
          .phase-name {
            font-size: 12px;
            opacity: 0.7;
          }
          .arrow {
            font-size: 24px;
            opacity: 0.5;
          }
        </style>
      </head>
      <body>
        <h1>🔄 Golden Loop Status</h1>

        <div class="stats">
          <div class="stat-card">
            <div class="stat-icon">🔍</div>
            <div class="stat-value">${this.stats.retrieved}</div>
            <div class="stat-label">Retrieved</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">✨</div>
            <div class="stat-value">${this.stats.applied}</div>
            <div class="stat-label">Applied</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">🔥</div>
            <div class="stat-value">${this.stats.forged}</div>
            <div class="stat-label">Forged</div>
          </div>
          <div class="stat-card">
            <div class="stat-icon">📈</div>
            <div class="stat-value">${this.stats.successRate}%</div>
            <div class="stat-label">Success Rate</div>
          </div>
        </div>

        <div class="flow">
          <div class="phase">
            <div class="phase-icon">📥</div>
            <div class="phase-name">Capture</div>
          </div>
          <div class="arrow">→</div>
          <div class="phase">
            <div class="phase-icon">🔍</div>
            <div class="phase-name">Retrieve</div>
          </div>
          <div class="arrow">→</div>
          <div class="phase">
            <div class="phase-icon">💉</div>
            <div class="phase-name">Inject</div>
          </div>
          <div class="arrow">→</div>
          <div class="phase">
            <div class="phase-icon">🧠</div>
            <div class="phase-name">Learn</div>
          </div>
          <div class="arrow">→</div>
          <div class="phase">
            <div class="phase-icon">📊</div>
            <div class="phase-name">Measure</div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Reset stats
   */
  public reset(): void {
    this.stats = {
      retrieved: 0,
      applied: 0,
      forged: 0,
      successRate: 100
    };
    this.currentPhase = null;
    this.updateDisplay();
  }

  /**
   * Dispose
   */
  public dispose(): void {
    this.statusBarItem.dispose();
  }
}

/**
 * Singleton instance
 */
let instance: GoldenLoopStatusBar | null = null;

export function initializeGoldenLoopStatusBar(
  context: vscode.ExtensionContext
): GoldenLoopStatusBar {
  if (!instance) {
    instance = new GoldenLoopStatusBar(context);
  }
  return instance;
}

export function getGoldenLoopStatusBar(): GoldenLoopStatusBar | null {
  return instance;
}
