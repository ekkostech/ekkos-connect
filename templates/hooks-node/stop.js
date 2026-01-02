#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ekkOS_ Hook: Stop (Claude Code) - CAPTURE + ANALYZE
 * Node.js version - Works on Windows, macOS, Linux without bash dependencies
 *
 * ARCHITECTURE: Dumb Hook, Smart Backend
 * ═══════════════════════════════════════════════════════════════════════════
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Load state management
const state = require('./lib/state');

// ═══════════════════════════════════════════════════════════════════════════
// ANSI Color Codes
// ═══════════════════════════════════════════════════════════════════════════
const CYAN = '\x1b[0;36m';
const GREEN = '\x1b[0;32m';
const YELLOW = '\x1b[1;33m';
const BLUE = '\x1b[0;34m';
const RED = '\x1b[0;31m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

// ═══════════════════════════════════════════════════════════════════════════
// HTTP Request Helper
// ═══════════════════════════════════════════════════════════════════════════
function httpRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const lib = urlObj.protocol === 'https:' ? https : http;
    const timeout = options.timeout || 10000;

    const req = lib.request({
      hostname: urlObj.hostname,
      port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: timeout
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve({ raw: body });
        }
      });
    });

    req.on('error', (e) => resolve({ error: e.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ error: 'timeout' });
    });

    if (data) req.write(typeof data === 'string' ? data : JSON.stringify(data));
    req.end();
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// Load Auth Token
// ═══════════════════════════════════════════════════════════════════════════
function loadAuthToken() {
  const homeDir = os.homedir();
  const ekkosConfig = path.join(homeDir, '.ekkos', 'config.json');
  let authToken = '';
  let userId = '';

  // 1. First try ~/.ekkos/config.json (set by VS Code extension - most portable)
  //    Prefer hookApiKey (scoped key for hooks) over apiKey (legacy)
  if (fs.existsSync(ekkosConfig)) {
    try {
      const config = JSON.parse(fs.readFileSync(ekkosConfig, 'utf8'));
      authToken = config.hookApiKey || config.apiKey || '';
      userId = config.userId || '';
    } catch {}
  }

  // 2. Then try project .env.local
  if (!authToken) {
    const envLocal = path.join(state.PROJECT_ROOT, '.env.local');
    if (fs.existsSync(envLocal)) {
      try {
        const content = fs.readFileSync(envLocal, 'utf8');
        const match = content.match(/^SUPABASE_SECRET_KEY=(.+)$/m);
        if (match) {
          authToken = match[1].replace(/["']/g, '').trim();
        }
      } catch {}
    }
  }

  // 3. Finally try environment variable
  if (!authToken) {
    authToken = process.env.SUPABASE_SECRET_KEY || '';
  }

  return { authToken, userId };
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Hook Logic
// ═══════════════════════════════════════════════════════════════════════════
async function main() {
  // Read JSON input from stdin
  let inputData = '';
  for await (const chunk of process.stdin) {
    inputData += chunk;
  }

  let input;
  try {
    input = JSON.parse(inputData);
  } catch {
    process.exit(0);
  }

  const sessionId = input.session_id || 'unknown';
  const transcriptPath = input.transcript_path || '';
  let modelUsed = input.model || 'claude-sonnet-4-5';
  const timestamp = new Date().toISOString();

  // Load auth
  const { authToken, userId } = loadAuthToken();
  if (!authToken) {
    process.exit(0);
  }

  const MEMORY_API_URL = 'https://mcp.ekkos.dev';

  // Extract conversation from transcript
  let lastUser = '';
  let lastAssistant = '';

  if (transcriptPath && fs.existsSync(transcriptPath)) {
    try {
      const transcriptContent = fs.readFileSync(transcriptPath, 'utf8');
      const lines = transcriptContent.split('\n').filter(Boolean).map(l => {
        try { return JSON.parse(l); } catch { return null; }
      }).filter(Boolean);

      // Find last user query (from queue-operation enqueue)
      const enqueues = lines.filter(l => l.type === 'queue-operation' && l.operation === 'enqueue');
      if (enqueues.length > 0) {
        const lastEnqueue = enqueues[enqueues.length - 1];
        if (lastEnqueue.content) {
          const textContent = lastEnqueue.content.find(c => c.type === 'text');
          if (textContent) lastUser = textContent.text;
        }
      }

      // Find assistant messages after last user query
      const assistantMsgs = lines.filter(l => l.type === 'assistant');
      if (assistantMsgs.length > 0) {
        const lastAssistantMsg = assistantMsgs[assistantMsgs.length - 1];
        if (lastAssistantMsg.message?.content) {
          if (Array.isArray(lastAssistantMsg.message.content)) {
            lastAssistant = lastAssistantMsg.message.content
              .filter(c => c.type === 'text')
              .map(c => c.text)
              .join(' ');
          } else {
            lastAssistant = lastAssistantMsg.message.content;
          }
        }
      }
    } catch {}
  }

  // Fallback: use response from input
  if (!lastAssistant) {
    lastAssistant = input.response || '';
  }

  // Load patterns from RETRIEVE step
  const storedData = state.loadPatterns(sessionId);
  const patterns = storedData.patterns || [];
  const patternCount = patterns.length;
  const patternIds = patterns.map(p => p.id || p.pattern_id).filter(Boolean);
  if (storedData.model_used) modelUsed = storedData.model_used;
  const taskId = storedData.task_id || '';

  // ═══════════════════════════════════════════════════════════════════════════
  // Pattern Acknowledgment Detection (PatternGuard)
  // ═══════════════════════════════════════════════════════════════════════════
  let appliedPatternIds = [];
  let skippedPatternIds = [];

  if (lastAssistant && patternCount > 0) {
    // Check for [ekkOS_SELECT] block
    const selectMatch = lastAssistant.match(/\[ekkOS_SELECT\]([\s\S]*?)\[\/ekkOS_SELECT\]/);
    if (selectMatch) {
      const idMatches = selectMatch[1].matchAll(/id:\s*([a-f0-9-]+)/g);
      for (const m of idMatches) {
        if (m[1].length >= 8) {
          appliedPatternIds.push(m[1]);
          console.error(`[ekkOS_SELECT] Applied: ${m[1].substring(0, 8)}...`);
        }
      }
    }

    // Check for [ekkOS_SKIP] block
    const skipMatch = lastAssistant.match(/\[ekkOS_SKIP\]([\s\S]*?)\[\/ekkOS_SKIP\]/);
    if (skipMatch) {
      const idMatches = skipMatch[1].matchAll(/id:\s*([a-f0-9-]+)/g);
      for (const m of idMatches) {
        if (m[1].length >= 8) {
          skippedPatternIds.push(m[1]);
          console.error(`[ekkOS_SKIP] Skipped: ${m[1].substring(0, 8)}...`);
        }
      }
    }

    // Calculate coverage
    const acknowledged = appliedPatternIds.length + skippedPatternIds.length;
    if (patternCount > 0) {
      const coverage = Math.round((acknowledged / patternCount) * 100);
      if (coverage < 100) {
        console.error(`${YELLOW}[PatternGuard] Coverage: ${coverage}% (${acknowledged}/${patternCount} patterns acknowledged)${RESET}`);
      } else {
        console.error(`${GREEN}[PatternGuard] 100% coverage - all patterns acknowledged${RESET}`);
      }
    }

    // Legacy: Check for [ekkOS_APPLY] markers
    if (appliedPatternIds.length === 0 && skippedPatternIds.length === 0) {
      for (const pattern of patterns) {
        const title = pattern.title || '';
        const pid = pattern.id || pattern.pattern_id || '';
        if (lastAssistant.includes('[ekkOS_APPLY]') && lastAssistant.includes(title)) {
          appliedPatternIds.push(pid);
          console.error(`[ekkOS_APPLY_DETECTED] Pattern: "${title}"`);
        }
      }
    }
  }

  console.log('');

  // ═══════════════════════════════════════════════════════════════════════════
  // [ekkOS_LEARN_DETECT] Check for manual forge markers
  // ═══════════════════════════════════════════════════════════════════════════
  let forgeCount = 0;
  if (lastAssistant) {
    const forgeMatches = lastAssistant.matchAll(/\[ekkOS_LEARN\][^"]*"([^"]+)"/g);
    const forgeMarkers = [...forgeMatches];

    if (forgeMarkers.length > 0) {
      console.log(`${YELLOW}+${RESET} ${YELLOW}[[[[ｅｋｋＯＳ＿Ｌｅａｒｎ ｄｅｔｅｃｔ]]]]${RESET} ${DIM}found forge markers${RESET}`);

      for (const marker of forgeMarkers) {
        const patternTitle = marker[1];
        if (patternTitle) {
          console.log(`  ${GREEN}+${RESET} forging: "${patternTitle}"`);
          forgeCount++;

          // Send to forge endpoint (don't wait)
          httpRequest(`${MEMORY_API_URL}/api/v1/patterns`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }, {
            title: patternTitle,
            problem: (lastUser || '').substring(0, 500),
            solution: (lastAssistant || '').substring(0, 2000),
            tags: ['hook-detected', 'golden-loop', 'claude-code-node'],
            source: 'claude-code-hook-node',
            confidence: 0.85
          }).then(res => {
            if (res.pattern_id || res.id) {
              const pid = res.pattern_id || res.id;
              console.error(`  ${GREEN}✓${RESET} forged ${DIM}(ID: ${pid.substring(0, 8)}...)${RESET}`);
            }
          }).catch(() => {});
        }
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [ekkOS_CAPTURE] Send data to backend
  // ═══════════════════════════════════════════════════════════════════════════
  let captured = false;
  if (lastUser && lastAssistant) {
    console.log(`${CYAN}+${RESET} ${CYAN}[[[[ｅｋｋＯＳ＿Ｃａｐｔｕｒｅ]]]]${RESET} ${DIM}sending to memory substrate${RESET}`);

    const payload = {
      user_query: lastUser,
      assistant_response: lastAssistant,
      session_id: `claude-code-${sessionId}`,
      user_id: userId || 'system',
      patterns_retrieved: patternIds,
      patterns_applied: appliedPatternIds,
      metadata: {
        source: 'claude-code-node',
        model_used: modelUsed,
        patterns_retrieved_count: patternCount,
        patterns_applied_count: appliedPatternIds.length,
        task_id: taskId,
        captured_at: timestamp,
        auto_apply_detection: true,
        user_id: userId || 'system'
      }
    };

    const captureResponse = await httpRequest(`${MEMORY_API_URL}/api/v1/memory/capture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    }, payload);

    if (captureResponse.conversation_id) {
      const convId = captureResponse.conversation_id;
      console.log(`  ${GREEN}+${RESET} saved ${DIM}(ID: ${convId.substring(0, 8)}...)${RESET}`);
      console.log(`${BLUE}+${RESET} ${BLUE}[[[[ｅｋｋＯＳ＿Ａｎａｌｙｚｅ]]]]${RESET} ${DIM}queued for async processing${RESET}`);
      captured = true;
    } else {
      console.log(`  ${RED}-${RESET} failed to save`);
    }
  } else {
    console.log(`${DIM}-${RESET} ${DIM}[[[[ｅｋｋＯＳ＿Ｃａｐｔｕｒｅ]]]]${RESET} ${DIM}skipped (no content)${RESET}`);
  }

  // Cleanup state file
  state.clearPatterns(sessionId);

  // ═══════════════════════════════════════════════════════════════════════════
  // [ekkOS_REFLEX] Send turn_end event to trigger 3-Judge evaluation
  // ═══════════════════════════════════════════════════════════════════════════
  const REFLEX_API_URL = process.env.REFLEX_API_URL || 'https://mcp.ekkos.dev/api/v1/reflex/log';

  if (captured && lastUser && lastAssistant) {
    console.log(`${YELLOW}+${RESET} ${YELLOW}[[[[ｅｋｋＯＳ＿３-Ｊｕｄｇｅs]]]]${RESET} ${DIM}triggering consensus evaluation${RESET}`);

    // Send in background (don't wait)
    httpRequest(REFLEX_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    }, {
      action: 'turn_end',
      summary: `Claude Code session: ${(lastUser || '').substring(0, 100)}...`,
      details: {
        user_query: lastUser,
        assistant_response: (lastAssistant || '').substring(0, 2000),
        source: 'claude-code-node',
        model_used: modelUsed,
        patterns_retrieved: patternCount,
        patterns_applied: appliedPatternIds.length,
        session_id: `claude-code-${sessionId}`,
        timestamp: timestamp
      },
      learn: {
        lookups: patternCount,
        reuse: appliedPatternIds.length,
        saves: 0,
        abstain: 0
      },
      context: {
        source: 'claude-code-node',
        task_id: taskId
      }
    }).then(res => {
      if (res.id) {
        console.error(`  ${GREEN}+${RESET} event queued ${DIM}(ID: ${res.id.substring(0, 8)}...)${RESET}`);
      }
    }).catch(() => {});
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('');
  console.log(`${CYAN}${BOLD}[[[[ｅｋｋＯＳ＿Ｇｏｌｄｅｎ ｌｏｏｐ]]]]${RESET}`);
  console.log('');

  if (captured) {
    console.log(`  ${GREEN}+${RESET} capture: saved to substrate`);
    console.log(`  ${GREEN}+${RESET} 3-judge: consensus eval queued`);
  } else {
    console.log(`  ${DIM}-${RESET} capture: skipped (no content)`);
  }
  console.log(`  ${GREEN}+${RESET} patterns: ${patternCount} retrieved`);
  if (forgeCount > 0) {
    console.log(`  ${GREEN}+${RESET} forged: ${forgeCount} new patterns (from [ekkOS_LEARN] markers)`);
  }
  console.log(`  ${GREEN}+${RESET} analyze: async backend processing`);
  console.log('');

  // Small delay to let background requests complete
  await new Promise(resolve => setTimeout(resolve, 100));

  process.exit(0);
}

main().catch(() => process.exit(0));
