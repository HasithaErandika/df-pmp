# Open questions and decision register

This list identifies information needed to turn the current baseline into an approved specification. Items should be assigned to named business, identity, security, data, Microsoft 365 or infrastructure owners.

## Business journeys

- What is the current user onboarding, role assignment and offboarding process?
- Who owns ITSSC and Operations meeting scheduling, minutes approval and action-item follow-up?
- What are project intake, prioritization, approval, stage gates, closure and cancellation rules?
- How are task lists created, dependencies managed, overdue work escalated and completion accepted?
- Which decisions require approval, by whom, with what delegation and rejection/rework path?
- What notifications are required, through which channels, and what are the urgency rules?

## Authorization and organization

- What organizational boundaries exist (department, branch, team, cost center, legal entity)?
- Which roles and permission combinations are prohibited by segregation-of-duties policy?
- Who can grant, approve, review and revoke privileged access?
- Are Entra groups synchronized to df-pmp, or are assignments managed only in the platform?
- What is the policy for temporary access, delegated ownership, emergency access and periodic recertification?

## Data and reporting

- What classifications and personal or confidential data may be stored in projects and meeting records?
- What are retention, archival, deletion, legal hold, backup and audit evidence requirements?
- Which portfolio KPIs and reports are required, who may see them, and what export controls apply?
- What are expected user counts, project volumes, concurrency and performance targets?

## Technology and operations

- Is BFF session architecture required by security, or is SPA authorization-code-with-PKCE acceptable?
- Which Entra tenant/app registration, MFA and Conditional Access policies apply?
- Which Graph operations are required and what delegated/application permissions can be approved?
- Which SharePoint site/library provisioning and selected-site access pattern will be used?
- How should Outlook/Teams events synchronize when changes are made in either system?
- How will Power BI access data: governed database/read model, API, or another approved route?
- What production hosting, ingress, secret store, logging/SIEM, monitoring and recovery standards apply?

## Decisions to record

Use an ADR for durable technical choices and a business policy record for process decisions. Each item should include owner, date, status, alternatives, rationale, impact and any review trigger.
