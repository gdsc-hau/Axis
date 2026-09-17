# GDG HAU Axis documentation

This site is the development and operations reference for the GDG HAU Axis platform.

Axis currently provides a member registry and invitation-gated account flow, the GDG ID experience, mirrored GDG Community events with Luma registration links, attendance imports, Gyrocoin wallets, rewards, badges, certificates, notifications, articles, reports, portal settings, and system-health checks.

## Start here

- [Developer handbook](project-overview/developer-handbook.md) gives a
  five-minute system model, task-routing table, normal request flow, and
  definition of done.
- [Getting started](project-overview/getting-started.md) explains the required tools, environment files, and local app commands.
- [File and directory guide](project-overview/file-and-directory-guide.md) explains what the important repository files do and where new code belongs.
- [Repository layout](project-overview/repository-layout.md) describes workspace ownership and dependency direction.
- [Coding standards](contributing/standards.md) defines the TypeScript, Next.js, Supabase, security, testing, and review rules.
- [Local development](runbooks/local-dev.md) provides the daily development workflow and troubleshooting checks.
- [Environment configuration](runbooks/environment-configuration.md) lists application and server-only environment variables.

## Reference sections

- [Product](product/platform.md): applications, roles, and user flows.
- [Architecture](architecture/overview.md): system boundaries and data flow.
- [Applications](architecture/apps.md): responsibilities of `gdg-hub` and `gdg-id`.
- [Shared packages](architecture/packages.md): reusable package responsibilities and import rules.
- [API](api/overview.md): Server Actions, route handlers, and external integrations.
- [Data and schema](schema/overview.md): Supabase tables, policies, and migrations.
- [Runbooks](runbooks/local-dev.md): development, feature operation, release, and troubleshooting procedures.
- [Contributing](contributing/standards.md): code, UI/UX, documentation, and pull-request requirements.
- [Change playbooks](contributing/change-playbooks.md): implementation checklists
  for pages, Server Actions, integrations, migrations, dependencies, and docs.

## Documentation commands

From the repository root:

```bash
python -m pip install -r docs/requirements.txt
pnpm docs:serve
```

Open `http://127.0.0.1:8000`. Validate documentation changes with:

```bash
pnpm docs:build
```

Update the relevant guide in the same pull request whenever behavior, configuration, schema, or an operational procedure changes.
