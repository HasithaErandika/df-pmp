# 0004: Central Microsoft 365 integration boundary

- Status: Proposed
- Date: 2026-11-10

## Context

The platform may interact with SharePoint, OneDrive, Outlook, Teams, and Entra ID. Scattering provider calls across domain modules would complicate permissions, failure handling and change management.

## Decision

Centralize Microsoft 365 calls behind a dedicated integration area in the Go API. Use Microsoft Graph as the primary interface, with specific service APIs only where an approved use case requires capabilities Graph does not provide. Keep delegated-user access and application/background access separate.

## Alternatives considered

- Direct Graph calls from each business module: rejected due to duplicated credential and reliability logic.
- Copy documents into PostgreSQL: rejected; retain managed documents in SharePoint/OneDrive and store stable references.

## Consequences

The integration boundary must handle least privilege, consent, throttling, retries, stable resource IDs and synchronization state. Exact permissions and synchronization behavior depend on tenant and business review.

## Revisit when

An approved integration requirement cannot be served through this boundary or the enterprise Microsoft architecture mandates another pattern.
