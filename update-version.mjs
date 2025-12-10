#!/usr/bin/env node
/**
 * Update Extension Version and Changelog
 * 
 * Usage:
 *   node update-version.mjs <version> <change-description>
 * 
 * Example:
 *   node update-version.mjs 1.3.3 "Fixed authentication bug"
 */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT = __dirname;
const PACKAGE_JSON = join(ROOT, 'package.json');
const CHANGELOG = join(ROOT, 'CHANGELOG.md');

const [,, version, ...changeParts] = process.argv;
const changeDescription = changeParts.join(' ');

if (!version) {
  console.error('❌ Error: Version required');
  console.log('\nUsage: node update-version.mjs <version> <change-description>');
  console.log('Example: node update-version.mjs 1.3.3 "Fixed authentication bug"');
  process.exit(1);
}

if (!changeDescription) {
  console.error('❌ Error: Change description required');
  console.log('\nUsage: node update-version.mjs <version> <change-description>');
  console.log('Example: node update-version.mjs 1.3.3 "Fixed authentication bug"');
  process.exit(1);
}

// Validate version format (semver)
const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?$/;
if (!semverRegex.test(version)) {
  console.error(`❌ Error: Invalid version format: ${version}`);
  console.log('Expected format: X.Y.Z or X.Y.Z-prerelease');
  process.exit(1);
}

try {
  // Read package.json
  const packageJson = JSON.parse(readFileSync(PACKAGE_JSON, 'utf8'));
  const oldVersion = packageJson.version;
  
  // Update version
  packageJson.version = version;
  writeFileSync(PACKAGE_JSON, JSON.stringify(packageJson, null, 2) + '\n');
  console.log(`✅ Updated package.json: ${oldVersion} → ${version}`);

  // Read changelog
  let changelog = readFileSync(CHANGELOG, 'utf8');
  
  // Get current date
  const today = new Date().toISOString().split('T')[0];
  
  // Create new changelog entry
  const newEntry = `## [${version}] - ${today}

### Changed
- ${changeDescription}

`;

  // Insert after "# Changelog" header (before first version entry)
  const headerIndex = changelog.indexOf('## [');
  if (headerIndex === -1) {
    console.error('❌ Error: Could not find changelog version entries');
    process.exit(1);
  }

  // Insert new entry
  changelog = changelog.slice(0, headerIndex) + newEntry + changelog.slice(headerIndex);
  writeFileSync(CHANGELOG, changelog);
  console.log(`✅ Updated CHANGELOG.md with version ${version}`);

  console.log(`\n📦 Next steps:`);
  console.log(`   1. Review CHANGELOG.md and categorize changes (Added/Changed/Fixed/Removed)`);
  console.log(`   2. Run: npm run compile`);
  console.log(`   3. Run: npx @vscode/vsce package --allow-missing-repository --no-dependencies`);
  console.log(`   4. Test the .vsix file`);
  console.log(`   5. Publish: node publish-with-pat.mjs\n`);

} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

