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

# Function to run a command in background with labeled output
run_labeled() {
    local label="$1"
    local command="$2"
    local color="$3"
    
    # Run command and prefix each line with label
    $command 2>&1 | sed "s/^/${color}[${label}]${NC} /" &
    return $!
}

# Run all checks in parallel with labeled streaming output
print_status "Running all checks in parallel with streaming output..."
echo

# Start all processes in background with labeled output
run_labeled "lint" "docker compose -f test/docker/docker-compose.test.yml run --rm -T lint" "$BLUE"
LINT_PID=$!

run_labeled "typecheck" "docker compose -f test/docker/docker-compose.test.yml run --rm -T type-check" "$YELLOW"
TYPECHECK_PID=$!

run_labeled "node18" "docker compose -f test/docker/docker-compose.test.yml run --rm -T test-node18" "$GREEN"
NODE18_PID=$!

run_labeled "node20" "docker compose -f test/docker/docker-compose.test.yml run --rm -T test-node20" "$GREEN"
NODE20_PID=$!

run_labeled "node22" "docker compose -f test/docker/docker-compose.test.yml run --rm -T test-node22" "$GREEN"
NODE22_PID=$!

echo
print_status "Waiting for all checks to complete..."
echo

# Wait for all processes and check results
FAILED=0

wait $LINT_PID
LINT_RESULT=$?
if [ $LINT_RESULT -eq 0 ]; then
    print_success "Linting passed"
else
    print_error "Linting failed"
    FAILED=1
fi

wait $TYPECHECK_PID
TYPECHECK_RESULT=$?
if [ $TYPECHECK_RESULT -eq 0 ]; then
    print_success "Type checking passed"
else
    print_error "Type checking failed"
    FAILED=1
fi

wait $NODE18_PID
NODE18_RESULT=$?
if [ $NODE18_RESULT -eq 0 ]; then
    print_success "Tests passed on Node.js 18.x"
else
    print_error "Tests failed on Node.js 18.x"
    FAILED=1
fi

wait $NODE20_PID
NODE20_RESULT=$?
if [ $NODE20_RESULT -eq 0 ]; then
    print_success "Tests passed on Node.js 20.x"
else
    print_error "Tests failed on Node.js 20.x"
    FAILED=1
fi

wait $NODE22_PID
NODE22_RESULT=$?
if [ $NODE22_RESULT -eq 0 ]; then
    print_success "Tests passed on Node.js 22.x"
else
    print_error "Tests failed on Node.js 22.x"
    FAILED=1
fi

if [ $FAILED -eq 1 ]; then
    exit 1
fi

# All checks passed
echo
print_success "All pre-push checks passed! 🚀"
print_status "Safe to push to remote repository."