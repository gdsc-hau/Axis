# GDG ID

GDG ID is the public digital membership identity and QR verification
application. It is a Next.js 15 App Router application and runs locally on port 3000.

## Run locally

From the repository root:

```bash
corepack enable
pnpm install --frozen-lockfile
cp apps/gdg-id/.env.example apps/gdg-id/.env.local
pnpm --filter gdg-id dev
```

Ask a maintainer for approved non-production values. Never commit
`apps/gdg-id/.env.local`. Open `http://localhost:3000`.

## What this application owns

- `src/app/(public)`: landing, About, Contact, ID display, scan, and verification
  pages.
- `src/app/api/search`: rate-limited approved-member lookup.
- `src/app/api/verify`: signed and time-limited QR verification.
- `src/components`: GDG ID-specific screen compositions.
- `src/lib`: QR signing, lookup, and application-only helpers.
- `public`: static identity assets.

GDG ID reads the same `public.members` registry as GDG Hub. It must not create a
second identity source or expose private registry fields in public responses.

## Environment

The tracked `.env.example` lists all variable names. `QR_SIGNING_SECRET` must be
a private random value of at least 32 characters. Upstash is optional locally
because a process-local rate-limit fallback exists, but distributed production
rate limiting requires both Upstash variables. See the
[environment runbook](../../docs/runbooks/environment-configuration.md).

## Development rules

- Validate search and verification requests before querying data.
- Keep signing secrets and service-role credentials in server-only modules.
- Return only the approved public member fields.
- Use `@hau/axis-ui` for reusable presentation and `@hau/contracts` for shared
  validation.
- Never import source code from `apps/gdg-hub`.

## Validate

```bash
pnpm --filter gdg-id lint
pnpm --filter gdg-id typecheck
pnpm --filter gdg-id build
pnpm test
```
