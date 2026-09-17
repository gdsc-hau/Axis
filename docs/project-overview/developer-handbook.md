# Developer Handbook

This is the shortest path from a fresh clone to a reviewable Axis change. Use it
as the entry point, then follow the linked reference for the part of the system
you are changing.

## Understand Axis in five minutes

Axis is a pnpm and Turborepo monorepo with two Next.js applications and one
hosted Supabase backend:

- **GDG Hub** (`apps/gdg-hub`, port 3001) contains public content, authentication,
  the member portal, and administrator operations.
- **GDG ID** (`apps/gdg-id`, port 3000) displays and verifies digital member IDs.
- **Shared packages** (`packages/*`) contain reusable UI, validation, database
  access, authentication helpers, and domain rules.
- **Supabase** (`supabase/*`) contains the reproducible database history,
  verification SQL, Edge Functions, and templates.
- **Documentation** (`docs/*`) is the maintained operating manual. `site/` is
  generated output and is never edited or committed.

Both applications use the same `public.members` registry. Supabase Auth owns
credentials and sessions, while `members.auth_id` links an Auth user to the
permanent registry identity. A role alone does not grant access: the linked
member must also be `ACTIVE`.

## Set up a workstation

1. Install Git and Node.js 22. Corepack is included with Node.
2. Clone the repository and run `corepack enable`.
3. Run `pnpm install --frozen-lockfile` from the repository root.
4. Copy each required `.env.example` to `.env.local` in the same application.
5. Obtain approved **non-production** values from a maintainer through the
   team's private secret-sharing channel.
6. Start one app with `pnpm --filter gdg-hub dev` or
   `pnpm --filter gdg-id dev`.

See [Getting Started](getting-started.md) for exact commands and
[Environment Configuration](../runbooks/environment-configuration.md) for the
variable matrix. A local database service is not required for ordinary
development.

## Choose the correct owner

| You are changing                                       | Start here                                                                            | Main rule                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| A complete Hub page or route                           | `apps/gdg-hub/app/`                                                                   | Keep route behavior and product copy in the app.                |
| A GDG ID page or endpoint                              | `apps/gdg-id/src/app/`                                                                | Keep identity-specific composition in GDG ID.                   |
| Shared visual UI                                       | `packages/axis-ui/`                                                                   | Keep it presentational and independent of routing and Supabase. |
| Form or external payload validation                    | `packages/contracts/`                                                                 | Validate untrusted data with Zod at the boundary.               |
| Reusable Supabase access                               | `packages/db/`                                                                        | Export a typed domain function; do not scatter ad hoc queries.  |
| Authentication or role logic                           | `packages/auth/`                                                                      | Preserve active-member and active-admin checks.                 |
| Domain behavior                                        | The narrowest package: `events`, `points`, `marketplace`, `badges`, or `certificates` | Do not put pages in domain packages.                            |
| A user-click mutation                                  | An `actions.ts` beside the owning route                                               | Use a Server Action and re-check authorization on the server.   |
| A webhook, download, or external verification endpoint | An `app/api/**/route.ts` handler                                                      | Treat it as an explicit HTTP trust boundary.                    |
| A table, function, policy, grant, or index             | `supabase/migrations/` plus matching checks                                           | Never rely on an untracked Studio edit.                         |
| Operational or developer behavior                      | `docs/` and `mkdocs.yml`                                                              | Update docs in the same pull request.                           |

Applications never import from other applications. Packages never import from
applications. Import shared packages through their public exports instead of a
private `src/` path.

## Follow the normal request flow

For a protected interactive feature, the usual flow is:

```text
Page (Server Component)
  -> @hau/auth guard
  -> @hau/db typed read
  -> Client Component only for interaction
  -> route-adjacent Server Action
  -> Zod contract
  -> authorization check
  -> @hau/db function or audited Postgres RPC
  -> revalidate or redirect
```

Use a Route Handler only when an HTTP client outside the React application must
call the system, or when streaming a file. RLS remains the final database
authorization boundary even when application guards are present.

## Daily development loop

1. Pull the current integration branch and create a scoped branch such as
   `feat/...`, `fix/...`, `docs/...`, or `chore/...`.
2. Read the relevant architecture page and feature runbook before editing.
3. Make the smallest coherent change in the correct owner.
4. Test loading, empty, error, denied, and success states where they apply.
5. Run the focused workspace command while developing.
6. Run the repository checks before opening a pull request:

```bash
pnpm run format
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
```

Formatting modifies files, so inspect `git diff` afterward. For documentation
changes also run `pnpm docs:build`.

## Database changes

Frontend contributors do not need the Supabase CLI and must not modify the
shared schema through Studio. An authorized database change follows this order:

```text
preflight SQL -> CLI dry run -> approved backup -> migration push
-> verification SQL -> rollback-only smoke test -> Advisors/System Health
```

Only migration files are applied by `supabase db push`. Preflight, verification,
and smoke-test files are intentionally committed because they are the repeatable
deployment checks for every environment. Follow the complete
[Migration Workflow](../schema/migrations.md).

## Definition of done

A change is ready for review when:

- the behavior and its denied/error paths were tested;
- TypeScript, lint, tests, and relevant builds pass;
- public package exports and `workspace:*` dependencies are correct;
- environment examples contain names and placeholders only;
- migrations and their checks are committed together when the schema changes;
- documentation describes the current behavior and any deferred work;
- `git status --short` contains no `.env.local`, `.next`, `.turbo`, `site/`,
  Supabase temporary state, exports, screenshots with private data, or secrets.

## Where to go next

- [Application guides](../architecture/apps.md)
- [Shared packages](../architecture/packages.md)
- [API and data flow](../api/overview.md)
- [Authentication and RBAC](../architecture/auth-rbac.md)
- [Change Playbooks](../contributing/change-playbooks.md)
- [Local Development Runbook](../runbooks/local-dev.md)
- [Troubleshooting](../runbooks/troubleshooting.md)
