# GitHub Actions Workflows

This directory contains all GitHub Actions workflows for the RAG Chat application.

## Workflows Overview

### Core Workflows

#### 1. **CI (ci.yml)**
- **Trigger**: Pull requests and pushes to main/develop branches
- **Purpose**: Continuous Integration checks
- **Jobs**:
  - Lint: Code style and formatting checks using Biome
  - Type Check: TypeScript type validation
  - Unit Tests: Runs unit tests with matrix testing (Node 18, 20, 22)
  - E2E Tests: Playwright end-to-end tests
  - Build: Next.js production build
- **Features**: Bun caching, parallel execution, artifact uploads

#### 2. **CD (cd.yml)**
- **Trigger**: Pushes to main/develop, tags, manual dispatch
- **Purpose**: Continuous Deployment
- **Environments**:
  - `develop` branch → Development environment
  - `main` branch → Staging environment
  - `v*` tags → Production environment
- **Features**: Docker builds, Vercel deployments, database migrations, health checks, rollback support

#### 3. **Security Scan (security.yml)**
- **Trigger**: Daily schedule, PRs, pushes to main/develop
- **Purpose**: Security vulnerability scanning
- **Scans**:
  - Dependency vulnerabilities (Snyk)
  - Code security issues (CodeQL, Semgrep)
  - Secret detection (TruffleHog, Gitleaks)
  - Container vulnerabilities (Trivy)
  - License compliance
- **Features**: SARIF uploads, security reports

#### 4. **Dependency Update (dependency-update.yml)**
- **Trigger**: Weekly schedule, manual dispatch
- **Purpose**: Automated dependency updates
- **Update Types**:
  - Patch: Security and bug fixes only
  - Minor: New features (backwards compatible)
  - Major: Breaking changes
- **Features**: Automated PRs, security-focused updates

#### 5. **Release (release.yml)**
- **Trigger**: Pushes to main, manual dispatch
- **Purpose**: Automated versioning and releases
- **Features**:
  - Semantic versioning based on commit messages
  - Changelog generation
  - GitHub release creation
  - NPM publishing
  - Docker image tagging

### Utility Workflows

#### 6. **CODEOWNERS Validation (codeowners-validation.yml)**
- Validates CODEOWNERS file syntax and rules

#### 7. **PR Labeler (pr-labeler.yml)**
- Automatically labels PRs based on:
  - Changed files
  - PR size
  - PR title conventions

#### 8. **Stale Management (stale.yml)**
- Marks and closes stale issues/PRs
- Configurable exemptions for important items

## Required Secrets

Configure these secrets in your GitHub repository settings:

### Authentication & API Keys
- `AUTH_SECRET`: NextAuth secret
- `OPENAI_API_KEY`: OpenAI API key
- `ANTHROPIC_API_KEY`: Anthropic API key
- `XAI_API_KEY`: X.AI API key

### Database & Storage
- `DATABASE_URL_DEVELOPMENT`: Dev database connection
- `DATABASE_URL_STAGING`: Staging database connection
- `DATABASE_URL_PRODUCTION`: Production database connection
- `REDIS_URL_DEVELOPMENT`: Dev Redis connection
- `REDIS_URL_STAGING`: Staging Redis connection
- `REDIS_URL_PRODUCTION`: Production Redis connection
- `BLOB_READ_WRITE_TOKEN`: Vercel Blob storage token

### Deployment
- `VERCEL_TOKEN`: Vercel deployment token
- `VERCEL_ORG_ID`: Vercel organization ID
- `VERCEL_PROJECT_ID`: Vercel project ID
- `NPM_TOKEN`: NPM publishing token

### Monitoring & Security
- `SENTRY_DSN_*`: Sentry DSN for each environment
- `POSTHOG_KEY_*`: PostHog API keys
- `SNYK_TOKEN`: Snyk security scanning
- `SEMGREP_APP_TOKEN`: Semgrep SAST scanning
- `SLACK_WEBHOOK_URL`: Slack notifications

## Branch Protection Rules

Apply these rules using the provided script:
```bash
bun run setup:branch-protection
```

### Main Branch
- Require PR reviews (1 approval)
- Dismiss stale reviews
- Require status checks: CI Summary, Security
- Require conversation resolution
- No force pushes or deletions

### Develop Branch
- Require PR reviews (1 approval)
- Require status checks: lint, typecheck, test, build
- No force pushes or deletions

### Release Branches
- Require PR reviews (2 approvals)
- Require all status checks
- Restrict to release managers
- Require linear history

## Usage

### Manual Deployment
```bash
# Deploy to specific environment
gh workflow run cd.yml -f environment=production

# Create a release
gh workflow run release.yml -f release_type=minor
```

### Local Testing
```bash
# Run CI checks locally
bun run lint
bun run typecheck
bun run test:unit
bun run build

# Test deployment script
./scripts/deploy.sh staging
```

### Monitoring Workflows
- Check Actions tab in GitHub for workflow runs
- Failed workflows send Slack notifications
- Security reports uploaded as artifacts

## Troubleshooting

### Common Issues

1. **Bun not found**: Ensure workflows use `oven-sh/setup-bun@v2`
2. **Cache misses**: Check if `bun.lockb` has changed
3. **Test failures**: Review test logs and Playwright reports
4. **Deployment failures**: Check environment secrets and health checks

### Debug Mode
Enable debug logging by setting repository secret:
```
ACTIONS_RUNNER_DEBUG=true
ACTIONS_STEP_DEBUG=true
```

## Best Practices

1. **Commits**: Use conventional commits for automatic versioning
2. **PRs**: Include descriptive titles for auto-labeling
3. **Dependencies**: Review automated dependency PRs carefully
4. **Security**: Address security alerts promptly
5. **Testing**: Ensure tests pass before merging

## Maintenance

- Review and update workflow dependencies monthly
- Monitor GitHub Actions usage and optimize if needed
- Keep secrets rotated according to security policy
- Update Node.js versions in matrix as new LTS releases