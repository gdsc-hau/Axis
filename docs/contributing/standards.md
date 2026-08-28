# Coding Standards

These standards keep Axis safe to change while the backend and final UI/UX are developed in parallel. They apply to applications, packages, database work, tests, and documentation.

## Ownership and dependency boundaries

- Put product routes, complete screens, route-aware navigation, and application copy in the owning `apps/*` workspace.
- Put reusable presentational components and design tokens in `packages/axis-ui`.
- Put shared input and output validation in `packages/contracts`.
- Put Supabase clients, database types, and reusable domain queries in `packages/db`.
- Put stable cross-application domain rules in the narrowest matching package.
- Applications must not import another application.
- Packages must not import from applications.
- Import packages through their supported exports. Do not deep-import another package's private `src/` files.
- Internal dependencies use `workspace:*` and belong in the consuming workspace's `package.json`.

See the [File and Directory Guide](../project-overview/file-and-directory-guide.md) for concrete examples.

## TypeScript and validation

- TypeScript strict mode stays enabled.
- Do not use `any` when `unknown`, a generic, or a defined domain type is appropriate.
- Do not suppress errors with `@ts-ignore`. A rare suppression requires a specific explanation and a test that protects the boundary.
- Validate untrusted form, webhook, URL, CSV, and integration input with Zod schemas from `@hau/contracts` or a route-local schema that is not shared yet.
- Keep database row types separate from public response contracts. Return only the fields the caller needs.
- Prefer explicit, small functions and domain-specific names over broad utility modules.

## React and Next.js

- Use Server Components by default.
- Add `'use client'` only when a component needs browser APIs, client state, effects, or event handlers.
- Use Server Actions for authenticated, user-initiated mutations within the Hub.
- Use route handlers only for genuine HTTP boundaries such as third-party webhooks, private file downloads, or external verification endpoints.
- Keep data reads on the server unless the feature specifically requires client-side fetching.
- Preserve loading, empty, error, unauthorized, and success states. Placeholder visual design must still expose backend behavior clearly.
- Keep accessibility in the implementation: labels, keyboard operation, focus behavior, semantic headings, and meaningful status text are required before final styling.
- Do not weaken the route protection or session refresh behavior in `apps/gdg-hub/middleware.ts`.

## Supabase and PostgreSQL

- `public.members` is the identity registry and source of truth. Editable profiles must not overwrite registry-owned identity fields.
- Every exposed table requires Row Level Security and explicit least-privilege policies.
- Browser code uses the anon key and RLS. It must never receive the service-role key or other privileged credentials.
- Security-definer helpers belong in an unexposed schema, use a controlled empty search path, enforce authorization internally, and expose only the minimum safe wrapper.
- Revoke direct table writes when an audited RPC is the intended mutation path.
- Use `snake_case` for new database objects. Preserve existing names through compatibility migrations instead of silently renaming deployed objects.
- Foreign-key columns and production query paths need reviewed indexes. Do not drop an index solely because a pre-launch Advisor labels it unused.
- Financial, attendance, credential, notification, and lifecycle operations must remain idempotent and auditable.

## Migration requirements

Every schema, function, policy, grant, storage, or index change must be represented by an ordered file under `supabase/migrations/`.

A normal backend change includes:

1. A read-only compatibility preflight.
2. The migration.
3. A post-deployment structural/security verification.
4. A transactional smoke test for behavioral changes, with fixture writes rolled back.
5. Updated database types, package APIs, application code, and documentation where relevant.

Do not apply an untracked SQL change in a shared project and consider the work complete. Applied migrations and their checks stay in Git because they are the reproducible database history for staging, production, and future developers.

## Secrets and environment variables

- Never commit `.env.local`, database dumps, access tokens, passwords, member exports, service-role keys, signing secrets, or provider credentials.
- Keep only placeholder names in tracked `.env.example` files.
- Treat every `NEXT_PUBLIC_*` value as publicly visible.
- Access server-only values through the shared environment guards.
- Do not log secrets or full personal records. Log stable identifiers and safe summaries where operationally necessary.
- Before pushing, inspect both the current diff and relevant branch history for accidentally committed credentials. Rotate a leaked credential even if the commit is later removed.

## Testing

- Add focused unit tests for contracts and pure domain behavior.
- Add integration-style tests for route parsing, authorization decisions, database wrapper behavior, and third-party payloads.
- Keep tracked fixtures synthetic and secret-free.
- SQL smoke tests must be safe to run in the hosted SQL Editor and must roll back fixture writes.
- Test both allowed and denied paths for authorization-sensitive changes.
- Test idempotent retries for financial, integration, notification, and lifecycle operations.

Run the standard checks from the repository root:

```bash
pnpm run format
pnpm run lint
pnpm run typecheck
pnpm run test
```

Add `pnpm run build` for routing, dependency, environment, or release-sensitive work. Build the documentation with `python -m mkdocs build --strict` when documentation changes.

## Formatting and file hygiene

- Use the repository Prettier and ESLint configuration; do not introduce a competing formatter.
- Keep files cohesive. Split a module when it contains unrelated ownership or becomes difficult to test.
- Use `rg` for repository search and preserve unrelated work in a dirty worktree.
- Do not hand-edit `pnpm-lock.yaml`, generated build output, or local CLI state.
- Do not commit `.next`, `.turbo`, `site`, coverage output, `.env.local`, `supabase/.temp`, or database exports.
- Use `apply_patch` or normal editor changes for reviewed source edits; avoid opaque bulk rewrites.

## Documentation standards

- Update documentation in the same pull request as behavior, environment, migration, or workflow changes.
- Document the supported workflow, not abandoned alternatives.
- Keep commands runnable from the repository root and state the required role before a privileged operation.
- Never place real project values, credentials, or personal information in examples.
- Edit `docs/`; do not edit or commit the generated `site/` output.

## Pull requests

1. Use a conventional branch prefix such as `feat/`, `fix/`, `docs/`, or `chore/`.
2. Use Conventional Commit messages.
3. Keep the pull request scoped and explain migrations, environment changes, security impact, manual checks, and deferred work.
4. Target the maintainer-designated integration branch, such as `staging`, when that is the current release workflow.
5. Include screenshots for meaningful UI states but remove personal or secret information.
6. Require review for migrations, authorization changes, shared package APIs, and deployment configuration.

The root `CONTRIBUTING.md` file defines the issue, branch, commit, and pull-request workflow. UI work must also follow the [UI/UX contribution guide](ui-ux.md).
