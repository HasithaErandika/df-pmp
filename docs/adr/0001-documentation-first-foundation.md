# 0001: Documentation-first foundation and repository names

- Status: Accepted for this project phase
- Date: 2026-11-10

## Context

The product direction is established, but internal business journeys and security policies have not yet been supplied. Premature implementation would risk encoding incorrect workflows and permissions.

## Decision

Create the README and a structured `docs/` set first. Document planned application directories as `web/` for React and `api/` for Go. Do not create application code during this phase.

## Alternatives considered

- Start implementation from assumed workflows: rejected because key business rules are not confirmed.
- Use `frontend/` and `backend/`: not selected because the requested directory names are `web/` and `api/`.

## Consequences

The repository can be reviewed for product, requirements, architecture and data-model direction before application scaffolding begins. Physical schema, API contracts and deployment configuration remain pending discovery and review.

## Revisit when

Business stakeholders approve initial journeys and implementation is authorized to begin.
