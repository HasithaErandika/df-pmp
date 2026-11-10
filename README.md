# df-pmp

**Digital Finance – Project Management Platform** is a custom enterprise project management system for Dialog Finance. This repository contains the product documentation and an initial runnable web/API starter.

## Product direction

df-pmp will support configurable project, task, meeting, approval and administration journeys. Its modules, roles, permissions, meeting types, project structures and workflows must be configurable from data and administration capabilities rather than fixed in application code. The detailed journeys and policies remain to be confirmed with business stakeholders.

## Technology baseline

| Area | Baseline |
| --- | --- |
| Web | React + TypeScript, React Router |
| API | Go REST API (pgx, embedded SQL migrations) |
| Data | PostgreSQL and versioned migrations |
| Identity | Microsoft Entra ID |
| Authorization | Database-driven RBAC with scoped access; ABAC where justified |
| Microsoft 365 | Centralized Microsoft Graph integration; SharePoint/OneDrive for documents |
| Reporting | In-application dashboards (Power BI not required) |
| Deployment | Docker and Docker Compose for development; bank-approved production platform |
| Optional | Redis only when a demonstrated caching or background-job need exists |

Application directories are `web/` and `api/`. Implemented: PostgreSQL persistence with migrations, database-driven roles and permissions, projects, work items, typed meetings (ITSSC, Operations) with participants, a live dashboard, an audit trail, and a responsive web UI. Not yet implemented: Microsoft Entra ID sign-in (a development-only preview sign-in is used), Microsoft Graph/SharePoint/Outlook/Teams integration, and configurable workflow execution. Power BI is not required.

## Getting started

Requirements: Docker Compose v2 and Python 3 (for generating a local database password). Node.js 22.12+, pnpm 11.12.0, Go 1.25+, and GNU Make are needed for local frontend/backend development.

```sh
make help
make dev             # Build and start web, API and PostgreSQL
make docker-restart  # Rebuild and recreate services, preserving database volume
```

The first `make` command creates `api/.env` and `web/.env`; the backend config gets a generated PostgreSQL password. The web UI is available at <http://localhost:5173>, the API at <http://localhost:8080>, and PostgreSQL at `localhost:5432` for local development. See [development setup](docs/development.md) for details.

## Documentation

- [Documentation index](docs/README.md)
- [Product overview and scope](docs/product-overview.md)
- [Software requirements specification](docs/srs.md)
- [Architecture](docs/architecture.md)
- [Domain and database design](docs/data-model.md)
- [Authorization model](docs/authorization.md)
- [Workflow and business journeys](docs/workflows-and-journeys.md)
- [Microsoft 365 integration](docs/integrations.md)
- [Security and operations](docs/security-and-operations.md)
- [Architecture decision records](docs/adr/README.md)
- [Open questions and decisions](docs/open-questions.md)

## Status

Working MVP on top of the documented baseline. Branding, status colours and workflow vocabularies live in `api/config/app.json`; demo records are seeded from `api/internal/database/seed/demo.sql` only when `SEED_DEMO_DATA=true`. Exact user journeys, approval rules, data retention, organizational scopes, Entra configuration, Microsoft Graph permissions and production controls still require stakeholder validation. See [open questions](docs/open-questions.md) and [ADR 0005](docs/adr/0005-implementation-baseline.md).
