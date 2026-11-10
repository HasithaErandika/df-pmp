# 0002: Baseline technology and modular architecture

- Status: Proposed
- Date: 2026-11-10

## Context

The project brief selects a custom enterprise system and supplies a preferred technology baseline.

## Decision

Use React + TypeScript for the web application, Go for the REST API, PostgreSQL for business data, Microsoft Entra ID for authentication, Microsoft Graph as the primary Microsoft 365 integration interface, and Docker for containerized development. Use React Router and PostgreSQL migrations. Consider Redis only when a concrete need is established. Organize the planned code directories as `web/` and `api/`.

## Alternatives considered

- Power Apps or an existing project-management product: not selected; the chosen direction is a custom configurable platform.
- Plain JavaScript: TypeScript is preferred for the role-heavy, modular application.
- Redis from the start: deferred until a measured use case exists.

## Consequences

The initial system has clear application/data boundaries and can be modular without assuming microservices. Production hosting and bank-approved versions remain open. This ADR records the baseline, not final infrastructure approval.

## Revisit when

An approved enterprise architecture review identifies a material compatibility, supportability or security concern.
