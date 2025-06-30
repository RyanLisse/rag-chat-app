# Docker Setup for RAG Chat Application

This document describes the Docker configuration for the RAG Chat application, supporting development, testing, and production environments.

## Architecture

The Docker setup includes the following services:

- **Application Container** (Bun-based Next.js app)
- **PostgreSQL Database** (v16-alpine)
- **Redis Cache** (v7-alpine)
- **OpenTelemetry Collector** (for monitoring)
- **Nginx** (reverse proxy for production)

## Quick Start

### Development Environment

```bash
# Start development environment
make dev

# View logs
make dev-logs

# Run database migrations
make db-migrate

# Open Drizzle Studio
make db-studio
```

### Testing

```bash
# Run tests in Docker
make test

# Run specific test suite
docker-compose run --rm app-test bun run test:unit
```

### Production

```bash
# Build production image
make prod-build

# Deploy to production
make prod-deploy

# Start full production stack
make prod
```

## Environment Configuration

1. Copy the example environment files:
   ```bash
   cp .env.local.example .env.local
   cp .env.production.example .env.production
   ```

2. Update the environment variables with your actual values.

## Docker Commands

### Using Make (Recommended)

```bash
make help          # Show all available commands
make dev           # Start development environment
make test          # Run tests
make prod          # Start production environment
make down          # Stop all containers
make clean         # Stop containers and remove volumes
make shell         # Open shell in dev container
make logs          # Show all logs
make backup-db     # Backup database
```

### Using Docker Compose Directly

```bash
# Development
docker-compose up -d app-dev postgres redis otel-collector

# Testing
docker-compose run --rm app-test

# Production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f app-dev

# Execute commands in container
docker-compose exec app-dev bun run db:migrate
```

## Service Details

### PostgreSQL
- Port: 5432
- Database: rag_chat
- Health check: pg_isready
- Volumes: Persistent data storage

### Redis
- Port: 6379
- Authentication: Required (set REDIS_PASSWORD)
- Persistence: AOF enabled
- Health check: redis-cli ping

### Application
- Development port: 3000
- Production port: 3000 (behind Nginx on 80/443)
- Health endpoint: /ping
- Volumes: Code mounted for hot reload (dev only)

### OpenTelemetry Collector
- OTLP HTTP: 4318
- OTLP gRPC: 4317
- Prometheus metrics: 8888
- Configuration: otel-collector-config.yaml

## Networking

All services communicate through the `rag-chat-network` bridge network. Services can reference each other by service name (e.g., `postgres`, `redis`).

## Volumes

- `postgres_data`: PostgreSQL data
- `redis_data`: Redis persistence
- `nginx_cache`: Nginx cache (production)

## Health Checks

All services include health checks:
- **PostgreSQL**: `pg_isready` command
- **Redis**: `redis-cli ping` command
- **Application**: HTTP GET to `/ping`
- **Nginx**: HTTP GET to `/health`

## Security Considerations

1. **Secrets Management**: Use Docker secrets for production passwords
2. **Network Isolation**: Services are isolated in their own network
3. **Non-root User**: Application runs as non-root user in production
4. **SSL/TLS**: Nginx configured for HTTPS in production
5. **Rate Limiting**: Implemented at Nginx level

## Troubleshooting

### Container won't start
```bash
# Check logs
docker-compose logs app-dev

# Verify environment variables
docker-compose config

# Check container status
docker-compose ps
```

### Database connection issues
```bash
# Verify PostgreSQL is running
docker-compose exec postgres pg_isready

# Check database logs
docker-compose logs postgres
```

### Port conflicts
```bash
# Change ports in docker-compose.yml or use environment variables
PORT=3001 docker-compose up -d app-dev
```

## Backup and Restore

### Database Backup
```bash
make backup-db
# Or manually:
docker-compose exec postgres pg_dump -U postgres rag_chat > backup.sql
```

### Database Restore
```bash
make restore-db FILE=backup.sql.gz
# Or manually:
docker-compose exec -T postgres psql -U postgres rag_chat < backup.sql
```

## MCP Integration

The Docker setup supports MCP (Model Context Protocol) integration:

1. Environment variables for MCP servers are passed through
2. Volumes mount necessary directories for MCP access
3. Network configuration allows MCP server communication

## Performance Tuning

### Development
- Hot reload enabled with Watchpack polling
- Volumes optimized for file watching

### Production
- Multi-stage builds for minimal image size
- Resource limits configured
- Nginx caching for static assets
- Connection pooling for database

## Monitoring

OpenTelemetry Collector is configured to collect:
- Traces
- Metrics
- Logs

Configure exporters in `otel-collector-config.yaml` for your monitoring backend.