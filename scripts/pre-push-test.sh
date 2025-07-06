#!/bin/bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[PRE-PUSH]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[PRE-PUSH]${NC} ✓ $1"
}

print_error() {
    echo -e "${RED}[PRE-PUSH]${NC} ✗ $1"
}

print_warning() {
    echo -e "${YELLOW}[PRE-PUSH]${NC} ⚠ $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

print_status "Running pre-push checks..."
echo

# Step 1: Lint
print_status "Running ESLint..."
echo "----------------------------------------"
if docker compose -f test/docker/docker-compose.test.yml run --rm -T lint 2>&1; then
    echo "----------------------------------------"
    print_success "Linting passed"
else
    echo "----------------------------------------"
    print_error "Linting failed"
    exit 1
fi
echo

# Step 2: Type check
print_status "Running TypeScript type check..."
echo "----------------------------------------"
if docker compose -f test/docker/docker-compose.test.yml run --rm -T type-check 2>&1; then
    echo "----------------------------------------"
    print_success "Type checking passed"
else
    echo "----------------------------------------"
    print_error "Type checking failed"
    exit 1
fi
echo

# Step 3: Test against Node.js versions from CI matrix
NODE_VERSIONS=("18" "20" "22")

for version in "${NODE_VERSIONS[@]}"; do
    print_status "Running tests on Node.js ${version}.x..."
    echo "----------------------------------------"
    if docker compose -f test/docker/docker-compose.test.yml run --rm -T "test-node${version}" 2>&1; then
        echo "----------------------------------------"
        print_success "Tests passed on Node.js ${version}.x"
    else
        echo "----------------------------------------"
        print_error "Tests failed on Node.js ${version}.x"
        print_error "Check the output above for specific test failures"
        exit 1
    fi
    echo
done

# All checks passed
echo
print_success "All pre-push checks passed! 🚀"
print_status "Safe to push to remote repository."