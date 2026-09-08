# Runbooks

Runbooks describe repeatable development, operations, and release procedures.
Follow the named order, confirm the target environment, and save evidence without
copying secrets or private member data into Git.

## Developer operations

- [Local development](local-dev.md): daily setup, commands, and validation.
- [Environment configuration](environment-configuration.md): variable names,
  exposure, ownership, and feature gates.
- [Troubleshooting](troubleshooting.md): common local, Auth, database, and docs
  failures.

## Feature operations

- [Member portal operations](member-portal-operations.md)
- [Rewards and redemptions](rewards-redemptions.md)
- [Notifications and communications](notifications-communications.md)
- [Article content publishing](article-content-publishing.md)
- [Reporting and analytics](reporting-analytics.md)
- [System readiness](system-readiness.md)
- [Bevy event mirror](../integrations/bevy-events.md)
- [Luma attendance](../integrations/luma-attendance.md)

## Release operations

- [Deployment](deployment.md): local gates, hosted reconciliation, preview,
  promotion, and rollback.
- [Final acceptance audit](final-acceptance.md): complete release evidence.
- [Security deployment](security-deployment.md): security-sensitive setup and
  checks.

Database operators must also follow the [Migration Workflow](../schema/migrations.md)
for preflight, migration, verification, and smoke-test SQL.
