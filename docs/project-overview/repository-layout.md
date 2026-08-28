# Repository Layout

Axis is a pnpm workspace and Turborepo monorepo. Product applications live in `apps/`; stable reusable capabilities live in `packages/`; database history lives in `supabase/`; cross-application tests live in `tests/`; and handwritten documentation lives in `docs/`.

```text
Axis/
|-- apps/                 Product applications
|   |-- gdg-hub/          Member and administrator portal
|   `-- gdg-id/           Digital member ID application
|-- packages/             Shared internal packages published as @hau/*
|-- supabase/             Migrations, checks, functions, and templates
|-- tests/                Repository-level tests and fixtures
|-- docs/                 MkDocs source
|-- tooling/              CI and maintenance utilities
|-- Source of Truth/      Product and architecture reference material
|-- package.json          Root commands and toolchain requirements
|-- pnpm-workspace.yaml   Workspace membership
`-- turbo.json            Task dependency and cache rules
```

For a file-by-file explanation, generated-file policy, and guidance on where to implement a change, see the [File and Directory Guide](file-and-directory-guide.md).

## Ownership boundaries

Code begins in the narrowest correct owner:

- Complete pages, route-aware navigation, application copy, and product-specific server actions stay in the relevant application.
- Reusable visual primitives and design tokens belong in `packages/axis-ui`.
- Shared input/output validation belongs in `packages/contracts`.
- Supabase clients, generated database types, and domain query modules belong in `packages/db`.
- Stable shared domain behavior belongs in the matching package, such as `events`, `points`, `marketplace`, `badges`, or `certificates`.

Applications do not import from other applications. Packages do not import from applications. Consumers import a package's supported public API, normally through its package export or `src/index.ts`, rather than deep-importing internal files.

## Workspace dependencies

Internal packages use the `@hau/*` scope and the `workspace:*` version range:

```json
{
  "dependencies": {
    "@hau/axis-ui": "workspace:*",
    "@hau/db": "workspace:*"
  }
}
```

This ensures pnpm links the local package and lets Turborepo understand the dependency graph. Add a dependency to the owning workspace instead of the repository root unless it is genuinely a root tool.

## Task orchestration

The root scripts delegate to Turborepo:

- `pnpm dev` runs persistent development tasks.
- `pnpm build` builds packages and applications in dependency order.
- `pnpm lint` runs workspace lint checks.
- `pnpm typecheck` runs TypeScript checks.
- `pnpm test` runs repository-level Node test suites.
- `pnpm format` formats supported TypeScript and Markdown files.

Turborepo cache output and application build output are local artifacts. They are not source files and must not be committed.

## Why this structure matters

1. **Clear ownership:** Product code stays close to its route while shared behavior has one maintained implementation.
2. **Safe database access:** Apps use shared environment guards and database modules instead of duplicating privileged clients.
3. **Atomic changes:** A shared contract, implementation, test, migration, and consuming screen can change in one pull request.
4. **Independent frontend work:** UI contributors can build against exported contracts and placeholder data without rewriting backend rules.
5. **Consistent verification:** The same root commands validate every workspace before review.
