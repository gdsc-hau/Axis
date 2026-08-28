# File and Directory Guide

This guide explains what the important repository paths are for, where new work belongs, and which local or generated files must not be committed.

## Top-level directories

| Path               | Purpose                             | Typical changes                                              |
| ------------------ | ----------------------------------- | ------------------------------------------------------------ |
| `apps/`            | Deployable Next.js products         | Pages, layouts, server actions, route handlers, product copy |
| `packages/`        | Reusable `@hau/*` libraries         | Shared UI, contracts, database modules, and domain behavior  |
| `supabase/`        | Database and Supabase server assets | Migrations, checks, Edge Functions, email templates          |
| `tests/`           | Cross-package and release tests     | Node test suites and intentionally tracked fixtures          |
| `docs/`            | MkDocs documentation source         | Architecture, runbooks, setup, and contribution guides       |
| `tooling/`         | Repository automation               | CI scripts, generators, and maintenance utilities            |
| `configs/`         | Workspace configuration inputs      | Shared tool configuration where applicable                   |
| `Source of Truth/` | Product and architecture references | Approved reference documents; not runtime code               |

## `apps/gdg-hub`

The Hub is the operational member and administrator application. It runs locally on port 3001.

| Path            | Use                                                                                      |
| --------------- | ---------------------------------------------------------------------------------------- |
| `app/(auth)/`   | Login, recovery, reset, verification, and activation routes                              |
| `app/(public)/` | Public event and article experiences                                                     |
| `app/admin/`    | Administrator pages and adjacent server actions                                          |
| `app/member/`   | Authenticated member portal pages and adjacent server actions                            |
| `app/api/`      | Narrow HTTP boundaries for third-party integrations, downloads, or external verification |
| `middleware.ts` | Session refresh and role/status route protection                                         |
| `lib/`          | Hub-only helpers and compositions                                                        |
| `public/`       | Static Hub assets                                                                        |
| `.env.example`  | Documented Hub environment-variable names; contains placeholders only                    |
| `package.json`  | Hub dependencies and the port-3001 development command                                   |

Use Server Actions for user-initiated mutations inside the application. Reserve route handlers for real HTTP boundaries such as integration webhooks, certificate downloads, and external verification. Do not bypass `middleware.ts` redirects when adding protected routes.

## `apps/gdg-id`

GDG ID renders and verifies the member's digital identity. It runs locally on port 3000.

| Path              | Use                                                                       |
| ----------------- | ------------------------------------------------------------------------- |
| `src/app/`        | App Router pages, layouts, and route handlers                             |
| `src/components/` | GDG ID-specific compositions                                              |
| `src/lib/`        | GDG ID-only helpers                                                       |
| `public/`         | Static identity assets                                                    |
| `.env.example`    | Documented environment-variable names, including QR signing configuration |
| `package.json`    | Application dependencies and scripts                                      |

Registry identity comes from `public.members`; do not create a second profile table or let editable profile forms overwrite registry-owned names, IDs, programs, departments, or email addresses.

## Shared packages

| Package                      | Responsibility                                                           |
| ---------------------------- | ------------------------------------------------------------------------ |
| `packages/auth`              | Shared authentication helpers and authorization-facing types             |
| `packages/axis-ui`           | Design tokens, primitives, icons, and reusable presentational components |
| `packages/badges`            | Shared badge recognition rules and types                                 |
| `packages/certificates`      | Certificate-generation and verification support                          |
| `packages/config`            | Shared linting, formatting, and repository configuration                 |
| `packages/contracts`         | Zod schemas and types at application/domain boundaries                   |
| `packages/db`                | Supabase clients, environment guards, database types, and domain queries |
| `packages/events`            | Shared event and attendance domain behavior                              |
| `packages/marketplace`       | Reward catalog and redemption domain behavior                            |
| `packages/points`            | Gyrocoin ledger types and calculations                                   |
| `packages/pwa`               | Progressive Web App configuration helpers                                |
| `packages/types`             | General TypeScript types that do not belong to a narrower contract       |
| `packages/typescript-config` | Base TypeScript configurations                                           |

Every package exposes a deliberately small public API. Add exports to the package's supported entry point when a capability becomes shared. Do not import a private file by reaching into another package's `src/` tree.

### Important `packages/db` files

| File or area                                                                | Use                                                           |
| --------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `src/env.ts`                                                                | Separates browser-safe configuration from server-only secrets |
| `src/database.types.ts`                                                     | Supabase database types used by query modules                 |
| `src/index.ts`                                                              | Supported database-package exports                            |
| Domain modules such as `events.ts`, `notifications.ts`, or `recognition.ts` | Typed reads and RPC calls for one business area               |

Pages should call these modules instead of constructing unrelated ad hoc queries throughout the app. When a schema migration changes a type, update the database types and affected domain modules in the same pull request.

## `supabase`

| Path                         | Use                                                              | Commit? |
| ---------------------------- | ---------------------------------------------------------------- | ------- |
| `config.toml`                | Supabase CLI project configuration                               | Yes     |
| `migrations/*.sql`           | Ordered database schema, function, RLS, grant, and index history | Yes     |
| `preflight/*_preflight.sql`  | Read-only checks that prove a migration is safe to apply         | Yes     |
| `preflight/*_verify.sql`     | Post-deployment structural and security verification             | Yes     |
| `preflight/*_smoke_test.sql` | Transactional behavioral tests whose fixture writes roll back    | Yes     |
| `functions/*/index.ts`       | Supabase Edge Function implementations                           | Yes     |
| `functions/.env.example`     | Placeholder names for Edge Function secrets and feature gates    | Yes     |
| `templates/`                 | Auth and email templates controlled by the project               | Yes     |
| `.temp/`                     | Local CLI state and version markers                              | No      |

Migrations and checks remain necessary after they are applied remotely. They let reviewers understand the deployed schema, allow a new environment to reproduce it, and protect later changes from assuming the wrong baseline.

Never store exported member data, access tokens, database passwords, service-role keys, or provider secrets under `supabase/`.

## `tests`

Repository tests use Node's test runner with TypeScript stripping. Files matching `tests/*.test.mts` run through `pnpm test`.

Tracked fixtures under `tests/fixtures/` must be synthetic and secret-free. A fixture may resemble an external payload, but it must not contain real member personal data, live signatures, or reusable tokens. Temporary screenshots and manual exports do not belong in this directory.

## `docs`

`docs/` is the only handwritten documentation source. `mkdocs.yml` defines navigation, and `docs/requirements.txt` pins the documentation dependencies.

```bash
python -m pip install -r docs/requirements.txt
pnpm docs:serve
```

The generated `site/` directory is disposable output. Do not edit or commit it.

## Root files

| File                     | Use                                                           |
| ------------------------ | ------------------------------------------------------------- |
| `package.json`           | Node requirement, pinned pnpm version, and root task commands |
| `pnpm-workspace.yaml`    | Declares application, package, and config workspaces          |
| `pnpm-lock.yaml`         | Exact dependency graph; update through pnpm only              |
| `turbo.json`             | Task ordering, cache output, and global environment inputs    |
| `.node-version`          | Team Node 22 baseline                                         |
| `.gitignore`             | Local secret, cache, build, and generated-output exclusions   |
| `env.example`            | Operator-only root variable names for linked database tooling |
| `mkdocs.yml`             | Documentation site configuration and navigation               |
| `README.md`              | First-run repository overview                                 |
| `CONTRIBUTING.md`        | Branch, commit, review, and pull-request workflow             |
| `GDG_SOURCE_OF_TRUTH.md` | Product data ownership decisions                              |

## Local and generated files

These files are expected on a developer machine but must not be staged:

- `.env`, `.env.local`, and other real environment files
- `node_modules/`
- `.next/` and `.next-stale-*/`
- `.turbo/`
- `site/`
- `coverage/`
- `*.tsbuildinfo`
- `supabase/.temp/`
- Database dumps, CSV exports, and manual test screenshots unless a maintainer explicitly requests a sanitized fixture

Use `git status --short` before every commit. If a generated file appears, fix the ignore rule or unstage the file rather than treating it as source.

## Where should a change go?

| Change                                          | Correct owner                                              |
| ----------------------------------------------- | ---------------------------------------------------------- |
| New Hub admin screen                            | `apps/gdg-hub/app/admin/`                                  |
| New Hub member screen                           | `apps/gdg-hub/app/member/`                                 |
| Public Hub article or event page                | `apps/gdg-hub/app/(public)/`                               |
| Reusable button, card, dialog, or token         | `packages/axis-ui`                                         |
| Shared form validation                          | `packages/contracts`                                       |
| Supabase read or RPC wrapper                    | `packages/db`                                              |
| Database column, function, RLS, grant, or index | `supabase/migrations` plus checks                          |
| Third-party webhook receiver                    | A narrowly scoped `app/api/` route plus contract and tests |
| User-click mutation                             | A Server Action beside the owning route                    |
| Cross-app domain rule                           | The narrowest matching `packages/*` owner                  |
| Setup or operational knowledge                  | `docs/` and the `mkdocs.yml` navigation                    |

## Frontend development contract

Frontend contributors can work safely without rewriting backend logic:

1. Run the relevant app with approved non-production environment values.
2. Import reusable UI from `@hau/axis-ui`.
3. Validate boundary data with `@hau/contracts`.
4. Read and mutate backend state through the supported `@hau/db` modules and route-adjacent Server Actions.
5. Keep placeholder layouts replaceable while UI/UX finalizes designs.
6. Never import the service-role key into a Client Component or add privileged values to `NEXT_PUBLIC_*` variables.
7. Preserve loading, empty, error, unauthorized, and success states so backend work remains testable before final visual design.
