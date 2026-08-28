# Local Development Runbook

This is the supported workflow for running Axis applications locally against an approved hosted Supabase development or staging project.

## Before you start

Complete [Getting Started](../project-overview/getting-started.md) first. You need Node 22, the repository's pinned pnpm version, installed dependencies, and untracked `.env.local` files for the applications you will run.

Use non-production credentials for normal development. Access to the linked production project is an operator responsibility, not a frontend prerequisite.

## Configure GDG Hub

Create `apps/gdg-hub/.env.local` from its example and supply the approved values:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3001
```

The service-role key is server-only. Never import it into a Client Component, return it from an API, or rename it with a `NEXT_PUBLIC_` prefix.

An authorized project operator must allow `http://localhost:3001/**` in the development project's Auth redirect configuration before testing invitation, activation, or recovery links.

## Configure GDG ID

Create `apps/gdg-id/.env.local` from its example and supply the approved Supabase values plus a local private `QR_SIGNING_SECRET` of at least 32 characters. Upstash values are optional during local development.

## Start an application

Run only the Hub:

```bash
pnpm --filter gdg-hub dev
```

Run only GDG ID:

```bash
pnpm --filter gdg-id dev
```

Run every workspace development task:

```bash
pnpm dev
```

Default URLs:

- GDG ID: `http://localhost:3000`
- GDG Hub: `http://localhost:3001`

Running one app is faster and reduces unrelated logs. Run both when testing shared package changes or the full identity/member flow.

## Basic checks

In Git Bash, confirm the Hub login is reachable:

```bash
curl -I http://localhost:3001/login
```

Confirm an unauthenticated admin route is protected:

```bash
curl -I http://localhost:3001/admin/dashboard
```

The first request should return a successful HTML response. The protected route should redirect to `/login` when no valid session cookie is present.

## Working as a frontend developer

- Build complete pages in the owning application.
- Import reusable components from `@hau/axis-ui`.
- Use `@hau/contracts` for shared validation and `@hau/db` for supported data operations.
- Keep placeholder UI states for loading, empty data, permission errors, validation errors, and successful mutations.
- Do not change hosted schema objects from the dashboard to unblock a component. Ask the backend owner for a contract or migration.
- Never use real production member exports as local fixtures.

See the [File and Directory Guide](../project-overview/file-and-directory-guide.md) for exact ownership rules.

## Working as a backend operator

The application does not need the Supabase CLI simply to run. Install and authenticate the CLI only if your role includes migration work.

Before any linked database action:

1. Confirm the intended project and environment.
2. Check migration history.
3. Run the feature's read-only preflight in the hosted SQL Editor.
4. Run a linked migration dry run and review the exact pending list.
5. Follow the [Migration Workflow](../schema/migrations.md) and feature runbook.

The migration guide includes the complete Studio procedure for copying the
tracked SQL file, interpreting `check_name`, `passed`, and `details`, and deciding
which checks to rerun when the migration is already deployed.

Do not use production for exploratory schema work. Do not paste a tracked migration into the SQL Editor because that bypasses migration-history recording.

## Integration fixture tests

Some integrations include tracked, synthetic fixtures. Their environment variables remain optional until you test that integration.

For the Bevy receiver:

1. Add the `BEVY_*` variables documented in `apps/gdg-hub/.env.example`.
2. Use a random local receiver secret of at least 32 characters.
3. Start GDG Hub on port 3001.
4. Follow [Bevy Events](../integrations/bevy-events.md) to send the tracked fixture locally.

An external provider cannot call localhost. Real delivery testing waits for an approved HTTPS staging deployment.

## Add dependencies correctly

Add a dependency to the workspace that owns it:

```bash
pnpm --filter gdg-hub add package-name
pnpm --filter gdg-id add package-name
```

For an internal package dependency:

```bash
pnpm --filter gdg-hub add @hau/axis-ui@workspace:*
```

Do not add an application dependency to the root unless it is truly a root build or repository tool.

## Validate before handoff

```bash
pnpm run format
pnpm run lint
pnpm run typecheck
pnpm run test
```

Use `pnpm run build` when routes, dependencies, environment handling, or shared packages change. Review `git status --short` after formatting and before staging.

## Troubleshooting

### The app reports missing environment variables

Confirm the file is named `.env.local`, is inside the correct application directory, and contains no placeholder text. Restart the development process after changing environment values.

### A protected page redirects unexpectedly

Confirm the browser has a session for the same Supabase project configured in the app. Then verify the linked `members` row is active, has the expected role, and has the correct `auth_id`.

### A page reports that a migration is unavailable

Confirm the local environment points to the intended shared project. An authorized operator should compare local and remote migration history and run the phase verification SQL. Do not repair history casually.

### Next.js shows stale runtime errors

Stop the app, remove only that app's `.next` directory, and restart. If dependencies changed, rerun `pnpm install --frozen-lockfile`. Preserve source files and unrelated worktree changes.

### The expected port is occupied

Stop the old development process or identify the process that owns the port. Keep the documented ports during Auth testing because callback URLs and environment configuration depend on them.
