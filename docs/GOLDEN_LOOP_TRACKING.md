# Golden Loop Tracking in Extension

## Visual Status Bar

Shows live stats for the 5-phase flow on every turn:

```
$(sync~spin) Golden Loop | $(search) 795 | $(star) 421 | $(flame) 386 | $(pass-filled) 100%
```

**What it shows**:
- 🔄 Current phase (when active)
- 🔍 Retrieved: Total patterns retrieved
- ✨ Applied: Total patterns applied
- 🔥 Forged: Total patterns forged
- 📈 Success rate: % of successful operations

---

## Integration

### Step 1: Initialize in `extension.ts`

```typescript
import { initializeGoldenLoopStatusBar, getGoldenLoopStatusBar } from './goldenLoopStatusBar';

export function activate(context: vscode.ExtensionContext) {
  // Initialize Golden Loop status bar
  const goldenLoop = initializeGoldenLoopStatusBar(context);

  // ... rest of activation code
}
```

### Step 2: Update on Every Hook Call

In your hook handler (where you process user-prompt-submit or agent responses):

```typescript
// Hook handler
async function onUserPromptSubmit() {
  const goldenLoop = getGoldenLoopStatusBar();
  if (!goldenLoop) return;

  // Phase 1: CAPTURE
  goldenLoop.setPhase('capture');
  await captureContext();

  // Phase 2: RETRIEVE
  goldenLoop.setPhase('retrieve');
  const patterns = await retrieveFromMemory();
  goldenLoop.increment('retrieved', patterns.length);

  // Phase 3: INJECT
  goldenLoop.setPhase('inject');
  const applied = await applyPatterns(patterns);
  goldenLoop.increment('applied', applied.length);

  // Phase 4: LEARN
  goldenLoop.setPhase('learn');
  await executeAction();

  // Phase 5: MEASURE
  goldenLoop.setPhase('measure');
  const forged = await forgePatterns();
  goldenLoop.increment('forged', forged.length);

  // Done
  goldenLoop.setPhase(null); // Back to idle
}
```

### Step 3: Fetch Stats from API

Periodically update stats from the ekkOS API:

```typescript
async function updateGoldenLoopStats() {
  const goldenLoop = getGoldenLoopStatusBar();
  if (!goldenLoop) return;

  try {
    // Fetch from ekkOS API
    const response = await fetch('https://api.ekkos.dev/api/v1/stats', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    const stats = await response.json();

    // Update status bar
    goldenLoop.updateStats({
      retrieved: stats.total_retrievals,
      applied: stats.total_applications,
      forged: stats.total_patterns,
      successRate: stats.success_rate
    });
  } catch (error) {
    console.error('Failed to fetch Golden Loop stats:', error);
  }
}

// Update every 30 seconds
setInterval(updateGoldenLoopStats, 30000);
```

---

## Real-Time Turn Tracking

### Hook Integration

In your `user-prompt-submit.sh` hook, emit events that the extension can listen to:

```bash
#!/bin/bash

# Get turn number
TURN=$(cat ~/.claude/state/current-session.json | jq -r '.turn_number // 0')

# Emit event for extension
echo "EKKOS_EVENT:TURN_START:$TURN" > ~/.ekkos/extension-events

# Phase 1: CAPTURE
echo "EKKOS_EVENT:PHASE:capture" > ~/.ekkos/extension-events

# Phase 2: RETRIEVE
PATTERNS=$(curl -s "https://api.ekkos.dev/api/v1/search" ...)
PATTERN_COUNT=$(echo "$PATTERNS" | jq '.results.patterns | length')
echo "EKKOS_EVENT:PHASE:retrieve:$PATTERN_COUNT" > ~/.ekkos/extension-events

# ... etc
```

### Extension Event Listener

Watch the event file:

```typescript
import * as fs from 'fs';
import * as path from 'path';

function watchGoldenLoopEvents() {
  const goldenLoop = getGoldenLoopStatusBar();
  if (!goldenLoop) return;

  const eventFile = path.join(os.homedir(), '.ekkos', 'extension-events');

  fs.watchFile(eventFile, (curr, prev) => {
    if (curr.mtime > prev.mtime) {
      const content = fs.readFileSync(eventFile, 'utf-8');
      const lines = content.split('\n').filter(Boolean);

      for (const line of lines) {
        if (line.startsWith('EKKOS_EVENT:')) {
          const parts = line.replace('EKKOS_EVENT:', '').split(':');
          handleGoldenLoopEvent(parts);
        }
      }
    }
  });
}

function handleGoldenLoopEvent(parts: string[]) {
  const goldenLoop = getGoldenLoopStatusBar();
  if (!goldenLoop) return;

  const [eventType, ...args] = parts;

  switch (eventType) {
    case 'TURN_START':
      goldenLoop.reset();
      break;

    case 'PHASE':
      const [phase, count] = args;
      goldenLoop.setPhase(phase as any);
      if (count) {
        goldenLoop.increment(getStatKey(phase), parseInt(count));
      }
      break;

    case 'TURN_END':
      goldenLoop.setPhase(null);
      break;
  }
}

function getStatKey(phase: string): 'retrieved' | 'applied' | 'forged' {
  const map: Record<string, 'retrieved' | 'applied' | 'forged'> = {
    'retrieve': 'retrieved',
    'inject': 'applied',
    'measure': 'forged'
  };
  return map[phase] || 'retrieved';
}
```

---

## Visual Examples

### Idle State
```
$(sync~spin) Golden Loop | $(pass-filled) 100%
```

### Active Phase (Retrieving)
```
$(search) Golden Loop | $(search) 795 | $(pass-filled) 100%
```

### With Stats
```
$(sync~spin) Golden Loop | $(search) 795 | $(star) 421 | $(flame) 386 | $(pass-filled) 95%
```

### Warning State (Low Success Rate)
```
$(sync~spin) Golden Loop | $(search) 795 | $(star) 421 | $(flame) 386 | $(warning) 72%
```
(Background turns yellow)

### Error State (Very Low Success Rate)
```
$(sync~spin) Golden Loop | $(search) 795 | $(star) 421 | $(flame) 386 | $(error) 45%
```
(Background turns red)

---

## Detailed View

Clicking the status bar opens a webview panel showing:

```
🔄 Golden Loop Status

┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   🔍        │  │   ✨        │  │   🔥        │  │   📈        │
│   795       │  │   421       │  │   386       │  │   100%      │
│ Retrieved   │  │  Applied    │  │  Forged     │  │ Success     │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘

📥 Capture → 🔍 Retrieve → 💉 Inject → 🧠 Learn → 📊 Measure
```

---

## API Endpoints

The extension can fetch stats from:

```
GET https://api.ekkos.dev/api/v1/stats
Authorization: Bearer {token}

Response:
{
  "total_retrievals": 795,
  "total_applications": 421,
  "total_patterns": 386,
  "success_rate": 95.2,
  "last_24h": {
    "retrievals": 42,
    "applications": 18,
    "forges": 12
  }
}
```

---

## Testing

```typescript
// Simulate a turn
const goldenLoop = getGoldenLoopStatusBar();

goldenLoop.setPhase('capture');
await sleep(500);

goldenLoop.setPhase('retrieve');
goldenLoop.increment('retrieved', 3);
await sleep(500);

goldenLoop.setPhase('inject');
goldenLoop.increment('applied', 2);
await sleep(500);

goldenLoop.setPhase('learn');
await sleep(1000);

goldenLoop.setPhase('measure');
goldenLoop.increment('forged', 1);
await sleep(500);

goldenLoop.setPhase(null); // Back to idle
```

---

## Configuration

Add to `package.json`:

```json
{
  "contributes": {
    "commands": [
      {
        "command": "ekkos.showGoldenLoopDetails",
        "title": "ekkOS: Show Golden Loop Details"
      },
      {
        "command": "ekkos.resetGoldenLoopStats",
        "title": "ekkOS: Reset Golden Loop Stats"
      }
    ],
    "configuration": {
      "properties": {
        "ekkos.goldenLoop.enabled": {
          "type": "boolean",
          "default": true,
          "description": "Show Golden Loop status in status bar"
        },
        "ekkos.goldenLoop.updateInterval": {
          "type": "number",
          "default": 30000,
          "description": "How often to fetch stats from API (ms)"
        }
      }
    }
  }
}
```

---

## Summary

This implementation provides:
- ✅ **Real-time phase tracking** - See what ekkOS is doing
- ✅ **Live stats** - Retrieved/Applied/Forged counters
- ✅ **Success rate** - Visual indicator of system health
- ✅ **Detailed view** - Click for full breakdown
- ✅ **Color coding** - Yellow/red warnings for issues
- ✅ **Persistent** - Stats carry across sessions

Users can now **see the Golden Loop in action** on every turn! 🎯
