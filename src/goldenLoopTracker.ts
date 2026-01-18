/**
 * Golden Loop Tracker - Visual Phase Tracking
 *
 * Tracks and displays the 5-phase flow (Capture → Learn → Retrieve → Inject → Measure)
 * in the VSCode status bar and output channel.
 */

import * as vscode from 'vscode';

export type Phase = 'capture' | 'retrieve' | 'inject' | 'learn' | 'measure';

export interface PhaseResult {
  phase: Phase;
  status: 'active' | 'completed' | 'skipped' | 'failed';
  startTime: number;
  endTime?: number;
  duration?: number;
  details?: string;
  data?: Record<string, unknown>;
}

export class GoldenLoopTracker {
  private statusBarItem: vscode.StatusBarItem;
  private outputChannel: vscode.OutputChannel;
  private currentTurn: number = 0;
  private phaseResults: Map<number, PhaseResult[]> = new Map();
  private currentPhase: Phase | null = null;
  private phaseStartTime: number = 0;

  constructor(context: vscode.ExtensionContext) {
    // Create status bar item (left side, high priority)
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      1000
    );
    this.statusBarItem.command = 'ekkos.showGoldenLoopStatus';
    this.statusBarItem.tooltip = 'ekkOS Golden Loop Status';
    context.subscriptions.push(this.statusBarItem);

    // Create output channel for detailed logs
    this.outputChannel = vscode.window.createOutputChannel('ekkOS Golden Loop');
    context.subscriptions.push(this.outputChannel);

    // Register command to show detailed status
    context.subscriptions.push(
      vscode.commands.registerCommand('ekkos.showGoldenLoopStatus', () => {
        this.showDetailedStatus();
      })
    );

    this.updateStatusBar('idle');
  }

  /**
   * Start a new turn
   */
  public startTurn(turnNumber: number): void {
    this.currentTurn = turnNumber;
    this.phaseResults.set(turnNumber, []);
    this.outputChannel.appendLine(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    this.outputChannel.appendLine(`🔄 Turn ${turnNumber} - Golden Loop Started`);
    this.outputChannel.appendLine(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  }

  /**
   * Start a phase
   */
  public startPhase(phase: Phase, details?: string): void {
    this.currentPhase = phase;
    this.phaseStartTime = Date.now();

    const emoji = this.getPhaseEmoji(phase);
    const phaseName = this.getPhaseName(phase);

    this.updateStatusBar(phase);
    this.outputChannel.appendLine(`${emoji} Phase: ${phaseName}`);
    if (details) {
      this.outputChannel.appendLine(`   ${details}`);
    }
  }

  /**
   * Complete a phase
   */
  public completePhase(
    phase: Phase,
    status: 'completed' | 'skipped' | 'failed' = 'completed',
    details?: string,
    data?: Record<string, unknown>
  ): void {
    const endTime = Date.now();
    const duration = endTime - this.phaseStartTime;

    const result: PhaseResult = {
      phase,
      status,
      startTime: this.phaseStartTime,
      endTime,
      duration,
      details,
      data
    };

    // Store result
    const turnResults = this.phaseResults.get(this.currentTurn) || [];
    turnResults.push(result);
    this.phaseResults.set(this.currentTurn, turnResults);

    // Log completion
    const statusEmoji = status === 'completed' ? '✅' : status === 'skipped' ? '⏭️' : '❌';
    this.outputChannel.appendLine(`   ${statusEmoji} ${status.toUpperCase()} (${duration}ms)`);
    if (details) {
      this.outputChannel.appendLine(`   ${details}`);
    }
    if (data) {
      this.outputChannel.appendLine(`   Data: ${JSON.stringify(data, null, 2)}`);
    }
    this.outputChannel.appendLine('');

    this.currentPhase = null;
  }

  /**
   * Complete the turn
   */
  public completeTurn(): void {
    const turnResults = this.phaseResults.get(this.currentTurn) || [];
    const totalDuration = turnResults.reduce((sum, r) => sum + (r.duration || 0), 0);
    const completedCount = turnResults.filter(r => r.status === 'completed').length;

    this.outputChannel.appendLine(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    this.outputChannel.appendLine(`✓ Turn ${this.currentTurn} Complete`);
    this.outputChannel.appendLine(`   Phases: ${completedCount}/${turnResults.length} completed`);
    this.outputChannel.appendLine(`   Total Time: ${totalDuration}ms`);
    this.outputChannel.appendLine(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    this.updateStatusBar('idle');

    // Show notification with summary
    const message = `Turn ${this.currentTurn}: ${completedCount}/5 phases (${totalDuration}ms)`;
    vscode.window.showInformationMessage(message, 'Show Details').then(selection => {
      if (selection === 'Show Details') {
        this.showDetailedStatus();
      }
    });
  }

  /**
   * Show detailed status in a webview
   */
  private showDetailedStatus(): void {
    this.outputChannel.show();
  }

  /**
   * Update status bar with current phase
   */
  private updateStatusBar(state: Phase | 'idle'): void {
    if (state === 'idle') {
      this.statusBarItem.text = '$(circle-outline) ekkOS';
      this.statusBarItem.backgroundColor = undefined;
    } else {
      const emoji = this.getPhaseEmoji(state);
      const name = this.getPhaseName(state);
      this.statusBarItem.text = `${emoji} ${name}`;
      this.statusBarItem.backgroundColor = new vscode.ThemeColor(
        'statusBarItem.warningBackground'
      );
    }
    this.statusBarItem.show();
  }

  /**
   * Get emoji for phase
   */
  private getPhaseEmoji(phase: Phase): string {
    const emojis: Record<Phase, string> = {
      capture: '📥',
      retrieve: '🔍',
      inject: '💉',
      learn: '🧠',
      measure: '📊'
    };
    return emojis[phase] || '●';
  }

  /**
   * Get display name for phase
   */
  private getPhaseName(phase: Phase): string {
    const names: Record<Phase, string> = {
      capture: 'Capture',
      retrieve: 'Retrieve',
      inject: 'Inject',
      learn: 'Learn',
      measure: 'Measure'
    };
    return names[phase] || phase;
  }

  /**
   * Get results for a specific turn
   */
  public getTurnResults(turn: number): PhaseResult[] {
    return this.phaseResults.get(turn) || [];
  }

  /**
   * Clear all results
   */
  public clear(): void {
    this.phaseResults.clear();
    this.outputChannel.clear();
    this.updateStatusBar('idle');
  }

  /**
   * Dispose resources
   */
  public dispose(): void {
    this.statusBarItem.dispose();
    this.outputChannel.dispose();
  }
}

/**
 * Singleton instance
 */
let instance: GoldenLoopTracker | null = null;

export function initializeGoldenLoopTracker(context: vscode.ExtensionContext): GoldenLoopTracker {
  if (!instance) {
    instance = new GoldenLoopTracker(context);
  }
  return instance;
}

export function getGoldenLoopTracker(): GoldenLoopTracker | null {
  return instance;
}
