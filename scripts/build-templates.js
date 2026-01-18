#!/usr/bin/env node
/**
 * Cross-platform script to handle templates for packaging
 * Works on Windows, macOS, and Linux
 */

const fs = require('fs');
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const ROOT_TEMPLATES = path.join(__dirname, '..', '..', '..', 'templates');

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    console.error(`Source not found: ${src}`);
    process.exit(1);
  }

  const stat = fs.lstatSync(src);

  if (stat.isSymbolicLink()) {
    // Follow symlink and copy actual content
    const realPath = fs.realpathSync(src);
    copyRecursive(realPath, dest);
  } else if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src);
    for (const entry of entries) {
      copyRecursive(path.join(src, entry), path.join(dest, entry));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

function removeRecursive(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function createSymlink(target, linkPath) {
  // On Windows, use junction for directories (doesn't require admin)
  const type = process.platform === 'win32' ? 'junction' : 'dir';
  try {
    fs.symlinkSync(target, linkPath, type);
  } catch (err) {
    console.error(`Failed to create symlink: ${err.message}`);
    // Fallback: copy instead
    console.log('Falling back to copy...');
    copyRecursive(path.resolve(path.dirname(linkPath), target), linkPath);
  }
}

const action = process.argv[2];

switch (action) {
  case 'prepackage':
    console.log('Preparing templates for packaging...');
    removeRecursive(TEMPLATES_DIR);
    copyRecursive(ROOT_TEMPLATES, TEMPLATES_DIR);
    console.log('Templates copied successfully');
    break;

  case 'postpackage':
    console.log('Restoring templates symlink...');
    removeRecursive(TEMPLATES_DIR);
    createSymlink('../../templates', TEMPLATES_DIR);
    console.log('Symlink restored');
    break;

  default:
    console.error('Usage: build-templates.js [prepackage|postpackage]');
    process.exit(1);
}
