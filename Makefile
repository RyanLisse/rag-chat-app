# Makefile for RAG Chat Docker operations

.PHONY: help
help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-20s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

.PHONY: dev
dev: ## Start development environment
	docker-compose up -d app-dev postgres redis otel-collector

.PHONY: dev-logs
dev-logs: ## Show development logs
	docker-compose logs -f app-dev

.PHONY: build
build: ## Build all Docker images
	docker-compose build

.PHONY: test
test: ## Run tests in Docker
	docker-compose run --rm app-test

.PHONY: prod
prod: ## Start production environment
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

.PHONY: down
down: ## Stop all containers
	docker-compose down

.PHONY: clean
clean: ## Stop containers and remove volumes
	docker-compose down -v

.PHONY: db-migrate
db-migrate: ## Run database migrations
	docker-compose exec app-dev bun run db:migrate

.PHONY: db-studio
db-studio: ## Open Drizzle Studio
	docker-compose exec app-dev bun run db:studio

.PHONY: shell
shell: ## Open shell in development container
	docker-compose exec app-dev sh

.PHONY: logs
logs: ## Show all logs
	docker-compose logs -f

.PHONY: ps
ps: ## Show running containers
	docker-compose ps

.PHONY: restart
restart: ## Restart all containers
	docker-compose restart

.PHONY: prod-build
prod-build: ## Build production image
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml build app

.PHONY: prod-deploy
prod-deploy: prod-build ## Deploy to production
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps app

.PHONY: backup-db
backup-db: ## Backup database
	@mkdir -p backups
	docker-compose exec postgres pg_dump -U postgres rag_chat | gzip > backups/rag_chat_backup_$$(date +%Y%m%d_%H%M%S).sql.gz
	@echo "Database backup created in backups/"

.PHONY: restore-db
restore-db: ## Restore database from backup (usage: make restore-db FILE=backup.sql.gz)
	@if [ -z "$(FILE)" ]; then echo "Please specify FILE=backup.sql.gz"; exit 1; fi
	gunzip -c $(FILE) | docker-compose exec -T postgres psql -U postgres rag_chat
	@echo "Database restored from $(FILE)"

# Worktree operations
.PHONY: wt-setup
wt-setup: ## Setup Git worktrees for parallel development
	./scripts/setup-worktrees.sh

.PHONY: wt-create
wt-create: ## Create new worktree (usage: make wt-create TYPE=feature NAME=my-feature)
	@if [ -z "$(NAME)" ]; then echo "Please specify NAME=feature-name"; exit 1; fi
	./scripts/worktree-create.sh $(TYPE) $(NAME)

.PHONY: wt-switch
wt-switch: ## Switch to worktree (usage: make wt-switch NAME=my-feature)
	./scripts/worktree-switch.sh $(NAME)

.PHONY: wt-sync
wt-sync: ## Sync all worktrees with main
	./scripts/worktree-sync.sh

.PHONY: wt-merge
wt-merge: ## Merge worktree to main (usage: make wt-merge NAME=my-feature)
	@if [ -z "$(NAME)" ]; then echo "Please specify NAME=feature-name"; exit 1; fi
	./scripts/worktree-merge.sh $(NAME)

.PHONY: wt-clean
wt-clean: ## Clean up old worktrees
	./scripts/worktree-cleanup.sh clean

.PHONY: wt-health
wt-health: ## Check worktree health
	./scripts/worktree-health.sh check