#!/bin/sh
# Health check script for the RAG chat application

set -e

# Check if the application is responding
if ! curl -f http://localhost:3000/ping > /dev/null 2>&1; then
    echo "Application health check failed"
    exit 1
fi

# Check database connection (if DATABASE_URL is set)
if [ -n "$DATABASE_URL" ]; then
    # This would require a simple endpoint that checks DB connectivity
    if ! curl -f http://localhost:3000/api/health/db > /dev/null 2>&1; then
        echo "Database health check failed"
        exit 1
    fi
fi

# Check Redis connection (if REDIS_URL is set)
if [ -n "$REDIS_URL" ]; then
    # This would require a simple endpoint that checks Redis connectivity
    if ! curl -f http://localhost:3000/api/health/redis > /dev/null 2>&1; then
        echo "Redis health check failed"
        exit 1
    fi
fi

echo "All health checks passed"
exit 0