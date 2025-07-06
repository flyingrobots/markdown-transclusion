#!/bin/bash

# Development script to run commands in Docker environment
# Usage: ./scripts/dev-in-docker.sh <command>

set -e

COMMAND="${1:-npm test}"

echo "🐳 Running in Docker: $COMMAND"

docker compose run --rm --entrypoint sh dev -c "$COMMAND"