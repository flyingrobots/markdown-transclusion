# Release Process

This document describes the release process for the markdown-transclusion project.

## Overview

The project uses a semi-automated release workflow with protected main branch and GitHub Actions automation:

- **Protected main branch**: Direct pushes are disabled; all changes must go through pull requests
- **Automated CI**: Every PR triggers comprehensive testing across multiple Node.js versions
- **Automated releases**: Git tags trigger automated npm publishing and GitHub release creation

## Prerequisites

- Maintainer access to the repository
- npm account with publish permissions (for manual releases)
- Clean working directory (`git status` shows no changes)

## Release Workflow

### 1. Create Release Branch

```bash
# Ensure you're on main with latest changes
git checkout main
git pull origin main

# Create release branch
git checkout -b release/v1.2.3
```

### 2. Update Version

```bash
# This will update package.json and create a git commit
npm version patch  # or minor/major

# The preversion script ensures:
# - Working directory is clean
# - You're on main or release/* branch
```

### 3. Push Release Branch and Open PR

```bash
# Push the release branch
git push -u origin release/v1.2.3

# Open a PR from release/v1.2.3 to main
# The PR will trigger CI checks automatically
```

### 4. Merge PR (After CI Passes)

Once all CI checks pass:
- Review and approve the PR
- Merge the PR into main

### 5. Create and Push Tag

```bash
# Switch to main and pull the merged changes
git checkout main
git pull origin main

# Create and push the version tag
git tag v1.2.3
git push origin v1.2.3
```

### 6. Automated Release Process

When the tag is pushed, GitHub Actions automatically:

1. **Runs the release workflow** (`.github/workflows/release.yml`):
   - Checks out code
   - Sets up Node.js 20
   - Installs dependencies (`npm ci`)
   - Builds the project (`npm run build`)
   - Runs tests (`npm test`)
   - Publishes to npm (`npm publish`)
   - Creates GitHub release with auto-generated release notes

2. **Required secrets**:
   - `NPM_TOKEN`: npm authentication token for publishing

## What Happens Automatically

### On Every Push/PR to main:
- **CI workflow** (`.github/workflows/ci.yml`):
  - Tests on Node.js 20.x and 22.x
  - Runs linter (`npm run lint`)
  - Runs unit tests with coverage
  - Runs TypeScript type checking
  - Runs integration tests
  - Uploads coverage to Codecov

### On Tag Push (v*):
- **Release workflow** (`.github/workflows/release.yml`):
  - Builds and tests the project
  - Publishes to npm registry
  - Creates GitHub release with changelog

## Manual Release (If Needed)

If automation fails, you can release manually:

```bash
# Ensure you're on the tagged commit
git checkout v1.2.3

# Clean build
npm run clean
npm run build

# Run tests
npm test

# Publish to npm
npm publish

# Create GitHub release manually through the web interface
```

## Version Naming Convention

Follow semantic versioning:
- **MAJOR** (v2.0.0): Breaking changes
- **MINOR** (v1.3.0): New features, backward compatible
- **PATCH** (v1.2.1): Bug fixes, backward compatible

## Troubleshooting

### CI Failures
- Check the failing job logs in GitHub Actions
- Common issues:
  - Linting errors: Run `npm run lint:fix` locally
  - Test failures: Run `npm test` locally
  - Type errors: Run `npm run type-check` locally

### Release Failures
- Check GitHub Actions logs for the release workflow
- Verify `NPM_TOKEN` secret is valid
- Ensure version number doesn't already exist on npm

### Protected Branch Issues
- Ensure you have proper permissions
- Always work through PRs, never force push to main
- Contact repository admin if you need emergency access