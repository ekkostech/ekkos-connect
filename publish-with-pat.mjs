#!/usr/bin/env node

/**
 * Programmatic VS Code Marketplace Publisher
 * Uses Azure DevOps PAT to publish extension
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';

const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));

console.log('🚀 Publishing ekkos-connect to VS Code Marketplace');
console.log('==================================================\n');

// Get PAT from environment or prompt
const PAT = process.env.VSCE_PAT || process.env.AZURE_DEVOPS_PAT;

if (!PAT) {
  console.error('❌ Error: Personal Access Token not found');
  console.error('\nPlease set one of these environment variables:');
  console.error('  export VSCE_PAT="your-token-here"');
  console.error('  export AZURE_DEVOPS_PAT="your-token-here"');
  console.error('\nOr run: VSCE_PAT="your-token" node publish-with-pat.mjs');
  process.exit(1);
}

console.log(`📦 Extension: ${packageJson.displayName}`);
console.log(`   Version: ${packageJson.version}`);
console.log(`   Publisher: ${packageJson.publisher}`);
console.log('');

// Check if changelog exists and has entry for this version
try {
  const changelog = readFileSync('./CHANGELOG.md', 'utf8');
  const versionEntry = new RegExp(`## \\[${packageJson.version.replace(/\./g, '\\.')}\\]`);
  if (!versionEntry.test(changelog)) {
    console.warn('⚠️  Warning: CHANGELOG.md does not have an entry for version', packageJson.version);
    console.warn('   Consider updating the changelog before publishing.\n');
  } else {
    console.log('✅ CHANGELOG.md has entry for this version\n');
  }
} catch (error) {
  console.warn('⚠️  Warning: Could not read CHANGELOG.md\n');
}

// Verify build
console.log('🔨 Verifying build...');
try {
  execSync('npm run compile', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Compilation failed');
  process.exit(1);
}

// Verify icon
try {
  require('fs').accessSync('./resources/icon.png');
} catch (error) {
  console.error('❌ Error: icon.png not found');
  process.exit(1);
}

// Publish
console.log('\n🚀 Publishing to marketplace...');
try {
  execSync(`npx @vscode/vsce publish --pat "${PAT}"`, {
    stdio: 'inherit',
    env: { ...process.env, VSCE_PAT: PAT }
  });
  
  console.log('\n✅ Extension published successfully!');
  console.log('\n📋 Next steps:');
  console.log('   1. Verify: https://marketplace.visualstudio.com/manage');
  console.log('   2. Extension URL: https://marketplace.visualstudio.com/items?itemName=ekkostech.ekkos-connect');
  console.log('   3. Test: ext install ekkostech.ekkos-connect');
} catch (error) {
  console.error('\n❌ Publication failed');
  console.error('   Check your PAT permissions and version number');
  process.exit(1);
}































