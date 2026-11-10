# Microsoft 365 integrations

**Status:** Not implemented. Every integration below needs the company Entra tenant, an app registration, approved Graph permissions and (for SharePoint) a provisioned site. Reporting is in-application; Power BI is out of scope (ADR 0005).

Implementation slot: sign-in plugs into the API's `auth.Resolver` interface (`api/internal/auth`), which currently uses a development-only preview resolver. Microsoft calls should live in a new `api/internal/integrations/microsoft` package.

## Integration boundary

All Microsoft 365 communication should be centralized behind an `integrations/microsoft` area within the Go API. Domain modules should call narrow internal interfaces rather than construct Graph requests directly. Centralization supports consistent credentials, telemetry, retry limits, throttling handling, permission review and provider testing.

## Services and candidate uses

| Service | Candidate use | Design note |
| --- | --- | --- |
| Entra ID | Company sign-in and identity claims | Validate issuer, tenant, audience, signature and token lifetime according to selected flow. |
| Microsoft Graph | Primary Microsoft 365 API | Use least privilege and only approved scopes. |
| SharePoint | Project/meeting document libraries and files | Store stable site, drive and item identifiers; avoid copying document bodies into app DB. Evaluate selected-site permissions. |
| OneDrive | User or shared-file references where approved | Clarify ownership, delegated access and lifecycle behavior. |
| Outlook Calendar | Create/update meeting events and attendees | Define source of truth, conflict handling, cancellations and synchronization. |
| Teams | Online meeting links/collaboration | Tenant policy and Graph permission support must be verified for the chosen operation. |

Graph should be the primary interface. Use a service-specific API only when an approved requirement is not adequately supported by Graph.

## Credential models

- **Delegated access:** an operation runs with the signed-in user's authority and consent/policy. Appropriate for user-owned actions where user context is needed.
- **Application access:** a service performs approved background operations without a signed-in user. Requires explicit administrator approval, least privilege, credential protection and operational ownership.

Keep these paths and permissions distinct. Do not request broad tenant access by default. For SharePoint background access, evaluate resource-specific approaches such as selected-site permissions with the tenant administrators.

## Reliability and data mapping

For external resources, retain provider and tenant context, stable resource IDs, a resource type, owning df-pmp record, last synchronization state/time and error metadata as appropriate. Treat display names and URLs as mutable attributes. Define idempotency, retry/backoff, throttling, reconciliation and duplicate-event behavior. Webhooks and delta queries may be considered when a confirmed synchronization journey needs them.

## Open integration decisions

Required Graph endpoints and permissions, app registration ownership, consent process, certificate/secret storage, SharePoint site provisioning, calendar source of truth, Teams meeting policy, webhook hosting, Power BI architecture and data refresh cadence remain unconfirmed.
