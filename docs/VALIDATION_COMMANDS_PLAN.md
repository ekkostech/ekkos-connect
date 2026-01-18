# Validation Commands Integration Plan

**Goal**: Make validation scripts accessible directly from VS Code extension with user-friendly UI.

## Overview

The extension will expose validation scripts as VS Code commands, showing results in output panel with colorized output and helpful notifications.

## New Commands

### 1. `ekkOS: Validate Templates`
- **ID**: `ekkos.validateTemplates`
- **What**: Runs `scripts/validate-templates.sh`
- **Shows**:
  - Footer format check
  - Hook syntax validation
  - Skills presence check
  - Credential scan
  - Windows compatibility
  - Template variables documentation
  - Required files check

### 2. `ekkOS: Pre-Publish Check`
- **ID**: `ekkos.prePublishCheck`
- **What**: Runs `scripts/pre-publish-check.sh`
- **Shows**:
  - All template validations
  - TypeScript compilation status
  - Linting results
  - package.json validation
  - CHANGELOG verification
  - Git status
  - Version tag check
  - Dependencies check

### 3. `ekkOS: Windows Setup Guide`
- **ID**: `ekkos.showWindowsGuide`
- **What**: Opens `docs/WINDOWS_SETUP_GUIDE.md` in editor
- **Platform**: Automatically shown on Windows first run

### 4. `ekkOS: Windows Quick Fix`
- **ID**: `ekkos.showWindowsQuickFix`
- **What**: Opens `docs/WINDOWS_QUICK_FIX.md` in editor
- **Platform**: Windows only (hidden on macOS/Linux)

## Implementation

### Step 1: Update package.json

Add new commands:

```json
{
  "command": "ekkos.validateTemplates",
  "title": "ekkOS: Validate Templates",
  "icon": "$(check)"
},
{
  "command": "ekkos.prePublishCheck",
  "title": "ekkOS: Pre-Publish Check",
  "icon": "$(checklist)"
},
{
  "command": "ekkos.showWindowsGuide",
  "title": "ekkOS: Windows Setup Guide",
  "icon": "$(question)"
},
{
  "command": "ekkos.showWindowsQuickFix",
  "title": "ekkOS: Windows Quick Fix",
  "icon": "$(tools)"
}
```

### Step 2: Add Helper Functions

```typescript
/**
 * Run a bash script and show results in output panel
 */
async function runValidationScript(
  scriptPath: string,
  title: string
): Promise<{ success: boolean; output: string }> {
  return vscode.window.withProgress({
    location: vscode.ProgressLocation.Notification,
    title: `Running ${title}...`,
    cancellable: false
  }, async () => {
    try {
      const { execSync } = require('child_process');

      // Check bash availability on Windows
      if (detectPlatform() === 'windows' && !isBashAvailable()) {
        throw new Error('Git Bash not found. Please install Git for Windows.');
      }

      // Run script
      const output = execSync(`bash "${scriptPath}"`, {
        encoding: 'utf-8',
        cwd: extensionContext.extensionPath
      });

      return { success: true, output };
    } catch (error: any) {
      const output = error.stdout || error.message;
      return { success: false, output };
    }
  });
}

/**
 * Show validation results in output panel
 */
function showValidationResults(
  title: string,
  result: { success: boolean; output: string }
): void {
  // Show output channel
  outputChannel.show();

  // Clear previous output
  outputChannel.clear();

  // Header
  outputChannel.appendLine(`${'='.repeat(60)}`);
  outputChannel.appendLine(`${title}`);
  outputChannel.appendLine(`${'='.repeat(60)}`);
  outputChannel.appendLine('');

  // Output (with ANSI color codes stripped for now)
  const cleanOutput = result.output.replace(/\x1b\[[0-9;]*m/g, '');
  outputChannel.appendLine(cleanOutput);

  // Footer
  outputChannel.appendLine('');
  outputChannel.appendLine(`${'='.repeat(60)}`);
  outputChannel.appendLine(`Status: ${result.success ? '✓ PASSED' : '✗ FAILED'}`);
  outputChannel.appendLine(`${'='.repeat(60)}`);

  // Notification
  if (result.success) {
    vscode.window.showInformationMessage(
      `✓ ${title} - All checks passed!`
    );
  } else {
    vscode.window.showErrorMessage(
      `✗ ${title} - Some checks failed. See output for details.`,
      'Show Output'
    ).then(action => {
      if (action === 'Show Output') {
        outputChannel.show();
      }
    });
  }
}
```

### Step 3: Register Commands

```typescript
// In activate() function:

// Validate Templates
context.subscriptions.push(
  vscode.commands.registerCommand('ekkos.validateTemplates', async () => {
    const scriptPath = path.join(context.extensionPath, 'scripts', 'validate-templates.sh');

    if (!fs.existsSync(scriptPath)) {
      vscode.window.showErrorMessage('Validation script not found. Extension may need reinstall.');
      return;
    }

    const result = await runValidationScript(scriptPath, 'Template Validation');
    showValidationResults('Template Validation', result);
  })
);

// Pre-Publish Check
context.subscriptions.push(
  vscode.commands.registerCommand('ekkos.prePublishCheck', async () => {
    const scriptPath = path.join(context.extensionPath, 'scripts', 'pre-publish-check.sh');

    if (!fs.existsSync(scriptPath)) {
      vscode.window.showErrorMessage('Pre-publish script not found. Extension may need reinstall.');
      return;
    }

    const result = await runValidationScript(scriptPath, 'Pre-Publish Check');
    showValidationResults('Pre-Publish Check', result);
  })
);

// Windows Setup Guide
context.subscriptions.push(
  vscode.commands.registerCommand('ekkos.showWindowsGuide', async () => {
    const guidePath = path.join(context.extensionPath, 'docs', 'WINDOWS_SETUP_GUIDE.md');

    if (!fs.existsSync(guidePath)) {
      vscode.window.showErrorMessage('Windows setup guide not found.');
      return;
    }

    const doc = await vscode.workspace.openTextDocument(guidePath);
    await vscode.window.showTextDocument(doc, { preview: false });
  })
);

// Windows Quick Fix
context.subscriptions.push(
  vscode.commands.registerCommand('ekkos.showWindowsQuickFix', async () => {
    const quickFixPath = path.join(context.extensionPath, 'docs', 'WINDOWS_QUICK_FIX.md');

    if (!fs.existsSync(quickFixPath)) {
      vscode.window.showErrorMessage('Windows quick fix guide not found.');
      return;
    }

    const doc = await vscode.workspace.openTextDocument(quickFixPath);
    await vscode.window.showTextDocument(doc, { preview: false });
  })
);
```

### Step 4: Auto-Show Windows Guide

```typescript
// In activate() function, after initial setup:

// Show Windows guide on first run (Windows only)
if (detectPlatform() === 'windows') {
  const hasShownWindowsGuide = context.globalState.get<boolean>('ekkos.hasShownWindowsGuide', false);

  if (!hasShownWindowsGuide) {
    const action = await vscode.window.showInformationMessage(
      'Welcome to ekkOS! Windows requires special setup for hooks and MCP.',
      'Show Setup Guide',
      'Show Quick Fix',
      'Dismiss'
    );

    if (action === 'Show Setup Guide') {
      vscode.commands.executeCommand('ekkos.showWindowsGuide');
    } else if (action === 'Show Quick Fix') {
      vscode.commands.executeCommand('ekkos.showWindowsQuickFix');
    }

    // Mark as shown
    context.globalState.update('ekkos.hasShownWindowsGuide', true);
  }
}
```

### Step 5: Add to Sidebar

Show validation commands in sidebar UI:

```html
<!-- In webview HTML -->
<div class="validation-section">
  <h3>Development Tools</h3>
  <button onclick="runCommand('ekkos.validateTemplates')">
    ✓ Validate Templates
  </button>
  <button onclick="runCommand('ekkos.prePublishCheck')">
    ✓ Pre-Publish Check
  </button>

  <!-- Windows only -->
  <div class="windows-only">
    <h3>Windows Setup</h3>
    <button onclick="runCommand('ekkos.showWindowsGuide')">
      📖 Setup Guide
    </button>
    <button onclick="runCommand('ekkos.showWindowsQuickFix')">
      🔧 Quick Fix
    </button>
  </div>
</div>
```

## User Experience

### Scenario 1: Windows User First Install

1. Install extension
2. Sees notification: "Windows requires special setup"
3. Clicks "Show Setup Guide"
4. Opens WINDOWS_SETUP_GUIDE.md with instructions
5. Follows setup steps
6. Can run validation to verify setup

### Scenario 2: Developer Validation

1. Makes changes to templates
2. Opens command palette (Ctrl+Shift+P)
3. Types "ekkOS: Validate"
4. Selects "ekkOS: Validate Templates"
5. Progress notification shows "Running..."
6. Output panel shows results with colors
7. Notification: "✓ All checks passed!"

### Scenario 3: Pre-Publish Check

1. Ready to publish new version
2. Runs "ekkOS: Pre-Publish Check"
3. Sees all 10 checks run
4. Output shows detailed results
5. Either:
   - ✓ Ready to publish
   - ✗ Issues found (with details)

## Benefits

1. **User-Friendly**: No command-line knowledge required
2. **Cross-Platform**: Works on Windows, macOS, Linux
3. **Integrated**: Results in VS Code output panel
4. **Helpful**: Notifications guide user to fixes
5. **Discoverable**: Commands in palette, sidebar
6. **Automatic**: Windows guide shown on first run
7. **Validated**: Scripts are packaged and available

## Files Changed

- `package.json` - Add 4 new commands
- `src/extension.ts` - Add helper functions and command handlers
- `src/sidebar.html` - Add validation buttons (if applicable)

## Testing

- [ ] Test on Windows (Git Bash required)
- [ ] Test on macOS
- [ ] Test on Linux
- [ ] Verify output panel formatting
- [ ] Verify notifications work
- [ ] Test Windows guide auto-show
- [ ] Test command palette discovery

## Future Enhancements

1. **Colorized Output**: Preserve ANSI colors in output panel
2. **Fix Buttons**: Quick-fix buttons for common issues
3. **Auto-Run**: Validate on template file save
4. **CI Integration**: Export results for GitHub Actions
5. **Settings**: Toggle auto-validation

---

**Status**: Ready to implement
**Priority**: High (improves UX significantly)
**Effort**: ~2 hours
