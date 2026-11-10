.PHONY: help env-init install dev up down logs ps web api build clean docker-up docker-restart docker-down docker-logs docker-status docker-build docker-clean lint format format-check vulncheck api-format

COMPOSE ?= docker compose --env-file api/.env

help: ## Show available commands
	@awk 'BEGIN {FS = ":.*##"}; /^[a-zA-Z_-]+:.*##/ {printf "\033[36m%-12s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

env-init: ## Create local environment and generate a random database password
	@test -f api/.env || { cp api/.env.example api/.env; sed -i "s/^POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')/" api/.env; }
	@test -f web/.env || cp web/.env.example web/.env

install: ## Install web dependencies
	cd web && pnpm install

dev: env-init ## Build and start web, API and PostgreSQL
	$(COMPOSE) up --build

up: env-init ## Start services in the background
	$(COMPOSE) up --build -d

docker-up: env-init ## Build and start all Docker components
	$(COMPOSE) up --build -d

docker-restart: env-init ## Rebuild and recreate Docker components; keep database volume
	$(COMPOSE) up --build --force-recreate -d

docker-down: env-init ## Stop Docker components and keep database volume
	$(COMPOSE) down

docker-logs: env-init ## Follow Docker component logs
	$(COMPOSE) logs -f --tail=100

docker-status: env-init ## Show Docker component health and status
	$(COMPOSE) ps

docker-build: env-init ## Build Docker component images
	$(COMPOSE) build

docker-clean: env-init ## Remove Docker components and local database volume
	$(COMPOSE) down -v

down: env-init ## Stop services
	$(COMPOSE) down

logs: env-init ## Follow service logs
	$(COMPOSE) logs -f --tail=100

ps: env-init ## Show service status
	$(COMPOSE) ps

web: ## Run the web app locally
	cd web && pnpm dev --host 0.0.0.0

api: ## Run the Go API locally
	cd api && set -a && . ./.env && set +a && go run ./cmd/api

build: ## Build web and API
	cd web && pnpm build
	cd api && go build ./cmd/api

lint: ## Run frontend ESLint and Go vet
	cd web && pnpm lint
	cd api && go vet ./...

format: ## Format frontend sources and Go files
	cd web && pnpm format
	cd api && gofmt -w $$(find ./cmd -name '*.go' -type f)

format-check: ## Check frontend formatting and Go formatting
	cd web && pnpm format:check
	@test -z "$$(gofmt -l $$(find api/cmd -name '*.go' -type f))" || (gofmt -l $$(find api/cmd -name '*.go' -type f); exit 1)

vulncheck: ## Scan production web dependencies and Go modules
	cd web && pnpm audit --prod
	cd api && govulncheck ./...

api-format: ## Format Go source files
	cd api && gofmt -w $$(find ./cmd -name '*.go' -type f)

clean: env-init ## Stop services and remove local database volume
	$(COMPOSE) down -v
