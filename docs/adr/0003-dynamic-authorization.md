# 0003: Dynamic application authorization

- Status: Proposed
- Date: 2026-11-10

## Context

df-pmp needs configurable business roles and scoped access that may change as journeys are discovered. Company identity and business authorization have distinct owners.

## Decision

Entra ID establishes identity. Store df-pmp roles, permissions and relevant scope assignments in PostgreSQL. Use database-driven RBAC with resource/action scopes and consider ABAC only for justified rules. Enforce authorization in the Go API for every protected request; frontend checks are for presentation only.

## Alternatives considered

- Hardcoded roles and permissions: rejected because administrators need routine configuration without deployments.
- Entra groups as the complete business authorization model: not selected because detailed resource-level business scopes belong to df-pmp.
- Pure ABAC: deferred due to complexity before policies and journeys are known.

## Consequences

Configuration changes require careful validation, auditing, prompt effect and cache invalidation if caching is later used. Scope semantics, administrative safeguards and segregation-of-duties policy must be defined before implementation.

## Revisit when

Identity/security architecture review or validated journeys show that the proposed model cannot express required policy safely.
