#!/usr/bin/env node
/**
 * ekkOS™ Hook State Management Library (Node.js - Cross-Platform)
 * Shared state functions for coordinating between hooks
 * Works on Windows, macOS, and Linux without bash/curl/jq dependencies
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Get project root (where .claude directory lives)
function getProjectRoot() {
  const scriptDir = __dirname;
  return path.dirname(path.dirname(path.dirname(scriptDir)));
}

const PROJECT_ROOT = getProjectRoot();
const STATE_DIR = path.join(PROJECT_ROOT, '.claude', 'state');

// Ensure state directory exists
function ensureStateDir() {
  if (!fs.existsSync(STATE_DIR)) {
    fs.mkdirSync(STATE_DIR, { recursive: true });
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// State File Management
// ═══════════════════════════════════════════════════════════════════════════

function savePatterns(sessionId, patterns, modelUsed) {
  ensureStateDir();
  const stateFile = path.join(STATE_DIR, `patterns-${sessionId}.json`);

  const data = {
    patterns: patterns,
    model_used: modelUsed,
    saved_at: new Date().toISOString()
  };

  fs.writeFileSync(stateFile, JSON.stringify(data, null, 2));
}

function loadPatterns(sessionId) {
  const stateFile = path.join(STATE_DIR, `patterns-${sessionId}.json`);

  if (fs.existsSync(stateFile)) {
    try {
      return JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    } catch {
      return {};
    }
  }
  return {};
}

function clearPatterns(sessionId) {
  const stateFile = path.join(STATE_DIR, `patterns-${sessionId}.json`);
  if (fs.existsSync(stateFile)) {
    fs.unlinkSync(stateFile);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Capture Deduplication
// ═══════════════════════════════════════════════════════════════════════════

function generateTurnHash(userQuery, assistantResponse) {
  return crypto.createHash('md5').update(`${userQuery}${assistantResponse}`).digest('hex');
}

function wasTurnCaptured(sessionId, turnHash) {
  const captureLog = path.join(STATE_DIR, `captures-${sessionId}.log`);

  if (fs.existsSync(captureLog)) {
    const hashes = fs.readFileSync(captureLog, 'utf8').split('\n');
    return hashes.includes(turnHash);
  }
  return false;
}

function markTurnCaptured(sessionId, turnHash) {
  ensureStateDir();
  const captureLog = path.join(STATE_DIR, `captures-${sessionId}.log`);

  fs.appendFileSync(captureLog, `${turnHash}\n`);

  // Keep only last 100 hashes
  try {
    const hashes = fs.readFileSync(captureLog, 'utf8').split('\n').filter(Boolean);
    if (hashes.length > 100) {
      fs.writeFileSync(captureLog, hashes.slice(-100).join('\n') + '\n');
    }
  } catch {
    // Ignore cleanup errors
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Lock Management
// ═══════════════════════════════════════════════════════════════════════════

function acquireLock(sessionId) {
  ensureStateDir();
  const lockFile = path.join(STATE_DIR, `lock-${sessionId}.lock`);
  const timeout = 5000; // 5 seconds
  const startTime = Date.now();

  while (fs.existsSync(lockFile)) {
    if (Date.now() - startTime > timeout) {
      // Check if lock is stale (older than 10 seconds)
      try {
        const stat = fs.statSync(lockFile);
        if (Date.now() - stat.mtimeMs > 10000) {
          fs.unlinkSync(lockFile);
          break;
        }
      } catch {
        break;
      }
      return false;
    }
    // Wait 100ms
    const waitUntil = Date.now() + 100;
    while (Date.now() < waitUntil) {}
  }

  fs.writeFileSync(lockFile, process.pid.toString());
  return true;
}

function releaseLock(sessionId) {
  const lockFile = path.join(STATE_DIR, `lock-${sessionId}.lock`);

  try {
    const content = fs.readFileSync(lockFile, 'utf8');
    if (content.trim() === process.pid.toString()) {
      fs.unlinkSync(lockFile);
    }
  } catch {
    // Lock file doesn't exist or can't be read
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Cleanup
// ═══════════════════════════════════════════════════════════════════════════

function cleanupOldState() {
  if (!fs.existsSync(STATE_DIR)) return;

  const now = Date.now();
  const oneDayMs = 24 * 60 * 60 * 1000;

  try {
    const files = fs.readdirSync(STATE_DIR);
    for (const file of files) {
      const filePath = path.join(STATE_DIR, file);
      try {
        const stat = fs.statSync(filePath);
        if (now - stat.mtimeMs > oneDayMs) {
          fs.unlinkSync(filePath);
        }
      } catch {
        // Ignore file errors
      }
    }
  } catch {
    // Ignore directory errors
  }
}

module.exports = {
  PROJECT_ROOT,
  STATE_DIR,
  ensureStateDir,
  savePatterns,
  loadPatterns,
  clearPatterns,
  generateTurnHash,
  wasTurnCaptured,
  markTurnCaptured,
  acquireLock,
  releaseLock,
  cleanupOldState
};
