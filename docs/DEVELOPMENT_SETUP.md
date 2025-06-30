# RAG Chat Application - Development Environment Setup

## Prerequisites

### Required Software
- **Bun**: v1.2.16+ (JavaScript runtime and package manager)
- **Node.js**: v20+ (for compatibility)
- **Docker**: v24+ with Docker Compose
- **Git**: v2.30+
- **PostgreSQL**: v16+ (local or containerized)
- **Redis**: v7+ (local or containerized)

### Development Tools
- **VS Code** (recommended IDE)
- **VS Code Extensions**:
  - Biome (linting and formatting)
  - TypeScript and JavaScript Language Features
  - Docker
  - Git Graph
  - Thunder Client (API testing)

## Initial Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd rag-chat-rra
```

### 2. Install Dependencies
```bash
# Install packages with Bun
bun install

# Install Git hooks
./scripts/setup-pre-commit-hooks.sh
```

### 3. Environment Configuration
```bash
# Copy environment template
cp .env.example .env.local

# Configure required environment variables:
# - Database connection
# - API keys (OpenAI, Anthropic, Google)
# - Redis connection
# - Authentication secrets
```

### 4. Database Setup
```bash
# Start database services
docker compose up postgres redis -d

# Run database migrations
bun run db:migrate

# (Optional) Seed development data
bun run db:seed
```

## Development Workflow

### 1. Code Standards
- **Linting**: Biome.js with strict rules
- **Formatting**: Automatic on save (Biome)
- **TypeScript**: Strict mode enabled
- **Commit Format**: Conventional commits

### 2. Pre-commit Validation
Git hooks automatically run:
- Biome linting and formatting
- TypeScript type checking
- Unit tests
- Security checks for sensitive data

### 3. Testing Strategy
```bash
# Unit tests
bun run test:unit

# Integration tests
bun run test:integration

# End-to-end tests
bun run test:e2e

# Visual regression tests
bun run test:visual

# Performance tests
bun run test:performance

# All tests with coverage
bun run test:coverage
```

### 4. Development Server
```bash
# Start development server
bun run dev

# Or with Docker
docker compose up app-dev
```

## Project Structure

```
rag-chat-rra/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Authentication routes
│   ├── (chat)/            # Chat interface routes
│   ├── api/               # API routes
│   └── lib/               # Application logic
├── components/            # React components
├── hooks/                 # Custom React hooks
├── lib/                   # Shared utilities
│   ├── ai/               # AI provider integrations
│   ├── db/               # Database schema and queries
│   └── monitoring/       # Observability stack
├── tests/                # Test suites
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   ├── e2e/              # End-to-end tests
│   └── performance/      # Performance tests
├── scripts/              # Development scripts
└── docs/                 # Documentation
```

## Configuration Files

### Bun Configuration (`bunfig.toml`)
- Test coverage thresholds
- JSX configuration
- Package manager settings

### Biome Configuration (`biome.jsonc`)
- Linting rules (accessibility, security, performance)
- Formatting preferences
- Import organization
- File-specific overrides

### TypeScript Configuration (`tsconfig.json`)
- Strict mode enabled
- Path aliases configured
- Next.js integration

### Docker Configuration
- **Dockerfile**: Multi-stage build for development/production
- **docker-compose.yml**: Full stack with databases
- **docker-compose.override.yml**: Development overrides

## Quality Assurance

### Automated Checks
1. **Pre-commit**: Linting, type checking, unit tests
2. **Pre-push**: Comprehensive test suite
3. **CI Pipeline**: Full validation on pull requests

### Code Quality Metrics
- Test coverage: 85%+ (lines, functions, statements)
- Branch coverage: 80%+
- Complexity limits enforced
- Security scanning enabled

### Performance Monitoring
- OpenTelemetry integration
- Prometheus metrics
- Custom RAG operation tracking
- Request/response monitoring

## Available Scripts

```bash
# Development
bun run dev              # Start development server
bun run build            # Build for production
bun run start            # Start production server

# Code Quality
bun run lint             # Run Biome linting
bun run format           # Format code with Biome
bun run typecheck        # TypeScript checking

# Testing
bun run test             # Run all tests
bun run test:unit        # Unit tests only
bun run test:integration # Integration tests
bun run test:e2e         # End-to-end tests
bun run test:visual      # Visual regression tests
bun run test:performance # Performance tests
bun run test:coverage    # Tests with coverage
bun run test:watch       # Watch mode

# Database
bun run db:generate      # Generate Drizzle schema
bun run db:migrate       # Run migrations
bun run db:studio        # Open Drizzle Studio
bun run db:push          # Push schema changes
bun run db:pull          # Pull schema from database

# Deployment
bun run deploy           # Deploy to production
bun run healthcheck      # Application health check

# Git Worktrees
bun run setup:worktrees  # Setup Git worktrees
bun run wt:create        # Create new worktree
bun run wt:switch        # Switch between worktrees
```

## Environment Variables

### Required Variables
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/rag_chat
POSTGRES_URL=postgresql://user:password@localhost:5432/rag_chat

# Redis
REDIS_URL=redis://localhost:6379

# Authentication
AUTH_SECRET=your-auth-secret
AUTH_URL=http://localhost:3000

# AI Providers
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_GENERATIVE_AI_API_KEY=...

# Monitoring (Optional)
SENTRY_DSN=...
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

### Development Variables
```bash
# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Feature Flags
ENABLE_ANALYTICS=false
ENABLE_DEBUG_LOGGING=true

# Testing
PLAYWRIGHT_BASE_URL=http://localhost:3000
```

## Docker Development

### Quick Start
```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f app-dev

# Stop services
docker compose down
```

### Service Architecture
- **app-dev**: Next.js development server
- **postgres**: PostgreSQL database
- **redis**: Redis cache
- **otel-collector**: OpenTelemetry collector
- **app-test**: Testing environment

## Monitoring & Observability

### OpenTelemetry
- Traces: Request/response monitoring
- Metrics: Custom RAG operation metrics
- Logs: Structured logging with context

### Available Endpoints
- **Health**: `/api/health`
- **Metrics**: `http://localhost:8888/metrics`
- **Telemetry**: `http://localhost:4318` (OTLP)

### Custom Metrics
- API request duration/count
- Model inference timing
- Vector search performance
- Document processing metrics
- Error rates by operation

## Troubleshooting

### Common Issues

1. **Bun Installation Issues**
```bash
# Update Bun
curl -fsSL https://bun.sh/install | bash

# Clear cache
bun pm cache rm
```

2. **Database Connection Issues**
```bash
# Check database status
docker compose ps postgres

# Reset database
docker compose down postgres
docker volume rm rag-chat-rra_postgres_data
docker compose up postgres -d
```

3. **Type Checking Errors**
```bash
# Clean TypeScript cache
rm -rf .next
bun run typecheck
```

4. **Test Failures**
```bash
# Run tests with verbose output
bun run test:unit --verbose

# Update test snapshots
bun run test:visual --update-baseline
```

## Git Workflow

### Branch Strategy
- **main**: Production-ready code
- **develop**: Integration branch
- **feature/***: Feature development
- **hotfix/***: Production fixes

### Commit Convention
```
type(scope): description

Types: feat, fix, docs, style, refactor, test, chore, perf, ci, build
Scope: auth, chat, ai, db, ui, docs
```

### Git Hooks
- **pre-commit**: Quality checks
- **commit-msg**: Conventional commit validation
- **pre-push**: Comprehensive testing

## Performance Optimization

### Bun Optimizations
- Frozen lockfile for consistent installs
- Native module compilation
- Optimized test execution

### Build Optimizations
- Next.js standalone builds
- Static asset optimization
- Bundle analysis available

### Runtime Optimizations
- Connection pooling (database)
- Redis caching layers
- Vector search optimization
- Streaming responses

## Security Considerations

### Development Security
- Environment variable validation
- Sensitive data detection in commits
- Dependency vulnerability scanning
- Security-focused linting rules

### Production Security
- Non-root container execution
- Secrets management
- HTTPS enforcement
- CORS configuration

## Contributing Guidelines

1. Follow the established code style (enforced by Biome)
2. Write tests for new features
3. Update documentation for API changes
4. Use conventional commits
5. Ensure all quality checks pass

## Getting Help

- **Documentation**: `/docs` directory
- **API Reference**: Generated from OpenAPI specs
- **Component Storybook**: `bun run storybook`
- **Database Schema**: Drizzle Studio
- **Issue Tracking**: GitHub Issues

---

*Last Updated: ${new Date().toISOString().split('T')[0]}*