# Extension Manager Quick Start

**Get your extension published in minutes with autonomous agent assistance.**

## TL;DR

```bash
# 1. Make your changes to templates
# 2. Run validation
./scripts/pre-publish-check.sh

# 3. If checks pass, invoke agent
claude-code --prompt "Extension Manager: publish patch release v2.10.19 with template fixes"

# 4. Agent handles the rest (build, publish, tag, release)
```

## When to Use the Extension Manager

Use the agent whenever you:
- Update templates (CLAUDE.md, hooks, skills)
- Fix bugs in the extension
- Add new features
- Need to publish to marketplace
- Want to ensure everything is wired correctly

## Agent Invocation Methods

### Method 1: Via Claude Code (Recommended)

```bash
# Simple task
claude-code --prompt "Extension Manager: validate templates and report issues"

# Full publish flow
claude-code --prompt "Extension Manager: publish patch release v2.10.19 with footer format fixes"

# Dry run (no actual publish)
claude-code --prompt "Extension Manager: dry-run publish check for v2.10.19"
```

### Method 2: Via Task Tool in Session

During a Claude Code session:

```
I need you to use the Task tool to invoke an extension management agent.

Task: Validate and publish extension
Description: Update extension manager
Prompt: We fixed the footer format in templates/CLAUDE.md. Please:
1. Verify the fix is consistent across all template locations
2. Bump version to 2.10.19 (patch release)
3. Update CHANGELOG.md with the fix
4. Run all validation checks
5. Build VSIX
6. If all checks pass, publish to marketplace
7. Create GitHub release with tag v2.10.19
8. Forge a pattern about this fix

Use subagent_type: "general-purpose" with full Bash access.
```

### Method 3: Manual with Scripts

If you prefer manual control:

```bash
# Step 1: Validate templates
./scripts/validate-templates.sh

# Step 2: Pre-publish checks
./scripts/pre-publish-check.sh

# Step 3: Build VSIX
npm run package

# Step 4: Publish
npx @vscode/vsce publish --pat $VSCE_PAT

# Step 5: Tag release
git tag v2.10.19
git push --tags
```

## Common Scenarios

### Scenario 1: Template Update Only

**Situation**: You fixed footer format in `templates/CLAUDE.md`

**Agent Command**:
```bash
claude-code --prompt "Extension Manager: templates were updated. Verify all templates are consistent, update CHANGELOG, and prepare for patch release."
```

**What Agent Does**:
1. Runs `validate-templates.sh`
2. Checks for inconsistencies across template files
3. Updates CHANGELOG.md
4. Suggests version bump
5. Reports results

### Scenario 2: Publish Patch Release

**Situation**: Bug fixes ready, need to publish quickly

**Agent Command**:
```bash
claude-code --prompt "Extension Manager: publish patch release v2.10.19. Run all validation checks, build VSIX, publish to marketplace, and create GitHub release."
```

**What Agent Does**:
1. Runs `pre-publish-check.sh`
2. If pass: builds VSIX with `npm run package`
3. Publishes with `vsce publish`
4. Creates git tag `v2.10.19`
5. Creates GitHub release
6. Forges pattern about the release

### Scenario 3: Major Version Release

**Situation**: Breaking changes, new major version

**Agent Command**:
```bash
claude-code --prompt "Extension Manager: publish major version v3.0.0. Breaking changes: removed legacy MCP support. Update README, CHANGELOG, run full validation, and publish."
```

**What Agent Does**:
1. Validates breaking changes are documented
2. Updates README.md with migration guide
3. Updates CHANGELOG.md
4. Runs full pre-publish checks
5. Builds and publishes
6. Creates comprehensive release notes
7. Posts announcement (optional)

### Scenario 4: Pre-Publish Validation Only

**Situation**: Want to check everything before committing to publish

**Agent Command**:
```bash
claude-code --prompt "Extension Manager: dry-run pre-publish check. Report all issues but don't publish anything."
```

**What Agent Does**:
1. Runs all validation scripts
2. Checks git status
3. Verifies CHANGELOG and README
4. Simulates VSIX build
5. Reports detailed status
6. Suggests fixes for any issues

## Validation Scripts Reference

### `validate-templates.sh`

Checks:
- ✅ Footer format in CLAUDE.md
- ✅ Hook script syntax (bash -n)
- ✅ Skills present and valid
- ✅ No hardcoded credentials
- ✅ Windows compatibility
- ✅ Template variables documented
- ✅ Required files present

**Usage**:
```bash
./scripts/validate-templates.sh
```

**Exit codes**:
- `0`: All checks passed
- `1`: Errors found (blocks publish)

### `pre-publish-check.sh`

Checks:
- ✅ Template validation (calls validate-templates.sh)
- ✅ TypeScript compilation
- ✅ Linting
- ✅ package.json validity
- ✅ CHANGELOG updated
- ✅ README current
- ✅ Git status clean
- ✅ Version tag available
- ✅ Dependencies installed
- ✅ Publishing credentials (VSCE_PAT)

**Usage**:
```bash
./scripts/pre-publish-check.sh
```

**Exit codes**:
- `0`: Ready to publish
- `1`: Errors found (blocks publish)

## Environment Setup

### Required Environment Variables

```bash
# For publishing
export VSCE_PAT="your-azure-devops-personal-access-token"

# For GitHub releases
export GITHUB_TOKEN="your-github-token"

# Optional: Auto-confirmation
export EKKOS_EXTENSION_AUTO_PUBLISH="true"  # Skip confirmation prompts
```

### Get Your PAT

1. Go to https://dev.azure.com
2. Click User Settings → Personal Access Tokens
3. Create new token with "Marketplace (Manage)" scope
4. Copy token and set as `VSCE_PAT`

## Agent Capabilities

The Extension Manager agent has these tools:

| Tool | What It Does |
|------|--------------|
| `Bash` | Runs npm scripts, git commands, validation scripts |
| `Read/Write/Edit` | Updates templates, package.json, CHANGELOG |
| `Glob/Grep` | Finds files, searches for patterns |
| `WebFetch` | Checks marketplace status |
| `ekkOS_Forge` | Saves patterns about what worked/failed |
| `ekkOS_Search` | Recalls previous publishing issues |

## Example Full Workflow

Let's say you just fixed the Windows footer format issue:

```bash
# 1. Verify your changes
git status
# Shows: templates/CLAUDE.md modified

# 2. Run validation locally
./scripts/validate-templates.sh
# Output: ✓ ALL CHECKS PASSED

# 3. Invoke agent for full publish
claude-code --prompt "
Extension Manager: We fixed the footer format for Windows users.

Changes:
- Updated templates/CLAUDE.md with complete footer format
- Added {IDE}, {Model}, Turn {N}, Timestamp
- Added detection instructions

Please:
1. Verify fix is in all template locations
2. Bump version to 2.10.19 (patch)
3. Update CHANGELOG with 'Fixed: Footer format for Windows users'
4. Run all pre-publish checks
5. Build VSIX
6. If checks pass, publish to marketplace
7. Create GitHub release v2.10.19
8. Forge pattern: 'Windows footer format fix and publish'
"

# 4. Agent executes and reports
# ✓ Templates validated
# ✓ Version bumped to 2.10.19
# ✓ CHANGELOG updated
# ✓ Pre-publish checks passed
# ✓ VSIX built: ekkos-connect-2.10.19.vsix
# ✓ Published to marketplace
# ✓ GitHub release created
# ✓ Pattern forged: b4e95be9-e074-48d9-8db9-3ed89a91e044

# 5. Done! Extension live in ~5 minutes
```

## Troubleshooting

### Agent Can't Find Scripts

**Problem**: "validate-templates.sh: not found"

**Solution**:
```bash
# Make scripts executable
chmod +x scripts/*.sh

# Verify path
ls -la scripts/
```

### Publish Fails with 401

**Problem**: "Error: unauthorized"

**Solution**:
```bash
# Check PAT is set
echo $VSCE_PAT

# If empty, set it
export VSCE_PAT="your-pat-here"

# Test login
npx @vscode/vsce login ekkos
```

### Version Already Published

**Problem**: "Error: version 2.10.19 already published"

**Solution**:
```bash
# Bump to next patch version
# Agent should automatically detect and suggest v2.10.20
```

### Template Validation Fails

**Problem**: "✗ FAIL: Footer format is outdated"

**Solution**:
```bash
# Check what's wrong
./scripts/validate-templates.sh

# Fix the template
# Agent can help with:
claude-code --prompt "Extension Manager: validate-templates.sh failed. Show me what's wrong and suggest fix."
```

## Next Steps

1. **Test the agent**: Start with a dry-run to see what it does
2. **Customize validation**: Add project-specific checks to scripts
3. **Automate CI/CD**: Run validation scripts in GitHub Actions
4. **Build patterns**: Let agent forge patterns about releases
5. **Share knowledge**: Patterns help future releases go faster

## Support

- **Agent Issues**: Report at [github.com/ekkostech/ekkos-connect/issues](https://github.com/ekkostech/ekkos-connect/issues)
- **Publishing Help**: See [PUBLISHING_GUIDE.md](../PUBLISHING_GUIDE.md)
- **Template Docs**: See [templates/README.md](../templates/README.md)

---

**Built for ekkOS™** - Making extension management autonomous and error-free
