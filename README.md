# df-pmp

**Digital Finance – Project Management Platform** is a custom enterprise project management system for Dialog Finance. This repository contains the product documentation and an initial runnable web/API starter.

## Product direction

df-pmp will support configurable project, task, meeting, approval and administration journeys. Its modules, roles, permissions, meeting types, project structures and workflows must be configurable from data and administration capabilities rather than fixed in application code. The detailed journeys and policies remain to be confirmed with business stakeholders.

## Technology baseline

| Area | Baseline |
| --- | --- |
| Web | React + TypeScript, React Router |
| API | Go REST API |
| Data | PostgreSQL and versioned migrations |
| Identity | Microsoft Entra ID |
| Authorization | Database-driven RBAC with scoped access; ABAC where justified |
| Microsoft 365 | Centralized Microsoft Graph integration; SharePoint/OneDrive for documents |
| Reporting | Power BI integration |
| Deployment | Docker and Docker Compose for development; bank-approved production platform |
| Optional | Redis only when a demonstrated caching or background-job need exists |

Application directories are `web/` and `api/`. The login and workspace views are UI prototypes. Company sign-in, database persistence, configurable workflow execution and Microsoft 365 integration are not implemented yet. Docker Compose provides a local development environment.

## Getting started

Requirements: Docker Compose v2 and Python 3 (for generating a local database password). Node.js 22.12+, pnpm 11.12.0, Go 1.23+, and GNU Make are needed for local frontend/backend development.

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

The technology direction is a baseline, not a substitute for business discovery. Initial meeting categories are stored in API-served calendar data and rendered dynamically. Dashboard content, project data, calendar events, company identity and brand tokens live in editable JSON data/configuration files rather than React components or API handlers. Exact user journeys, approval rules, data retention, organizational scopes, Entra configuration, Microsoft Graph permissions, reporting needs, and production controls require stakeholder validation before implementation.
