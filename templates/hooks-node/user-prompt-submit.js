#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ekkOS_ Hook: UserPromptSubmit (Claude Code) - CAPTURE + RETRIEVE + INJECT
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
const MAGENTA = '\x1b[0;35m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

// ═══════════════════════════════════════════════════════════════════════════
// HTTP Request Helper (uses built-in https module)
// ═══════════════════════════════════════════════════════════════════════════
function httpRequest(url, options, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const lib = urlObj.protocol === 'https:' ? https : http;
    const timeout = options.timeout || 2000;

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
// Load Auth Token - PORTABLE: Check 3 sources in priority order
// ═══════════════════════════════════════════════════════════════════════════
function loadAuthToken() {
  const homeDir = os.homedir();
  const ekkosConfig = path.join(homeDir, '.ekkos', 'config.json');
  let authToken = '';
  let userId = '';

  // 1. First try ~/.ekkos/config.json (set by VS Code extension - most portable)
  if (fs.existsSync(ekkosConfig)) {
    try {
      const config = JSON.parse(fs.readFileSync(ekkosConfig, 'utf8'));
      authToken = config.apiKey || '';
      userId = config.userId || '';
    } catch {}
  }

  // 2. Then try project .env.local (for developers with service role key)
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

  const userQuery = input.query || input.message || input.prompt || '';
  const sessionId = input.session_id || 'unknown';
  const modelInfo = input.model || 'claude-sonnet-4-5';
  const transcriptPath = input.transcript_path || '';

  // Skip if empty
  if (!userQuery) {
    process.exit(0);
  }

  // Load auth
  const { authToken, userId } = loadAuthToken();
  const MEMORY_API_URL = 'https://mcp.ekkos.dev';

  // Get current timestamp
  const now = new Date();
  const currentTime = now.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short'
  });

  // Visual header
  console.log('');
  console.log(`${CYAN}${BOLD}🧠 ekkOS Memory${RESET} ${DIM}| Claude Code (${modelInfo}) | ${currentTime}${RESET}`);

  // ═══════════════════════════════════════════════════════════════════════════
  // [ekkOS_CAPTURE] Capture the PREVIOUS exchange before processing new one
  // ═══════════════════════════════════════════════════════════════════════════
  if (state.acquireLock(sessionId)) {
    if (transcriptPath && fs.existsSync(transcriptPath)) {
      try {
        const transcriptContent = fs.readFileSync(transcriptPath, 'utf8');
        const lines = transcriptContent.split('\n').filter(Boolean).map(l => {
          try { return JSON.parse(l); } catch { return null; }
        }).filter(Boolean);

        // Get human messages
        const humanMsgs = lines.filter(l => l.type === 'human');
        const assistantMsgs = lines.filter(l => l.type === 'assistant');

        // Get second-to-last human message (the previous query, not current)
        const prevUser = humanMsgs.length > 1 ? humanMsgs[humanMsgs.length - 2]?.message : null;

        // Get last assistant response
        const lastAssistant = assistantMsgs[assistantMsgs.length - 1];
        let prevAssistant = '';
        if (lastAssistant?.message?.content) {
          if (Array.isArray(lastAssistant.message.content)) {
            prevAssistant = lastAssistant.message.content
              .filter(c => c.type === 'text')
              .map(c => c.text)
              .join(' ');
          } else {
            prevAssistant = lastAssistant.message.content;
          }
        }

        // Capture if we have both
        if (prevUser && prevAssistant) {
          const prevHash = state.generateTurnHash(prevUser, prevAssistant);

          if (!state.wasTurnCaptured(sessionId, prevHash)) {
            // Capture in background (don't wait)
            httpRequest(`${MEMORY_API_URL}/api/v1/memory/capture`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
              },
              timeout: 5000
            }, {
              user_query: prevUser,
              assistant_response: prevAssistant,
              session_id: `claude-code-${sessionId}`,
              metadata: {
                source: 'claude-code-hook-node',
                model_used: modelInfo,
                captured_at: new Date().toISOString()
              }
            }).catch(() => {});

            state.markTurnCaptured(sessionId, prevHash);
            console.log(`${CYAN}   💾 Capture${RESET} ${DIM}saving previous turn${RESET}`);
          }
        }
      } catch {}
    }
    state.releaseLock(sessionId);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [ekkOS_RETRIEVE] Single API call - backend handles ALL the work
  // ═══════════════════════════════════════════════════════════════════════════
  console.log(`${MAGENTA}   🔍 Retrieve${RESET} ${DIM}searching memory substrate...${RESET}`);

  let apiResponse;
  if (!authToken) {
    console.log(`${DIM}   ⚠️  Retrieve${RESET} ${DIM}skipped (no auth)${RESET}`);
    apiResponse = { error: 'no_auth', formatted_context: '', layers: { patterns: [], directives: [] } };
  } else {
    apiResponse = await httpRequest(`${MEMORY_API_URL}/api/v1/context/retrieve`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 1500
    }, {
      query: userQuery,
      user_id: userId || 'system',
      session_id: `claude-code-${sessionId}`,
      max_per_layer: 5,
      include_layers: ['working', 'episodic', 'semantic', 'patterns', 'procedural', 'collective', 'codebase', 'directives'],
      metadata: {
        source: 'claude-code-node',
        model_used: modelInfo
      }
    });

    if (!apiResponse.layers) {
      apiResponse = { error: 'timeout', formatted_context: '', layers: { patterns: [], directives: [] } };
    }
  }

  // Extract counts
  const layers = apiResponse.layers || {};
  const patternCount = (layers.patterns || []).length;
  const directiveCount = (layers.directives || []).length;
  const episodicCount = (layers.episodic || []).length;
  const proceduralCount = (layers.procedural || []).length;
  const codebaseCount = (layers.codebase || []).length;
  const totalCount = patternCount + directiveCount + episodicCount + proceduralCount + codebaseCount;

  // ═══════════════════════════════════════════════════════════════════════════
  // [ekkOS_INJECT] Output the formatted context
  // ═══════════════════════════════════════════════════════════════════════════
  if (totalCount > 0) {
    console.log(`${GREEN}   ✨ Inject${RESET}  ${GREEN}${totalCount}${RESET} ${DIM}memories loaded (${patternCount} patterns, ${directiveCount} directives)${RESET}`);
    console.log('');

    const formatted = apiResponse.formatted_context;
    if (formatted) {
      console.log(formatted);
    } else {
      // Fallback: structured output
      if (patternCount > 0) {
        console.log('## Pattern Memory (Layer 4) - Directive Compliant');
        console.log('Proven solutions:');
        for (const p of layers.patterns.slice(0, 5)) {
          console.log(`${p.title || 'Untitled'}`);
          console.log(`   Problem: ${(p.problem || 'N/A').substring(0, 200)}`);
          console.log(`   Solution: ${(p.solution || 'N/A').substring(0, 300)}`);
          console.log(`   Success Rate: ${p.success_rate || 0}%`);
          console.log('');
        }
      }

      if (directiveCount > 0) {
        console.log('## Directive Memory (Layer 9) - HIGHEST PRIORITY');
        console.log('User rules that MUST be followed:');
        for (const d of layers.directives.slice(0, 5)) {
          console.log(`   [${d.type || 'PREFER'}] ${d.rule || d.content || 'No rule'}`);
        }
        console.log('');
      }

      if (proceduralCount > 0) {
        console.log('## Procedural Memory (Layer 5)');
        console.log('Multi-step workflows:');
        for (const p of layers.procedural.slice(0, 3)) {
          console.log(`   • ${p.title || p.name || 'Workflow'}`);
        }
        console.log('');
      }

      if (episodicCount > 0) {
        console.log('## Episodic Memory (Layer 2)');
        console.log('Similar past conversations:');
        for (const e of layers.episodic.slice(0, 3)) {
          console.log(`   • ${(e.query_preview || e.problem || 'Previous session').substring(0, 100)}...`);
        }
        console.log('');
      }

      if (codebaseCount > 0) {
        console.log('## Codebase Memory (Layer 8)');
        console.log('Project-specific knowledge:');
        for (const c of layers.codebase.slice(0, 3)) {
          console.log(`   • ${c.file_path || c.title || 'Code pattern'}`);
        }
        console.log('');
      }
    }
  } else {
    console.log(`${DIM}   📭 Inject${RESET}  ${DIM}no matching patterns found${RESET}`);
    console.log('');
  }

  // Save patterns for stop.js
  state.savePatterns(sessionId, layers.patterns || [], modelInfo);

  process.exit(0);
}

main().catch(() => process.exit(0));
