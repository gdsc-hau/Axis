# GDG Hub

GDG Hub is the Axis public site, member portal, and administrator control panel.
It is a Next.js 15 App Router application and runs locally on port 3001.

## Run locally

From the repository root:

```bash
corepack enable
pnpm install --frozen-lockfile
cp apps/gdg-hub/.env.example apps/gdg-hub/.env.local
pnpm --filter gdg-hub dev
```

Ask a maintainer for approved non-production values. Never commit
`apps/gdg-hub/.env.local`. Open `http://localhost:3001`.

## What this application owns

- `app/(public)`: public pages, event listings, and article reading.
- `app/(auth)`: login, invitations, activation, recovery, and account status.
- `app/member`: authenticated member dashboard and self-service features.
- `app/admin`: active-administrator operations and route-adjacent Server Actions.
- `app/api`: Bevy ingestion, certificate downloads, and Auth HTTP callbacks.
- `middleware.ts`: session refresh and protected-route redirects.
- `lib`: Hub-only helpers and compositions.
- `public`: static assets owned by the Hub.

See the complete [application route map](../../docs/architecture/apps.md).

## Development rules

- Use Server Components for reads and Server Actions for user-click mutations.
- Use Route Handlers only for genuine HTTP boundaries.
- Validate untrusted input with Zod contracts from `@hau/contracts`.
- Use supported `@hau/db` modules instead of duplicating Supabase queries.
- Reuse `@hau/axis-ui`; keep route-aware copy and compositions in this app.
- Preserve the guards in `middleware.ts` and rely on RLS as the final boundary.
- Never import source code from `apps/gdg-id`.

## Environment

The tracked `.env.example` is the variable-name source of truth. The minimum
local configuration is the Supabase URL, anon key, server-only service-role key,
and `NEXT_PUBLIC_SITE_URL=http://localhost:3001`. Bevy variables are needed only
when testing that integration. Details are in the
[environment runbook](../../docs/runbooks/environment-configuration.md).

## Validate

```bash
pnpm --filter gdg-hub lint
pnpm --filter gdg-hub typecheck
pnpm --filter gdg-hub build
pnpm test
```

Feature operations and acceptance steps are indexed in the
[runbooks](../../docs/runbooks/README.md).
