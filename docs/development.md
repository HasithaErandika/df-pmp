# Local development

## Prerequisites

- Docker Engine with Docker Compose v2
- Node.js 22.12 or newer and pnpm 11.12.0 (for running/building `web/` outside Docker)
- Go 1.25+ (for running/building `api/` outside Docker)
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
make db     # start only PostgreSQL in Docker
make api    # runs migrations, seeds demo data, serves http://localhost:8080
make web
```

On start the API applies embedded SQL migrations (`api/internal/database/migrations`) and, when `SEED_DEMO_DATA=true` and the database is empty, loads `api/internal/database/seed/demo.sql`. Branding, status colours and workflow vocabularies (project/work statuses, work types, priorities, colours) live in `api/config/app.json` and are read on each request, so they can change without a deployment.

### Sign-in

- `AUTH_MODE=preview` (development only): the sign-in page lists the roles from the database; clicking one starts a server-side session as the first active user holding that role (a `Demo <Role>` user is created if none exists). There is no identity check, so never use it outside development.
- `AUTH_MODE=entra`: Microsoft Entra ID sign-in with server-side sessions. See [integrations](integrations.md) for tenant setup, permissions and settings.
- Any other value rejects all requests.

Administrators (role `administrator`) always hold every permission.

### API overview

| Method and path | Permission |
| --- | --- |
| `GET /healthz`, `GET /readyz`, `GET /api/v1/config` | public |
| `GET /api/v1/me` | authenticated |
| `GET /api/v1/dashboard`, `GET /api/v1/users` | `project:view` |
| `GET/POST /api/v1/projects`, `GET/PUT/DELETE /api/v1/projects/{id}` | `project:view/create/update/delete` |
| `GET/POST /api/v1/work-items` (`?projectId=`, `?assignee=me`), `GET/PUT/DELETE /api/v1/work-items/{id}` | `work:view/create/update/delete` |
| `GET /api/v1/meeting-types`, `GET/POST /api/v1/meetings` (`?from=&to=`), `GET/PUT/DELETE /api/v1/meetings/{id}` | `meeting:view/create/update/delete` |
| `GET /api/v1/tracker/boards`, `GET /api/v1/tracker/boards/{board}/tasks`, `GET /api/v1/tracker/tasks/{id}/updates` | `tracker:view` |
| `POST /api/v1/tracker/tasks`, `PUT/DELETE /api/v1/tracker/tasks/{id}`, `POST /api/v1/tracker/tasks/{id}/updates` | `tracker:create/update/delete` (notes need `tracker:update`) |
| `GET/POST /api/v1/tracker/releases`, `PUT/DELETE /api/v1/tracker/releases/{id}` | `tracker:view/create/update/delete` |
| `GET /api/v1/auth/dev-roles`, `POST /api/v1/auth/dev-login`, `POST /api/v1/auth/logout` | public, `AUTH_MODE=preview` only |
| `GET /api/v1/activity/{type}/{id}` | `audit:view` |
| `GET /api/v1/auth/status`, `GET /api/v1/auth/login`, `GET /api/v1/auth/callback`, `POST /api/v1/auth/logout` | public (sign-in flow) |
| `GET /api/v1/directory/people?q=` / `POST /api/v1/directory/people` | `project:view` / `directory:search` |
| `POST /api/v1/meetings/{id}/outlook-sync`, `GET /api/v1/outlook/events?from=&to=` | `meeting:update` / `meeting:view` |
| `GET/POST /api/v1/projects/{id}/documents` | `document:view` / `document:upload` |
| `GET /api/v1/admin/users`, `GET /api/v1/admin/roles`, `PUT /api/v1/admin/users/{id}`, `GET /api/v1/admin/integrations` | `user:manage` |

Validation errors return `422` with `{ "error": "...", "fields": { "name": "..." } }`. Every create, update and delete writes an `audit_events` row in the same transaction.

## Code quality and dependency security

Use `make test`, `make lint`, `make format`, `make format-check`, and `make vulncheck`. Keep every source file under 200 lines; split by feature or component when a file grows. The web quality checks use ESLint and Prettier; Go source is checked with `gofmt` and `go vet`. `make vulncheck` runs `pnpm audit --prod` and requires the Go `govulncheck` tool to be installed (`go install golang.org/x/vuln/cmd/govulncheck@latest`).

## UI direction

The interface follows the df-ipam visual language: light enterprise workspace, IBM Plex typography, a 60px bordered sidebar header with a collapsible rail, restrained panels, clear data tables with pagination and explicit status indicators. The sign-in page pairs a decorative schedule field with a focused form column. The df-pmp logo (`web/public/df-pmp-symbol.svg`) is an original Gantt-style mark.

### Frontend structure

| Folder | Contents |
| --- | --- |
| `web/src/components/ui` | Reusable primitives: Button, Panel, Field, Modal, ConfirmDialog, Pagination, Filters, States, Badges, MetricCard |
| `web/src/components/layout` | AppShell, Sidebar, Topbar |
| `web/src/context` | Config/theme, session/permissions, toasts |
| `web/src/hooks` | `useQuery` (cached fetch + invalidation), `useForm`, reference data, stored state |
| `web/src/components/charts` | Lightweight SVG/HTML charts: DonutChart, BarList, BulletBar (palette validated for colour-vision deficiency) |
| `web/src/features/*` | Route pages and feature components: auth, dashboard, projects, work, meetings |
| `web/src/styles` | Tokens and stylesheets split by concern, imported via `index.css` |

The UI hides actions the user lacks permission for, but the API remains the authority.
