# Getting Started

This guide sets up the Axis monorepo for application development against an approved hosted Supabase development or staging project.

## 1. Install the required tools

| Tool         | Requirement                                                            | Used for                                       |
| ------------ | ---------------------------------------------------------------------- | ---------------------------------------------- |
| Git          | Current supported release                                              | Source control                                 |
| Node.js      | Version 22; `.node-version` pins the team baseline                     | Next.js, tests, and workspace tooling          |
| Corepack     | Included with Node.js                                                  | Selecting the repository's pinned pnpm version |
| Python       | Version 3 with pip; optional                                           | MkDocs documentation only                      |
| Supabase CLI | Optional for frontend work; required for authorized database operators | Linked migration inspection and deployment     |

Git Bash is recommended on Windows because most repository examples use POSIX-style commands. PowerShell is also supported; run the equivalent file-copy commands where necessary.

Confirm the main versions:

```bash
node --version
corepack --version
git --version
```

`node --version` must report a 22.x release. The root `package.json` rejects unsupported Node major versions.

## 2. Clone and install

```bash
git clone https://github.com/gdsc-hau/Axis.git
cd Axis
corepack enable
pnpm install --frozen-lockfile
```

Run workspace commands from the repository root unless a guide explicitly says otherwise. `pnpm-lock.yaml` is the dependency source of truth and should not be edited by hand.

## 3. Create local environment files

Each application owns an untracked environment file:

```bash
cp apps/gdg-hub/.env.example apps/gdg-hub/.env.local
cp apps/gdg-id/.env.example apps/gdg-id/.env.local
```

Ask a maintainer for approved development or staging values through the team's secure secret-sharing channel. Do not use production credentials for ordinary local development.

### GDG Hub minimum values

`apps/gdg-hub/.env.local` needs:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_SITE_URL=http://localhost:3001`

The Bevy receiver variables are only needed when testing the tracked integration fixture. They do not make an external service call into localhost.

### GDG ID minimum values

`apps/gdg-id/.env.local` needs:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `QR_SIGNING_SECRET`, a private random value of at least 32 characters

The Upstash variables are optional for local development; the app has a local fallback rate limiter.

### Environment safety

- Values prefixed with `NEXT_PUBLIC_` are included in browser code and must never contain privileged secrets.
- Service-role, database, signing, webhook, and provider credentials are server-only.
- Never commit `.env.local`, paste secrets into documentation, or include secret values in terminal screenshots.
- Do not bypass the helpers in `packages/db/src/env.ts`; they protect server-only configuration from client bundles.

The complete variable matrix is in [Environment Configuration](../runbooks/environment-configuration.md).

## 4. Confirm authentication URLs

An authorized Supabase operator must allow the local callback URLs used by the Hub, including `http://localhost:3001/**`, before invitation, activation, password recovery, or reset-link testing. Frontend contributors should ask a maintainer to confirm the shared development project's redirect allowlist instead of changing project-wide settings themselves.

## 5. Start the applications

Run only the Hub:

```bash
pnpm --filter gdg-hub dev
```

Run only GDG ID:

```bash
pnpm --filter gdg-id dev
```

Run all development tasks:

```bash
pnpm dev
```

Expected URLs:

- GDG ID: `http://localhost:3000`
- GDG Hub: `http://localhost:3001`
- Hub login: `http://localhost:3001/login`

An unauthenticated visit to `http://localhost:3001/admin/dashboard` should redirect to `/login`. That redirect is enforced by `apps/gdg-hub/middleware.ts` and must remain intact.

## 6. Choose the workflow that matches your role

### Frontend or UI/UX implementation

1. Use the approved non-production environment values.
2. Run the affected app only.
3. Keep complete screens and route-aware product behavior under `apps/`.
4. Put reusable presentational components and tokens in `packages/axis-ui`.
5. Use `packages/contracts` for shared input/output validation and `packages/db` for database access.
6. Do not make ad hoc schema changes in the hosted dashboard.

### Backend or database work

1. Confirm that you are linked to the intended non-production Supabase project.
2. Read [Migration Workflow](../schema/migrations.md) before changing SQL.
3. Add an ordered migration plus the appropriate preflight, verification, and transactional smoke-test SQL.
4. Run a linked dry run and have an authorized operator review the exact migration list.
5. Apply to production only through the approved release process.

### Documentation work

```bash
python -m pip install -r docs/requirements.txt
pnpm docs:serve
```

Open `http://127.0.0.1:8000`. Edit `docs/`, not the generated `site/` output.

## 7. Validate your changes

```bash
pnpm run format
pnpm run lint
pnpm run typecheck
pnpm run test
```

For a release or broad dependency change, also run:

```bash
pnpm run build
python -m mkdocs build --strict
```

Review `git status --short` and `git diff` before staging files. Do not stage build output, caches, local environment files, exported production data, or Supabase temporary state.

## Common problems

### `npm error No workspaces found`

Axis uses pnpm workspaces. Run commands from the repository root with `pnpm`, for example `pnpm --filter gdg-hub dev`.

### Port 3000 or 3001 is already in use

Stop the older development process, verify which process owns the port, and restart the intended app. Do not start a second copy against an unexpected port during authentication testing because callback URLs are port-specific.

### Supabase authentication links are invalid or expired

Generate a new single-use link, open only the newest email, and confirm that the local callback URL is allowlisted. Recovery and invitation links are intentionally time-limited.

### A page says a migration is unavailable

First confirm the app is using the intended Supabase project. Then compare local and remote migration history as an authorized operator. Do not repair migration history or rerun SQL manually without reviewing the migration runbook.

### Next.js behaves inconsistently after a large change

Stop the development process, remove only the affected app's local `.next` cache, and restart it. Never remove source directories or reset unrelated user changes.
