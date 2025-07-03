#!/bin/bash

# Start the development server in the background with test environment
echo "Starting development server..."
NODE_ENV=test REDIS_URL= bun dev &
SERVER_PID=$!

# Wait for server to be ready
echo "Waiting for server to start..."
for i in {1..30}; do
  if curl -s http://localhost:3000/api/health > /dev/null; then
    echo "Server is ready!"
    break
  fi
  sleep 1
done

# Run E2E tests (basic workflow only for infrastructure verification)
echo "Running E2E tests..."
bunx playwright test --project=e2e-basic

# Capture test exit code
TEST_EXIT_CODE=$?

# Kill the server
echo "Stopping server..."
kill $SERVER_PID

# Exit with test exit code
exit $TEST_EXIT_CODE