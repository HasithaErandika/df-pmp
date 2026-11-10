# 0005: MVP implementation baseline, preview sign-in and no Power BI

- Status: Proposed
- Date: 2026-11-10

## Context

The platform needed a runnable vertical slice (projects, work items, meetings, dashboard and audit) before the Entra tenant, Graph permissions and reporting needs are approved. The business has confirmed Power BI is not required.

## Decision

- Persist business records in PostgreSQL using embedded, versioned SQL migrations applied at API start under an advisory lock.
- Store roles, permissions and grants as data; every protected route declares the permission it requires and the API denies by default.
- Resolve identity through an `auth.Resolver` interface. `AUTH_MODE=preview` maps all requests to one seeded user for development; any other value rejects requests until an Entra ID resolver is implemented.
- Keep branding, status colours and workflow vocabularies (statuses, types, priorities, tones) in `api/config/app.json`, validated on each write.
- Provide reporting through in-application dashboards. Power BI is out of scope.

## Alternatives considered

- Hard-coded statuses in code: rejected; conflicts with the configurable-platform direction.
- An ORM or migration tool dependency: deferred; plain SQL with pgx keeps the dependency surface small.

## Consequences

Preview mode must never be enabled outside development. Workflow vocabularies are global rather than per-project until journeys are confirmed. Microsoft 365 integrations remain unimplemented.

## Revisit when

Entra tenant settings are approved, per-project workflows are required, or reporting needs exceed in-app dashboards.
