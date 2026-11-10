# df-pmp documentation

This documentation captures the current product direction and an initial technical design. It is deliberately a foundation for discovery, not a claim that unconfirmed bank processes have been approved.

## Documents

| Document | Purpose |
| --- | --- |
| [Product overview](product-overview.md) | Goals, boundaries, users, modules and success measures |
| [SRS](srs.md) | Functional and non-functional requirements, assumptions and acceptance direction |
| [Architecture](architecture.md) | System boundaries, components, deployment shape and key flows |
| [Domain and data model](data-model.md) | Initial conceptual entities and relational design guidance |
| [Authorization](authorization.md) | Dynamic roles, permissions, scope evaluation and enforcement |
| [Workflows and journeys](workflows-and-journeys.md) | Configurable workflow principles and a template for business discovery |
| [Integrations](integrations.md) | Entra ID, Graph, SharePoint, Outlook, Teams and Power BI boundaries |
| [Security and operations](security-and-operations.md) | Security, audit, deployment and operational requirements |
| [ADRs](adr/README.md) | Recorded architecture decisions and their status |
| [Open questions](open-questions.md) | Items requiring business, security or infrastructure input |

## Status convention

- **Established direction**: explicitly stated in the project brief.
- **Proposed**: recommended starting design that needs review.
- **Open**: must be answered by stakeholders before the relevant implementation is finalized.

The proposed directory layout is `web/` for React and `api/` for Go. No application code is included in this documentation phase.
