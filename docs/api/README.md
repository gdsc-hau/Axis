# API and Integration Boundaries

Axis does not expose a general REST API. Server Components read data on the
server, and user-initiated changes normally use Server Actions. Route Handlers
are reserved for webhooks, downloads, Auth callbacks, and external verification.

- [API and Data Flow Overview](overview.md) explains how to choose a boundary.
- [Routes](routes.md) inventories the intentional HTTP endpoints.
- [Postgres Functions](functions.md) explains atomic database RPCs.
- [Bevy Events](../integrations/bevy-events.md) documents event ingestion.
- [Luma Attendance](../integrations/luma-attendance.md) documents the approved
  CSV workflow.

Every boundary validates untrusted data, rechecks authorization, returns only
the required fields, and keeps privileged credentials server-only.
