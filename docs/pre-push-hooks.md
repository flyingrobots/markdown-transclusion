# Pre-Push Git Hooks

This project uses a comprehensive pre-push hook that ensures code quality and compatibility across all supported Node.js versions before pushing to the remote repository.

## What the Pre-Push Hook Does

The pre-push hook runs the following checks using Docker to match the CI environment exactly:

1. **ESLint** - Code style and quality checks
2. **TypeScript Type Checking** - Ensures type safety
3. **Tests on Node.js 18.x** - Compatibility with Node 18 LTS
4. **Tests on Node.js 20.x** - Compatibility with Node 20 LTS  
5. **Tests on Node.js 22.x** - Compatibility with Node 22 Current

## Benefits

- **Catches issues early** - Before they reach CI/CD
- **Environment consistency** - Uses exact same Node versions as CI
- **Prevents broken builds** - All checks must pass before push
- **No "works on my machine"** - Docker ensures consistent environment

## Running Tests Locally

You can run the same checks manually:

```bash
# Run all pre-push checks
npm run test:all-versions

# Run tests on specific Node versions
npm run test:node18
npm run test:node20 
npm run test:node22

# Run linting in Docker
npm run lint:docker

# Run tests in Docker (Node 20)
npm run test:docker
```

## Docker Configuration

The setup uses two Docker files:

- `Dockerfile.test` - Multi-stage build supporting different Node versions
- `docker-compose.test.yml` - Services for each Node version and task

## Bypassing the Hook (Emergency Only)

In rare cases where you need to push without running checks:

```bash
git push --no-verify
```

**⚠️ Warning**: Only use this in emergencies. The CI will still run these checks and may fail.

## Setup Details

- **Husky** manages the git hooks
- **Scripts** in `scripts/pre-push-test.sh` orchestrate the checks
- **Docker Compose** runs tests in isolated environments
- **npm scripts** provide convenient local testing

## Troubleshooting

### Docker Not Running
```
Error: Docker is not running
```
**Solution**: Start Docker Desktop or Docker daemon

### Permission Denied
```
Permission denied: ./scripts/pre-push-test.sh
```
**Solution**: Make script executable
```bash
chmod +x scripts/pre-push-test.sh
```

### Hook Not Running
**Solution**: Reinstall hooks
```bash
npx husky install
```