# RAG Chat Application - Deployment Runbook

## Overview
This runbook provides step-by-step procedures for deploying the RAG Chat application across different environments.

## Quick Reference

### Environment URLs
- **Development**: `dev-rag-chat.vercel.app`
- **Staging**: `staging-rag-chat.vercel.app` 
- **Production**: `https://your-domain.com`

### Key Commands
```bash
# Deploy to staging
./scripts/deploy.sh staging

# Deploy to production
./scripts/deploy.sh production

# Emergency rollback
vercel rollback --token=$VERCEL_TOKEN

# Health check
curl -f https://your-domain.com/api/health
```

## Pre-Deployment Checklist

### Required Tools
- [x] Docker and Docker Compose
- [x] Bun runtime
- [x] Vercel CLI
- [x] Git access to repository
- [x] Access to environment secrets

### Required Environment Variables

#### Development
```bash
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-org-id
VERCEL_PROJECT_ID=your-project-id
DATABASE_URL_DEVELOPMENT=postgres://...
```

#### Staging
```bash
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-org-id
VERCEL_PROJECT_ID=your-project-id
DATABASE_URL_STAGING=postgres://...
```

#### Production
```bash
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-org-id
VERCEL_PROJECT_ID=your-project-id
DATABASE_URL_PRODUCTION=postgres://...
SLACK_WEBHOOK_URL=your-slack-webhook (optional)
```

## Deployment Procedures

### Staging Deployment

1. **Prepare for deployment**
   ```bash
   git checkout main
   git pull origin main
   cd /path/to/rag-chat-rra
   ```

2. **Run pre-deployment checks**
   ```bash
   bun run check
   bun run typecheck
   bun run test:unit
   bun run build
   ```

3. **Deploy to staging**
   ```bash
   ./scripts/deploy.sh staging
   ```

4. **Verify deployment**
   ```bash
   curl -f https://staging-rag-chat.vercel.app/api/health
   bun run test:smoke
   ```

### Production Deployment

1. **Prepare for deployment**
   ```bash
   git checkout main
   git pull origin main
   git tag -a v3.0.24 -m "Release v3.0.24"
   git push origin v3.0.24
   ```

2. **Create production backup**
   ```bash
   # Database backup (customize for your DB)
   pg_dump $DATABASE_URL_PRODUCTION > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

3. **Deploy to production**
   ```bash
   ENVIRONMENT=production ./scripts/deploy.sh production
   ```

4. **Monitor deployment**
   - Watch Vercel deployment logs
   - Monitor health endpoints
   - Check error tracking (Sentry)
   - Verify key user flows

### Rollback Procedures

#### Automatic Rollback
The deployment script includes automatic rollback on failure:
```bash
# Rollback is triggered automatically on deployment failure
trap 'rollback' ERR
```

#### Manual Rollback
```bash
# Vercel rollback to previous deployment
vercel rollback --token=$VERCEL_TOKEN

# Or rollback to specific deployment
vercel rollback [deployment-url] --token=$VERCEL_TOKEN
```

## Monitoring and Health Checks

### Health Endpoints
- **Main Health Check**: `/api/health`
- **Readiness Check**: `/api/health/ready`
- **Liveness Check**: `/api/health/live`
- **Metrics**: `/api/health/metrics`

### Health Check Response
```json
{
  "status": "healthy",
  "timestamp": "2025-06-30T10:19:32.000Z",
  "version": "3.0.23",
  "checks": {
    "database": { "status": "pass", "responseTime": 45 },
    "redis": { "status": "pass", "message": "Redis check not implemented" },
    "storage": { "status": "pass", "message": "Storage check not implemented" }
  }
}
```

### Monitoring Dashboards
- **OpenTelemetry Collector**: `http://localhost:8888` (development)
- **Sentry Error Tracking**: Configure with `SENTRY_DSN`
- **Application Logs**: Available through Vercel dashboard

## Environment Configuration

### Configuration Files
- `.env.local.example` - Development template
- `.env.production.example` - Production template
- `.env.monitoring.example` - Monitoring configuration template

### Required Secrets (Production)
```bash
# AI Services
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=your-google-key

# Database
DATABASE_URL=postgres://user:pass@host:5432/db
POSTGRES_URL=postgres://user:pass@host:5432/db

# Authentication
AUTH_SECRET=minimum-32-character-secret
AUTH_URL=https://your-domain.com

# Monitoring
SENTRY_DSN=https://...@sentry.io/...
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318

# Security
ALLOWED_ORIGINS=https://your-domain.com
CSRF_SECRET=your-csrf-secret
```

## Database Management

### Migration Commands
```bash
# Generate new migration
bun run db:generate

# Run migrations
bun run db:migrate

# Check migration status
bun run db:check

# Access database studio
bun run db:studio
```

### Backup and Restore
```bash
# Create backup
pg_dump $DATABASE_URL > backup.sql

# Restore backup
psql $DATABASE_URL < backup.sql
```

## Troubleshooting

### Common Issues

#### Deployment Fails at Build Stage
```bash
# Clear build cache
rm -rf .next/
bun run build

# Check for TypeScript errors
bun run typecheck
```

#### Health Check Fails
```bash
# Check application logs
vercel logs --token=$VERCEL_TOKEN

# Test database connection
bun run db:check

# Verify environment variables
vercel env ls --token=$VERCEL_TOKEN
```

#### High Response Times
```bash
# Check database performance
SELECT * FROM pg_stat_activity;

# Monitor OpenTelemetry metrics
curl http://localhost:8888/metrics

# Check Sentry performance monitoring
```

### Emergency Contacts
- **DevOps Team**: devops@company.com
- **Database Team**: dba@company.com
- **Security Team**: security@company.com

### Incident Response
1. **Assess Impact**: Check health endpoints and user reports
2. **Immediate Response**: Rollback if necessary
3. **Investigation**: Check logs, metrics, and monitoring
4. **Communication**: Update stakeholders via Slack/email
5. **Resolution**: Apply fixes and re-deploy
6. **Post-Mortem**: Document incident and improvements

## Performance Optimization

### Key Metrics to Monitor
- Response time < 2s for 95th percentile
- Database query time < 500ms average
- Memory usage < 512MB per container
- Error rate < 0.1%

### Optimization Checklist
- [ ] Database query optimization
- [ ] Next.js bundle analysis
- [ ] CDN configuration
- [ ] Caching strategy review
- [ ] AI model response time monitoring

## Security Checklist

### Pre-Deployment Security Review
- [ ] No hardcoded secrets in code
- [ ] Environment variables properly configured
- [ ] HTTPS enforced in production
- [ ] CSRF protection enabled
- [ ] Rate limiting configured
- [ ] Security headers configured
- [ ] Dependency vulnerabilities resolved

### Security Monitoring
- [ ] Secret scanning active
- [ ] Container vulnerability scanning
- [ ] Code analysis (CodeQL, Semgrep)
- [ ] License compliance checking
- [ ] Access logging enabled

## Maintenance Windows

### Scheduled Maintenance
- **Weekly**: Dependency updates (Sundays 2-4 AM UTC)
- **Monthly**: Security patches (First Sunday 2-6 AM UTC)
- **Quarterly**: Major version updates (Planned in advance)

### Emergency Maintenance
- Immediate for critical security issues
- Database emergency procedures
- Incident response protocols

---

**Document Version**: 1.0
**Last Updated**: 2025-06-30
**Next Review**: 2025-07-30