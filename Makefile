# Makefile for RAG Chat Application
.PHONY: setup dev dev-local test build clean help install kill-ports

PORTS = 3000 3001 3002 6379 5432

help: ## Show this help message
	@echo 'RAG Chat Application - Available Commands:'
	@echo ''
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

kill-ports: ## Kill processes on development ports
	@echo "🔌 Killing processes on ports: $(PORTS)"
	@for port in $(PORTS); do \
		lsof -ti:$$port | xargs kill -9 2>/dev/null || true; \
	done

install: ## Install dependencies with Bun
	@echo "📦 Installing dependencies with Bun..."
	bun install

setup: kill-ports install ## Complete setup (install dependencies, setup environment)
	@echo "🚀 Setting up RAG Chat Application..."
	@if [ ! -f .env.local ]; then \
		cp .env.local.example .env.local; \
		echo "📋 Created .env.local from example - please configure your API keys"; \
	fi
	@echo "✅ Setup complete! Configure .env.local with your API keys and run 'make dev'"

dev-local: kill-ports ## Start development server (local only, no Docker)
	@echo "🚀 Starting local development server..."
	bun run dev

dev-docker: ## Start with Docker containers (requires Docker)
	@echo "🐳 Starting Docker development environment..."
	@if command -v docker compose >/dev/null 2>&1; then \
		docker compose up -d app-dev postgres redis otel-collector; \
	elif command -v docker-compose >/dev/null 2>&1; then \
		docker-compose up -d app-dev postgres redis otel-collector; \
	else \
		echo "❌ Docker Compose not found. Use 'make dev-local' instead"; \
		exit 1; \
	fi

dev: dev-local ## Default development (use dev-local)

test: ## Run all tests
	@echo "🧪 Running tests..."
	bun run test:unit

test-e2e: ## Run E2E tests
	@echo "🎭 Running E2E tests..."
	bun run test:e2e

test-coverage: ## Run tests with coverage
	@echo "📊 Running tests with coverage..."
	bun run test:coverage

build: ## Build the application
	@echo "🔨 Building application..."
	bun run build

typecheck: ## Run TypeScript type checking
	@echo "🔍 Running type check..."
	bun run typecheck

lint: ## Run linting
	@echo "🧹 Running linter..."
	bun run lint

lint-fix: ## Fix linting issues
	@echo "🛠️  Fixing linting issues..."
	bun run lint:fix

format: ## Format code
	@echo "✨ Formatting code..."
	bun run format

db-migrate: ## Run database migrations
	@echo "🗃️  Running database migrations..."
	bun run db:migrate

db-studio: ## Open Drizzle Studio
	@echo "🎯 Opening Drizzle Studio..."
	bun run db:studio

docker-down: ## Stop Docker containers
	@if command -v docker compose >/dev/null 2>&1; then \
		docker compose down; \
	elif command -v docker-compose >/dev/null 2>&1; then \
		docker-compose down; \
	else \
		echo "❌ Docker Compose not found"; \
	fi

docker-clean: ## Stop containers and remove volumes  
	@if command -v docker compose >/dev/null 2>&1; then \
		docker compose down -v; \
	elif command -v docker-compose >/dev/null 2>&1; then \
		docker-compose down -v; \
	else \
		echo "❌ Docker Compose not found"; \
	fi

clean: kill-ports docker-clean ## Clean up everything
	@echo "🧹 Cleaning up..."
	rm -rf node_modules .next out dist coverage
	@echo "✅ Cleanup complete"

# Quick development workflow
quick-start: setup dev ## Quick start for new developers

# Full development with Docker
full-dev: setup dev-docker ## Full development environment with Docker