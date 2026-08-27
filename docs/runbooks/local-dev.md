# Local Development Runbook

This runbook describes the standard workflow for running the platform on your own machine.

## Use the linked hosted Supabase project (no Docker)

The Hub can run locally against the existing hosted Supabase project. This is the current Axis workflow when Docker Desktop is intentionally unavailable.

1. Copy the variables from `apps/gdg-hub/.env.example` into the untracked `apps/gdg-hub/.env.local`.
2. Use the hosted project URL, anon key, and server-only service-role key.
3. Set `NEXT_PUBLIC_SITE_URL=http://localhost:3001`.
4. In hosted Supabase **Authentication > URL Configuration**, allow `http://localhost:3001/**` while performing local invitation, activation, and recovery tests.
5. From Git Bash, run `pnpm --filter gdg-hub dev`.

For the local Bevy fixture test, also set the four `BEVY_*` variables shown in
`apps/gdg-hub/.env.example`. Use a random secret of at least 32 characters. The
local receiver is called manually with the tracked fixture; Bevy itself cannot
send to `localhost`.

Do not run `supabase start`, `supabase db reset`, or any command that starts local services in this workflow. Migrations are reviewed with `supabase db push --dry-run`, backed up, then applied to the linked project by an authorized operator.

The complete no-Docker event test is documented in
`docs/integrations/bevy-events.md`.

## Optional isolated Supabase environment

This repository also supports an isolated local Supabase stack when Docker is available, but it is not required for the hosted-project workflow above.

```bash
supabase start
```

This boots up the local database, auth service, and storage on your machine.

- Studio URL: `http://127.0.0.1:54323`
- API URL: `http://127.0.0.1:54321`

To populate the local database with mock members and events for testing:

```bash
supabase db reset
```

_(This applies the migrations and runs the `supabase/seed.sql` file if it exists)._

## Starting the Apps

From the root directory, leverage Turborepo to start all frontend applications simultaneously:

```bash
pnpm dev
```

By default:

- `gdg-id` runs on `http://localhost:3000`
- `gdg-hub` runs on `http://localhost:3001`

If you only want to run one specific app (for example, to save memory):

```bash
pnpm --filter gdg-hub dev
```

## Adding a New Dependency

Because this is a monorepo, adding dependencies requires specifying which workspace package you want to add it to.

To add an external package (like `lodash`) to `gdg-id`:

```bash
pnpm --filter gdg-id add lodash
```

To add an internal package (like `@hau/axis-ui`) to `gdg-hub`:

```bash
pnpm --filter gdg-hub add @hau/axis-ui@workspace:*
```

## Clean Environment

If Turborepo cache or Next.js cache is causing weird bugs:

```bash
pnpm clean
pnpm install
pnpm dev
```
