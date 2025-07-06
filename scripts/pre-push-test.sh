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

# Run all checks in parallel
print_status "Running all checks in parallel..."
echo

# Start all processes in background
echo "Starting lint check..."
docker compose -f test/docker/docker-compose.test.yml run --rm -T lint > /tmp/lint.log 2>&1 &
LINT_PID=$!

echo "Starting type check..."
docker compose -f test/docker/docker-compose.test.yml run --rm -T type-check > /tmp/typecheck.log 2>&1 &
TYPECHECK_PID=$!

echo "Starting Node 18 tests..."
docker compose -f test/docker/docker-compose.test.yml run --rm -T test-node18 > /tmp/node18.log 2>&1 &
NODE18_PID=$!

echo "Starting Node 20 tests..."
docker compose -f test/docker/docker-compose.test.yml run --rm -T test-node20 > /tmp/node20.log 2>&1 &
NODE20_PID=$!

echo "Starting Node 22 tests..."
docker compose -f test/docker/docker-compose.test.yml run --rm -T test-node22 > /tmp/node22.log 2>&1 &
NODE22_PID=$!

echo
print_status "Waiting for all checks to complete..."

# Wait for all processes and check results
FAILED=0

wait $LINT_PID
LINT_RESULT=$?
if [ $LINT_RESULT -eq 0 ]; then
    print_success "Linting passed"
else
    print_error "Linting failed"
    echo "----------------------------------------"
    cat /tmp/lint.log
    echo "----------------------------------------"
    FAILED=1
fi

wait $TYPECHECK_PID
TYPECHECK_RESULT=$?
if [ $TYPECHECK_RESULT -eq 0 ]; then
    print_success "Type checking passed"
else
    print_error "Type checking failed"
    echo "----------------------------------------"
    cat /tmp/typecheck.log
    echo "----------------------------------------"
    FAILED=1
fi

wait $NODE18_PID
NODE18_RESULT=$?
if [ $NODE18_RESULT -eq 0 ]; then
    print_success "Tests passed on Node.js 18.x"
else
    print_error "Tests failed on Node.js 18.x"
    echo "----------------------------------------"
    cat /tmp/node18.log
    echo "----------------------------------------"
    FAILED=1
fi

wait $NODE20_PID
NODE20_RESULT=$?
if [ $NODE20_RESULT -eq 0 ]; then
    print_success "Tests passed on Node.js 20.x"
else
    print_error "Tests failed on Node.js 20.x"
    echo "----------------------------------------"
    cat /tmp/node20.log
    echo "----------------------------------------"
    FAILED=1
fi

wait $NODE22_PID
NODE22_RESULT=$?
if [ $NODE22_RESULT -eq 0 ]; then
    print_success "Tests passed on Node.js 22.x"
else
    print_error "Tests failed on Node.js 22.x"
    echo "----------------------------------------"
    cat /tmp/node22.log
    echo "----------------------------------------"
    FAILED=1
fi

# Clean up temp files
rm -f /tmp/lint.log /tmp/typecheck.log /tmp/node18.log /tmp/node20.log /tmp/node22.log

if [ $FAILED -eq 1 ]; then
    exit 1
fi

# All checks passed
echo
print_success "All pre-push checks passed! 🚀"
print_status "Safe to push to remote repository."