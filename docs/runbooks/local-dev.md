# Local Development

1. Install workspace dependencies with `pnpm install`.
2. Copy `env.example` to a local environment file and fill in Supabase credentials.
3. Start the app with `pnpm dev` from the root or the app package.
4. Run the database locally if your feature needs migrations or auth state.
5. Verify the member and admin routes with a logged-in session.

## Helpful commands

- `pnpm dev`: start the monorepo dev workflow
- `pnpm build`: build all workspaces through Turbo
- `pnpm lint`: run linting across the repo
- `pnpm typecheck`: run TypeScript checks across the repo
- `pnpm docs:serve`: preview the MkDocs site once MkDocs is installed

## Important local details

- `apps/gdg-hub` runs on port 3001
- Middleware protects `/member` and `/admin` routes and sends unauthenticated users to `/login`
- Auth pages are accessible under the app route group structure in `apps/gdg-hub/app`
