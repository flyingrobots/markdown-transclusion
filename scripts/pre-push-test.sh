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

# Initialize PID variables
LINT_PID=""
TYPECHECK_PID=""
NODE18_PID=""
NODE20_PID=""
NODE22_PID=""

# Function to run a command in background with labeled output
run_labeled() {
    local label="$1"
    local command="$2"
    
    # Run command and prefix each line with label (no colors to avoid escape issues)
    $command 2>&1 | while IFS= read -r line; do
        echo "[$label] $line"
    done &
    echo $!
}

# Cleanup function to kill all background processes
cleanup_processes() {
    print_warning "Cleaning up background processes..."
    
    # Kill background processes if they exist
    if [ "${LINT_PID:-}" ]; then kill $LINT_PID 2>/dev/null || true; fi
    if [ "${TYPECHECK_PID:-}" ]; then kill $TYPECHECK_PID 2>/dev/null || true; fi
    if [ "${NODE18_PID:-}" ]; then kill $NODE18_PID 2>/dev/null || true; fi
    if [ "${NODE20_PID:-}" ]; then kill $NODE20_PID 2>/dev/null || true; fi
    if [ "${NODE22_PID:-}" ]; then kill $NODE22_PID 2>/dev/null || true; fi
    
    # Kill any remaining background jobs
    jobs -p | xargs -r kill 2>/dev/null || true
    
    # Force stop any running Docker containers from this compose file
    docker compose -f test/docker/docker-compose.test.yml down --remove-orphans 2>/dev/null || true
    
    # Kill any containers that might still be running
    docker ps -q --filter "name=markdown-transclusion-test" | xargs -r docker kill 2>/dev/null || true
}

# Set up trap to cleanup on script exit
trap cleanup_processes EXIT INT TERM

# Run all checks in parallel with labeled streaming output
print_status "Running all checks in parallel with streaming output..."
echo

# Start all processes in background with labeled output
LINT_PID=$(run_labeled "lint" "docker compose -f test/docker/docker-compose.test.yml run --rm -T lint")

TYPECHECK_PID=$(run_labeled "typecheck" "docker compose -f test/docker/docker-compose.test.yml run --rm -T type-check")

NODE18_PID=$(run_labeled "node18" "docker compose -f test/docker/docker-compose.test.yml run --rm -T test-node18")

NODE20_PID=$(run_labeled "node20" "docker compose -f test/docker/docker-compose.test.yml run --rm -T test-node20")

NODE22_PID=$(run_labeled "node22" "docker compose -f test/docker/docker-compose.test.yml run --rm -T test-node22")

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