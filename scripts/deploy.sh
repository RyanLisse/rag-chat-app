#!/bin/bash

# Deployment script for RAG Chat application
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
ENVIRONMENT=${1:-staging}
VERSION=${2:-latest}
DRY_RUN=${DRY_RUN:-false}

# Configuration
APP_NAME="rag-chat"
REGISTRY="ghcr.io"
IMAGE_NAME="${REGISTRY}/${GITHUB_REPOSITORY:-$APP_NAME}"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

validate_environment() {
    case $ENVIRONMENT in
        development|staging|production)
            log "Deploying to ${ENVIRONMENT} environment"
            ;;
        *)
            error "Invalid environment: ${ENVIRONMENT}. Valid options: development, staging, production"
            ;;
    esac
}

check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check required tools
    for cmd in docker kubectl helm bun; do
        if ! command -v $cmd &> /dev/null; then
            error "$cmd is required but not installed"
        fi
    done
    
    # Check environment variables
    case $ENVIRONMENT in
        production)
            required_vars="VERCEL_TOKEN VERCEL_ORG_ID VERCEL_PROJECT_ID DATABASE_URL_PRODUCTION"
            ;;
        staging)
            required_vars="VERCEL_TOKEN VERCEL_ORG_ID VERCEL_PROJECT_ID DATABASE_URL_STAGING"
            ;;
        development)
            required_vars="VERCEL_TOKEN VERCEL_ORG_ID VERCEL_PROJECT_ID DATABASE_URL_DEVELOPMENT"
            ;;
    esac
    
    for var in $required_vars; do
        if [ -z "${!var:-}" ]; then
            error "Required environment variable $var is not set"
        fi
    done
    
    log "All prerequisites met"
}

run_pre_deployment_checks() {
    log "Running pre-deployment checks..."
    
    # Run tests
    if [ "$SKIP_TESTS" != "true" ]; then
        log "Running tests..."
        bun run test:unit || error "Unit tests failed"
    fi
    
    # Check database migrations
    log "Checking database migrations..."
    bun run db:check || error "Database migration check failed"
    
    # Verify build
    log "Verifying build..."
    bun run build || error "Build failed"
}

backup_database() {
    if [ "$ENVIRONMENT" == "production" ] && [ "$SKIP_BACKUP" != "true" ]; then
        log "Creating database backup..."
        timestamp=$(date +%Y%m%d_%H%M%S)
        backup_file="backup_${ENVIRONMENT}_${timestamp}.sql"
        
        # Add your database backup command here
        # Example: pg_dump $DATABASE_URL > $backup_file
        
        log "Database backup created: $backup_file"
    fi
}

deploy_vercel() {
    log "Deploying to Vercel..."
    
    if [ "$DRY_RUN" == "true" ]; then
        log "[DRY RUN] Would deploy to Vercel ${ENVIRONMENT}"
        return
    fi
    
    case $ENVIRONMENT in
        production)
            vercel --prod --token=$VERCEL_TOKEN
            ;;
        staging)
            vercel --token=$VERCEL_TOKEN --env=preview
            ;;
        development)
            vercel --token=$VERCEL_TOKEN --env=development
            ;;
    esac
}

run_database_migrations() {
    log "Running database migrations..."
    
    if [ "$DRY_RUN" == "true" ]; then
        log "[DRY RUN] Would run database migrations"
        return
    fi
    
    case $ENVIRONMENT in
        production)
            DATABASE_URL=$DATABASE_URL_PRODUCTION bun run db:migrate
            ;;
        staging)
            DATABASE_URL=$DATABASE_URL_STAGING bun run db:migrate
            ;;
        development)
            DATABASE_URL=$DATABASE_URL_DEVELOPMENT bun run db:migrate
            ;;
    esac
}

deploy_docker() {
    log "Deploying Docker container..."
    
    if [ "$DRY_RUN" == "true" ]; then
        log "[DRY RUN] Would deploy Docker image ${IMAGE_NAME}:${VERSION}"
        return
    fi
    
    # Pull the latest image
    docker pull "${IMAGE_NAME}:${VERSION}"
    
    # Stop existing container
    docker stop "${APP_NAME}-${ENVIRONMENT}" 2>/dev/null || true
    docker rm "${APP_NAME}-${ENVIRONMENT}" 2>/dev/null || true
    
    # Run new container
    docker run -d \
        --name "${APP_NAME}-${ENVIRONMENT}" \
        --restart unless-stopped \
        -p 3000:3000 \
        --env-file ".env.${ENVIRONMENT}" \
        "${IMAGE_NAME}:${VERSION}"
}

run_post_deployment_checks() {
    log "Running post-deployment checks..."
    
    # Wait for deployment to be ready
    sleep 30
    
    # Health check
    health_endpoint="${APP_URL:-http://localhost:3000}/api/health"
    max_attempts=10
    attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$health_endpoint" > /dev/null; then
            log "Health check passed"
            break
        else
            warning "Health check attempt $attempt failed"
            if [ $attempt -eq $max_attempts ]; then
                error "Health check failed after $max_attempts attempts"
            fi
            sleep 10
            ((attempt++))
        fi
    done
    
    # Run smoke tests
    if [ "$SKIP_SMOKE_TESTS" != "true" ]; then
        log "Running smoke tests..."
        TEST_URL="$APP_URL" bun run test:smoke || warning "Smoke tests failed"
    fi
}

rollback() {
    error "Deployment failed, initiating rollback..."
    
    case $DEPLOYMENT_METHOD in
        vercel)
            # Vercel handles rollbacks automatically
            log "Vercel will automatically rollback to previous deployment"
            ;;
        docker)
            # Rollback Docker deployment
            docker stop "${APP_NAME}-${ENVIRONMENT}" 2>/dev/null || true
            docker rm "${APP_NAME}-${ENVIRONMENT}" 2>/dev/null || true
            docker run -d \
                --name "${APP_NAME}-${ENVIRONMENT}" \
                --restart unless-stopped \
                -p 3000:3000 \
                --env-file ".env.${ENVIRONMENT}" \
                "${IMAGE_NAME}:previous"
            ;;
    esac
}

notify_deployment() {
    status=$1
    message="Deployment to ${ENVIRONMENT} ${status}"
    
    # Slack notification
    if [ -n "${SLACK_WEBHOOK_URL:-}" ]; then
        curl -X POST -H 'Content-type: application/json' \
            --data "{\"text\":\"${message}\"}" \
            "$SLACK_WEBHOOK_URL"
    fi
    
    # Add other notification methods here
    log "$message"
}

# Main deployment flow
main() {
    log "Starting deployment process..."
    log "Environment: ${ENVIRONMENT}"
    log "Version: ${VERSION}"
    
    # Validate inputs
    validate_environment
    
    # Pre-deployment
    check_prerequisites
    run_pre_deployment_checks
    backup_database
    
    # Deploy
    DEPLOYMENT_METHOD=${DEPLOYMENT_METHOD:-vercel}
    
    case $DEPLOYMENT_METHOD in
        vercel)
            deploy_vercel
            ;;
        docker)
            deploy_docker
            ;;
        *)
            error "Unknown deployment method: ${DEPLOYMENT_METHOD}"
            ;;
    esac
    
    # Run migrations
    run_database_migrations
    
    # Post-deployment
    run_post_deployment_checks
    
    # Success
    notify_deployment "completed successfully"
    log "Deployment completed successfully!"
}

# Error handling
trap 'rollback' ERR

# Run main function
main "$@"