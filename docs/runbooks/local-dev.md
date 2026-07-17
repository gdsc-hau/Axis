# Local Development Runbook

This runbook describes the standard workflow for running the platform on your own machine.

## Setup Supabase

Make sure Docker is running.
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
*(This applies the migrations and runs the `supabase/seed.sql` file if it exists).*

## Starting the Apps

From the root directory, leverage Turborepo to start all frontend applications simultaneously:

```bash
pnpm dev
```
By default:
- `gdg-hub` runs on `http://localhost:3000`
- `gdg-id` runs on `http://localhost:3001`

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

To add an internal package (like `@hau/ui`) to `gdg-hub`:
```bash
pnpm --filter gdg-hub add @hau/ui@workspace:*
```

## Clean Environment

If Turborepo cache or Next.js cache is causing weird bugs:
```bash
pnpm clean
pnpm install
pnpm dev
```
