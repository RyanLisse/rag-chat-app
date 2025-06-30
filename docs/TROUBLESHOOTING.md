# RAG Chat Application - Troubleshooting Guide

## Quick Diagnostics

### System Status Check
```bash
# Check application health
bun run healthcheck

# Verify Docker services
docker compose ps

# Check database connectivity
bun run db:check

# Verify environment variables
bun run dev --dry-run
```

## Common Issues

### 1. Installation & Dependencies

#### Bun Installation Issues
**Problem**: Bun command not found or outdated version
```bash
# Solution: Install/update Bun
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc  # or restart terminal

# Verify installation
bun --version  # Should be 1.2.16+
```

**Problem**: Package installation failures
```bash
# Solution: Clear cache and reinstall
bun pm cache rm
rm -rf node_modules bun.lockb
bun install

# If native modules fail
bun install --force
```

#### Dependency Conflicts
**Problem**: Peer dependency warnings or conflicts
```bash
# Solution: Check compatibility
bun outdated
bun update

# Force resolution if needed
bun install --force
```

### 2. Database Issues

#### Connection Failures
**Problem**: Cannot connect to PostgreSQL
```bash
# Check database status
docker compose ps postgres

# View database logs
docker compose logs postgres

# Restart database
docker compose restart postgres

# Reset database completely
docker compose down postgres
docker volume rm rag-chat-rra_postgres_data
docker compose up postgres -d
```

**Problem**: Migration failures
```bash
# Check migration status
bun run db:check

# Reset and re-run migrations
bun run db:push --force
bun run db:migrate

# Manual migration
psql -h localhost -U postgres -d rag_chat -f lib/db/migrations/[file].sql
```

#### Redis Connection Issues
**Problem**: Redis connection refused
```bash
# Check Redis status
docker compose ps redis

# Test Redis connection
redis-cli -h localhost -p 6379 ping

# Check Redis logs
docker compose logs redis

# Clear Redis data
docker compose exec redis redis-cli FLUSHALL
```

### 3. TypeScript Issues

#### Type Checking Errors
**Problem**: TypeScript compilation errors
```bash
# Clear Next.js and TypeScript cache
rm -rf .next
rm -rf node_modules/.cache

# Re-run type checking
bun run typecheck

# Check TypeScript configuration
npx tsc --showConfig
```

**Problem**: Missing type definitions
```bash
# Install missing types
bun add -D @types/[package-name]

# Generate types for custom modules
bun run db:generate
```

#### Module Resolution Issues
**Problem**: Cannot resolve module imports
```bash
# Check path aliases in tsconfig.json
cat tsconfig.json | grep -A 10 "paths"

# Verify file structure matches imports
find . -name "*.ts" -o -name "*.tsx" | head -20
```

### 4. Testing Issues

#### Test Failures
**Problem**: Unit tests failing
```bash
# Run tests with verbose output
bun run test:unit --verbose

# Run specific test file
bun test tests/unit/[file].test.ts

# Check test setup
cat tests/setup/test-setup.ts
```

**Problem**: E2E test failures
```bash
# Check Playwright installation
npx playwright install

# Run E2E tests with UI
bun run test:e2e --ui

# Debug specific test
bun run test:e2e --debug tests/e2e/[file].test.ts
```

**Problem**: Test database issues
```bash
# Reset test database
docker compose down postgres-test
docker compose up postgres-test -d

# Run test migrations
NODE_ENV=test bun run db:migrate
```

### 5. Development Server Issues

#### Server Won't Start
**Problem**: Port already in use
```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 [PID]

# Start on different port
PORT=3001 bun run dev
```

**Problem**: Hot reload not working
```bash
# Check file watchers
echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
sudo sysctl -p

# Restart development server
bun run dev --port 3000
```

#### Build Failures
**Problem**: Next.js build errors
```bash
# Clear build cache
rm -rf .next

# Build with detailed output
bun run build --debug

# Check for circular dependencies
npx madge --circular app/
```

### 6. Docker Issues

#### Container Startup Failures
**Problem**: Docker services won't start
```bash
# Check Docker daemon
docker ps

# View service logs
docker compose logs [service-name]

# Rebuild containers
docker compose build --no-cache
docker compose up --force-recreate
```

**Problem**: Volume mount issues
```bash
# Check volume permissions
ls -la /var/lib/docker/volumes/

# Remove and recreate volumes
docker compose down -v
docker volume prune
docker compose up -d
```

#### Network Connectivity
**Problem**: Services can't communicate
```bash
# Check Docker networks
docker network ls
docker network inspect rag-chat-rra_rag-chat-network

# Test connectivity between containers
docker compose exec app-dev ping postgres
```

### 7. Authentication Issues

#### NextAuth Configuration
**Problem**: Authentication not working
```bash
# Check environment variables
echo $AUTH_SECRET
echo $AUTH_URL

# Verify database schema
bun run db:studio

# Check session storage
docker compose exec redis redis-cli KEYS "*session*"
```

**Problem**: OAuth provider issues
```bash
# Check provider configuration
cat app/(auth)/auth.config.ts

# Verify callback URLs
echo $NEXTAUTH_URL/api/auth/callback/[provider]

# Check provider credentials in environment
```

### 8. AI Provider Issues

#### API Key Problems
**Problem**: Invalid or missing API keys
```bash
# Verify environment variables
echo $OPENAI_API_KEY | cut -c1-10
echo $ANTHROPIC_API_KEY | cut -c1-10

# Test API connectivity
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models
```

**Problem**: Rate limiting or quota exceeded
```bash
# Check rate limits in logs
docker compose logs app-dev | grep -i "rate\|limit\|quota"

# Implement backoff strategy
# Review lib/ai/providers/[provider].ts
```

#### Model Selection Issues
**Problem**: Model not available or deprecated
```bash
# List available models
curl -H "Authorization: Bearer $OPENAI_API_KEY" \
     https://api.openai.com/v1/models

# Update model configuration
# Edit lib/ai/models.ts
```

### 9. Vector Store Issues

#### Embedding Generation
**Problem**: Vector embeddings failing
```bash
# Check embedding API
bun test tests/unit/vector-store.test.ts

# Verify embedding dimensions
# Check lib/ai/vector-store.ts configuration

# Test with sample text
node -e "
const { generateEmbedding } = require('./lib/ai/vector-store.ts');
generateEmbedding('test').then(console.log);
"
```

#### Search Performance
**Problem**: Slow vector search
```bash
# Check index status
# Review vector store configuration

# Monitor search metrics
# Check monitoring dashboard at :8888/metrics

# Optimize search parameters
# Review similarity thresholds
```

### 10. Monitoring Issues

#### OpenTelemetry Problems
**Problem**: Telemetry data not appearing
```bash
# Check collector status
docker compose ps otel-collector

# View collector logs
docker compose logs otel-collector

# Test OTLP endpoint
curl -X POST http://localhost:4318/v1/traces \
     -H "Content-Type: application/json" \
     -d '{"resourceSpans":[]}'
```

**Problem**: Missing metrics
```bash
# Check Prometheus endpoint
curl http://localhost:8888/metrics

# Verify instrumentation
# Review lib/monitoring/telemetry.ts

# Check metric configuration
# Review otel-collector-config.yaml
```

### 11. Performance Issues

#### Slow Response Times
**Problem**: Application responding slowly
```bash
# Profile application
bun run dev --turbo

# Check database queries
# Enable query logging in DATABASE_URL

# Monitor memory usage
docker stats

# Check for memory leaks
node --inspect bun run dev
```

#### High Resource Usage
**Problem**: Excessive CPU or memory usage
```bash
# Check container resources
docker compose exec app-dev top

# Profile memory usage
bun run test:performance

# Check for circular references
npx clinic doctor -- bun run start
```

### 12. Git Hook Issues

#### Pre-commit Failures
**Problem**: Pre-commit hooks failing
```bash
# Check hook installation
ls -la .git/hooks/

# Re-install hooks
./scripts/setup-pre-commit-hooks.sh

# Skip hooks temporarily
git commit --no-verify

# Fix common issues
bun run lint:fix
bun run typecheck
```

#### Commit Message Validation
**Problem**: Invalid commit message format
```bash
# Example of valid commit
git commit -m "feat(auth): add OAuth provider"

# Common types: feat, fix, docs, style, refactor, test, chore

# Edit last commit message
git commit --amend
```

## Performance Optimization

### Application Performance
```bash
# Bundle analysis
bun run build
npx @next/bundle-analyzer .next

# Database query optimization
bun run db:studio

# Cache optimization
redis-cli monitor
```

### Development Performance
```bash
# Optimize TypeScript checking
# Add to tsconfig.json: "skipLibCheck": true

# Reduce test execution time
bun run test:unit --maxWorkers=4

# Optimize hot reload
# Reduce file watching scope
```

## Environment-Specific Issues

### Development Environment
```bash
# Check development configuration
cat .env.local

# Verify development services
docker compose -f docker-compose.yml -f docker-compose.override.yml ps

# Reset development data
bun run db:reset
```

### Production Environment
```bash
# Check production build
bun run build

# Verify production configuration
cat .env.production

# Test production container
docker compose -f docker-compose.yml -f docker-compose.prod.yml up app-prod
```

### Testing Environment
```bash
# Check test configuration
cat .env.test

# Reset test environment
docker compose -f docker-compose.yml down -v
docker compose -f docker-compose.yml up postgres-test redis-test -d
```

## Debugging Tools

### Application Debugging
```bash
# Enable debug logging
DEBUG=* bun run dev

# Use Node.js inspector
node --inspect-brk bun run dev

# Component debugging with Storybook
bun run storybook
```

### Database Debugging
```bash
# Query debugging
POSTGRES_LOG_QUERIES=true bun run dev

# Schema visualization
bun run db:studio

# Connection pool monitoring
# Check lib/db/utils.ts
```

### API Debugging
```bash
# Request logging
# Enable in middleware.ts

# API testing
curl -X POST http://localhost:3000/api/chat \
     -H "Content-Type: application/json" \
     -d '{"message":"test"}'

# WebSocket debugging
# Use browser developer tools
```

## Recovery Procedures

### Complete Environment Reset
```bash
# Stop all services
docker compose down -v

# Clean Docker
docker system prune -a
docker volume prune

# Reset application
rm -rf node_modules .next bun.lockb
rm -rf test-results playwright-report coverage

# Reinstall everything
bun install
./scripts/setup-pre-commit-hooks.sh
docker compose up -d
bun run db:migrate
```

### Data Recovery
```bash
# Backup current state
docker compose exec postgres pg_dump -U postgres rag_chat > backup.sql

# Restore from backup
docker compose exec -T postgres psql -U postgres rag_chat < backup.sql

# Export Redis data
docker compose exec redis redis-cli --rdb /data/dump.rdb
```

## Getting Help

### Log Collection
```bash
# Collect all logs
mkdir -p debug-logs
docker compose logs > debug-logs/docker.log
bun run test 2>&1 | tee debug-logs/test.log
bun run typecheck 2>&1 | tee debug-logs/typecheck.log
```

### System Information
```bash
# System info
uname -a
bun --version
docker --version
git --version

# Application info
cat package.json | grep version
git rev-parse HEAD
git status --porcelain
```

### Support Channels
- **Documentation**: Check `/docs` directory
- **GitHub Issues**: Search existing issues
- **Development Team**: Internal Slack/Teams
- **Community**: Stack Overflow with `rag-chat` tag

---

*Keep this guide updated as new issues are discovered and resolved.*