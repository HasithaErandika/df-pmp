# Local development

## Prerequisites

- Docker Engine with Docker Compose v2
- Node.js 22.12 or newer and pnpm 11.12.0 (for running/building `web/` outside Docker)
- Go 1.23+ (for running/building `api/` outside Docker)
- GNU Make

## Start the stack

```sh
make dev
```

Make creates `api/.env` and `web/.env` on first use and generates a random local database password in the API environment file. Both files are ignored by Git. Docker-specific targets include `make docker-up`, `make docker-restart`, `make docker-down`, `make docker-status`, `make docker-logs`, `make docker-build`, and `make docker-clean`.

Backend and Compose settings are kept in `api/.env.example` and its local `api/.env`; public Vite settings are kept in `web/.env.example` and its local `web/.env`. No environment file is stored at the repository root. `make` passes the API environment file to Compose for variable interpolation.

Open <http://localhost:5173>. The API health endpoint is <http://localhost:8080/healthz>; PostgreSQL is published on port 5432 for local development. Use `make down` to stop, `make logs` to follow logs, and `make clean` to remove containers and the local database volume. `make clean` deletes local database contents.

## Run components directly

```sh
make install
make api
make web
```

Dashboard and project examples live in `api/data/dashboard.json`; calendar events live in `api/data/calendar.json`; company identity and Axiata color tokens live in `api/config/app.json`. The API reads these files at request time. The API does not yet persist data or connect to PostgreSQL. Microsoft Entra ID authentication, authorization, migrations and business endpoints are future implementation work. The login screen validates email input, labels preview access clearly, and does not emulate a real company sign-in.

## Code quality and dependency security

Use `make lint`, `make format`, `make format-check`, and `make vulncheck`. The web quality checks use ESLint and Prettier; Go source is checked with `gofmt` and `go vet`. `make vulncheck` runs `pnpm audit --prod` and requires the Go `govulncheck` tool to be installed (`go install golang.org/x/vuln/cmd/govulncheck@latest`).

## UI direction

The interface follows the df-ipam visual language: light enterprise workspace, compact IBM Plex typography, restrained panels, clear data tables and explicit status indicators. Axiata Blue and Red are the principal accents; other supplied brand colors are available as theme tokens. The project timeline and calendar are adapted for project delivery. The df-pmp logo is an original vector mark. No organization setup journey is included.

Dashboard, project, work item, calendar, company identity, status colors and brand theme values are read from JSON under `api/data/` and `api/config/`, not embedded as sample records in React or API handler logic. Replace these sample data files with approved business data sources as persistence is implemented.
