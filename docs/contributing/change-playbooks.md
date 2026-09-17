# Change Playbooks

Use the playbook that matches the change. These are implementation checklists,
not replacements for the feature-specific runbooks.

## Frontend page or screen

1. Locate the owning route under `apps/gdg-hub/app` or `apps/gdg-id/src/app`.
2. Keep authentication and redirects in the route layout, middleware, or server
   guard; do not reproduce them in visual components.
3. Use Server Components for data reads and add a Client Component only for
   browser state or interaction.
4. Reuse `@hau/axis-ui` primitives and preserve loading, empty, error,
   unauthorized, success, keyboard, and mobile states.
5. Test the route using a permitted and a denied identity when access matters.

## Shared UI component

1. Confirm the component is application-agnostic and reusable.
2. Add it under `packages/axis-ui/src/components` or `src/primitives`.
3. Export it from the package's public entry point.
4. Do not import routing, Supabase clients, application copy, or domain data.
5. Verify both consuming applications when the change affects shared styling.

## Form or user-initiated mutation

1. Define a Zod schema in `@hau/contracts` when the contract is shared; otherwise
   keep a route-local schema until reuse is real.
2. Implement a route-adjacent Server Action with `'use server'`.
3. Parse untrusted values, verify the current user, and require the correct
   active-member or active-admin role.
4. Call a supported `@hau/db` function or audited RPC. Never accept actor IDs,
   balances, roles, or ownership claims from the browser as authority.
5. Return safe field errors, then revalidate or redirect after success.
6. Test valid input, invalid input, unauthorized access, and retry behavior.

## HTTP route or integration

1. Use a Route Handler only for a webhook, download, or external verification
   boundary.
2. Authenticate before parsing or mutating when the protocol permits it.
3. Validate headers, URL parameters, and payloads with Zod.
4. Enforce size limits, idempotency, chapter/source filters, and safe logging.
5. Keep provider secrets server-only and document every variable in a tracked
   `.env.example` and the environment runbook.
6. Add synthetic fixtures and tests; never commit a captured production payload
   containing personal data or reusable signatures.

## Database change

1. Create one forward-only migration under `supabase/migrations/`.
2. Add a read-only preflight and a post-deployment verification under
   `supabase/preflight/`.
3. Add a rollback-only smoke test for behavioral or authorization changes.
4. Review constraints, RLS, grants, function execution, search paths, indexes,
   audit records, and idempotency.
5. Update `packages/db/src/database.types.ts`, database wrappers, contracts,
   tests, and docs affected by the schema.
6. Have an authorized operator follow the linked-project process in the
   [Migration Workflow](../schema/migrations.md).

## Dependency update

1. Add the dependency to the workspace that imports it, not automatically to the
   root.
2. Use pnpm so `pnpm-lock.yaml` is updated consistently.
3. Review install scripts, licenses, bundle/runtime impact, and advisories.
4. Run `pnpm audit --audit-level low`, lint, typecheck, tests, and affected builds.
5. Explain any remaining advisory and its exposure in the pull request.

## Documentation change

1. Edit Markdown under `docs/`; never edit generated `site/` output.
2. Add new pages to `mkdocs.yml`.
3. Keep commands runnable from the repository root and state when an operator
   role is required.
4. Use environment-variable names and placeholders, never real values.
5. Run `pnpm docs:build` and inspect the rendered page when layout changed.

## Pull-request evidence

Include:

- what changed and why;
- the related issue;
- automated commands and manual flows completed;
- screenshots for visible states with personal data removed;
- migration order and verification output when applicable;
- new or changed environment-variable **names**, never their values;
- security impact, rollback approach, and clearly labeled deferred work.
