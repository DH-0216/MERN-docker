# ==============================================================================
# MERN Docker Project Makefile
# ==============================================================================

.PHONY: help dev dev-build dev-down dev-logs restart-dev \
        prod prod-build prod-down prod-logs restart-prod \
        install test lint build seed-admin validate ps clean \
        shell-server shell-client shell-admin shell-mongo shell-redis

# Default target
.DEFAULT_GOAL := help

help: ## Show this help message
	@echo ==============================================================================
	@echo  MERN Docker Management Commands
	@echo ==============================================================================
	@echo  Development Environment:
	@echo   dev           - Start development stack in background
	@echo   dev-build     - Rebuild images and start development stack
	@echo   dev-down      - Stop development stack
	@echo   dev-logs      - Stream logs from all development containers
	@echo   restart-dev   - Restart development containers
	@echo.
	@echo  Production Environment:
	@echo   prod          - Start production stack in background
	@echo   prod-build    - Rebuild images and start production stack
	@echo   prod-down     - Stop production stack
	@echo   prod-logs     - Stream logs from all production containers
	@echo   restart-prod  - Restart production containers
	@echo.
	@echo  Application and Quality:
	@echo   install       - Install npm dependencies in server, client, and admin
	@echo   test          - Run server integration test suite
	@echo   lint          - Run ESLint across client and admin
	@echo   build         - Compile client and admin production bundles
	@echo   seed-admin    - Seed initial administrator account into MongoDB
	@echo   validate      - Validate development and production Compose files
	@echo.
	@echo  Container Debugging and Shell Access:
	@echo   ps            - List running project containers
	@echo   shell-server  - Open interactive shell in server container
	@echo   shell-client  - Open interactive shell in client container
	@echo   shell-admin   - Open interactive shell in admin container
	@echo   shell-mongo   - Open interactive MongoDB shell (mongosh)
	@echo   shell-redis   - Open interactive Redis CLI
	@echo   clean         - Stop containers and remove volumes and orphans
	@echo ==============================================================================

# ------------------------------------------------------------------------------
# Development Environment Commands
# ------------------------------------------------------------------------------
dev: ## Start development containers
	docker compose up -d

dev-build: ## Build and start development containers
	docker compose up --build -d

dev-down: ## Stop development containers
	docker compose down

dev-logs: ## Follow development logs
	docker compose logs -f

restart-dev: ## Restart development containers
	docker compose restart

# ------------------------------------------------------------------------------
# Production Environment Commands
# ------------------------------------------------------------------------------
prod: ## Start production containers
	docker compose -f compose.prod.yaml --env-file .env.prod up -d

prod-build: ## Build and start production containers
	docker compose -f compose.prod.yaml --env-file .env.prod up --build -d

prod-down: ## Stop production containers
	docker compose -f compose.prod.yaml down

prod-logs: ## Follow production logs
	docker compose -f compose.prod.yaml logs -f

restart-prod: ## Restart production containers
	docker compose -f compose.prod.yaml restart

# ------------------------------------------------------------------------------
# Application & Quality Commands
# ------------------------------------------------------------------------------
install: ## Install npm dependencies across all services
	cd server && npm install
	cd client && npm install
	cd admin && npm install

test: ## Run server integration test suite
	cd server && npm test

lint: ## Run ESLint on client and admin
	cd client && npm run lint
	cd admin && npm run lint

build: ## Build client and admin frontend bundles
	cd client && npm run build
	cd admin && npm run build

seed-admin: ## Seed default admin user into database
	cd server && npm run seed:admin

validate: ## Validate Docker compose configuration files
	docker compose config --dry-run
	docker compose -f compose.prod.yaml --env-file .env.prod.example config --dry-run

# ------------------------------------------------------------------------------
# Container Debugging & Shell Access
# ------------------------------------------------------------------------------
ps: ## View running containers
	docker compose ps

shell-server: ## Exec into server container
	docker compose exec server sh

shell-client: ## Exec into client container
	docker compose exec client sh

shell-admin: ## Exec into admin container
	docker compose exec admin sh

shell-mongo: ## Exec into MongoDB shell
	docker compose exec mongo mongosh

shell-redis: ## Exec into Redis CLI
	docker compose exec redis redis-cli

clean: ## Stop and remove containers, networks, and dev volumes
	docker compose down -v --remove-orphans
