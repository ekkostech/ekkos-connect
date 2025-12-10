# Versioning Guide

This document describes the versioning process for the ekkOS Connect extension.

## Version Format

We follow [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes (incompatible API changes)
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

## Update Process

### 1. Update Version and Changelog

**Option A: Use the automated script (recommended)**

```bash
cd extensions/ekkos-connect
node update-version.mjs <version> "<change description>"
```

Example:

```bash
node update-version.mjs 1.3.3 "Fixed authentication timeout issue"
```

This will:

- Update `package.json` version
- Add a new entry to `CHANGELOG.md` with today's date
- Provide next steps

**Option B: Manual update**

1. Edit `package.json` and update the `version` field
2. Edit `CHANGELOG.md` and add a new entry following the format:

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added

- New feature description

### Changed

- Change description

### Fixed

- Bug fix description

### Removed

- Removed feature description
```

### 2. Categorize Changes

Edit the changelog entry and properly categorize changes:

- **Added**: New features
- **Changed**: Changes to existing functionality
- **Fixed**: Bug fixes
- **Removed**: Removed features
- **Security**: Security fixes

### 3. Build and Package

```bash
npm run compile
npx @vscode/vsce package --allow-missing-repository --no-dependencies
```

This creates `ekkos-connect-X.Y.Z.vsix`

### 4. Test the Package

Install the `.vsix` file locally to verify:

- Extension loads correctly
- New features work as expected
- No regressions

### 5. Publish

```bash
# Set your PAT
export VSCE_PAT="your-token"

# Publish
node publish-with-pat.mjs
```

## Changelog Format

The changelog follows [Keep a Changelog](https://keepachangelog.com/) format:

- Each version has a date
- Changes are grouped by type (Added/Changed/Fixed/Removed)
- Most recent version is at the top
- Use clear, user-friendly descriptions

## Examples

### Patch Release (1.3.1 → 1.3.2)

```bash
node update-version.mjs 1.3.2 "Fixed stats API endpoint URL"
```

### Minor Release (1.3.2 → 1.4.0)

```bash
node update-version.mjs 1.4.0 "Added dark mode support"
```

### Major Release (1.4.0 → 2.0.0)

```bash
node update-version.mjs 2.0.0 "Breaking: Changed authentication API"
```

## Checklist

Before publishing:

- [ ] Version updated in `package.json`
- [ ] Changelog entry added with proper categorization
- [ ] README.md version reference updated (if needed)
- [ ] Extension compiles without errors
- [ ] `.vsix` package created successfully
- [ ] Tested locally in VS Code/Cursor
- [ ] All changes documented in changelog

## Notes

- Always update the changelog when changing the version
- Keep changelog entries clear and user-focused
- Test thoroughly before publishing
- Consider backward compatibility when making changes

