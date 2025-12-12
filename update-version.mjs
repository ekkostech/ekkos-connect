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

function normalizeRepoUrl(repository) {
  const raw =
    typeof repository === 'string'
      ? repository
      : repository && typeof repository === 'object'
        ? repository.url
        : undefined;

  if (!raw || typeof raw !== 'string') return undefined;

  let url = raw.trim();
  url = url.replace(/^git\+/, '').replace(/\.git$/, '');

  // Common GitHub SSH forms → https
  if (url.startsWith('git@github.com:')) {
    url = `https://github.com/${url.slice('git@github.com:'.length)}`;
  } else if (url.startsWith('ssh://git@github.com/')) {
    url = `https://github.com/${url.slice('ssh://git@github.com/'.length)}`;
  }

  return url;
}

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function upsertLinkRef(changelog, label, url) {
  const pattern = new RegExp(`^\\[${escapeRegExp(label)}\\]:\\s+.*$`, 'm');
  const line = `[${label}]: ${url}`;

  if (pattern.test(changelog)) {
    return changelog.replace(pattern, line);
  }

  const needsLeadingNewline = !changelog.endsWith('\n');
  const needsBlankLine = !/\n\n$/.test(changelog);
  return (
    changelog +
    (needsLeadingNewline ? '\n' : '') +
    (needsBlankLine ? '\n' : '') +
    line +
    '\n'
  );
}

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

  // Insert new entry after "Unreleased" (Keep a Changelog convention),
  // falling back to inserting before the first version entry.
  const unreleasedHeader = '## [Unreleased]';
  const unreleasedIndex = changelog.indexOf(unreleasedHeader);
  let insertIndex = -1;

  if (unreleasedIndex !== -1) {
    const afterUnreleased = changelog.indexOf('\n## [', unreleasedIndex + unreleasedHeader.length);
    insertIndex = afterUnreleased === -1 ? changelog.length : afterUnreleased + 1; // +1 keeps the leading '\n'
  } else {
    insertIndex = changelog.indexOf('## [');
  }

  if (insertIndex === -1) {
    console.error('❌ Error: Could not find changelog insertion point');
    process.exit(1);
  }

  changelog = changelog.slice(0, insertIndex) + newEntry + changelog.slice(insertIndex);

  // Update link references (compare links) if repository URL is known
  const repoUrl = normalizeRepoUrl(packageJson.repository) ?? 'https://github.com/ekkostech/ekkos-connect';
  const cleanRepoUrl = repoUrl.replace(/\/$/, '');

  changelog = upsertLinkRef(changelog, 'Unreleased', `${cleanRepoUrl}/compare/v${version}...HEAD`);
  changelog = upsertLinkRef(
    changelog,
    version,
    `${cleanRepoUrl}/compare/v${oldVersion}...v${version}`
  );

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

