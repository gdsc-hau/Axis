# Troubleshooting Guide

Axis application development uses an approved hosted non-production Supabase
project. A local database service is not part of the normal setup.

## An environment variable is missing

**Symptoms:** Startup fails, a page reports unavailable configuration, or an
integration returns `503`.

1. Confirm the file is named `.env.local` and is inside the affected app.
2. Compare variable names with that app's tracked `.env.example`.
3. Replace every placeholder with an approved non-production value.
4. Restart the development process; Next.js does not reliably reload all
   environment changes.

Never move a server secret into a `NEXT_PUBLIC_*` variable to make an error go
away.

## Authentication redirects or loops

Confirm that:

- the app and browser session use the same Supabase project;
- `NEXT_PUBLIC_SITE_URL` uses the actual Hub origin and port;
- the local callback is present in the hosted Auth redirect allow list;
- the registry row is linked, `ACTIVE`, and has the role required by the route;
- only the newest invitation or recovery link is being used.

Clear the site's cookies and start a fresh login only after confirming the
configuration. Public signup is intentionally disabled.

## A page says a migration is unavailable

The app may be connected to the wrong project or the remote migration history
may be behind the code. An authorized operator should:

```bash
npx supabase migration list --linked
npx supabase db push --dry-run
```

Do not paste the migration into Studio or repair migration history without
review. If the migration is already recorded, run its `*_verify.sql` and
rollback-only smoke test as documented in the
[Migration Workflow](../schema/migrations.md).

## A preflight reports that the migration is already deployed

That is expected when a preflight checks a pre-migration state. Do not roll back
a healthy database just to make an old preflight green. Confirm the timestamp in
remote history, then run the corresponding verification and smoke test.

## Shared package changes do not appear

Stop the affected app, remove only its `.next` directory, and restart it. Remove
the root `.turbo` cache only when multiple workspaces are stale. These are local
generated directories and must not be committed.

PowerShell example for the Hub:

```powershell
Remove-Item -Recurse -Force -LiteralPath apps/gdg-hub/.next
pnpm --filter gdg-hub dev
```

## A module exists at the root but cannot be imported

pnpm enforces workspace ownership. Add the dependency to the workspace that
imports it:

```bash
pnpm --filter gdg-hub add package-name
```

For an internal package, use `@hau/name@workspace:*`. Do not hand-edit the
lockfile and do not depend on a root-only phantom package.

## TypeScript cannot resolve an `@hau/*` package

1. Run `pnpm install --frozen-lockfile` from the root.
2. Confirm the consuming package declares the dependency with `workspace:*`.
3. Import from the supported package export, not a private `src` path.
4. Restart the editor's TypeScript server.
5. Run `pnpm run typecheck` to distinguish an editor cache problem from a real
   compiler error.

## Port 3000 or 3001 is occupied

Stop the previous development process or identify the process using the port.
Keep GDG ID on 3000 and the Hub on 3001 during Auth testing because callbacks
are origin-specific.

## Documentation does not build

Install the pinned Python dependencies and use the repository script:

```bash
python -m pip install -r docs/requirements.txt
pnpm docs:build
```

Edit `docs/`, not `site/`. A strict-build navigation or link warning should be
fixed before review.

## Git shows generated or private files

Do not stage `.env.local`, `.next`, `.turbo`, `site/`, `supabase/.temp`, database
exports, or screenshots containing private member data. Use
`git status --short` and `git diff --cached` before committing. If a real secret
ever entered commit history, rotate it immediately; deleting the current file is
not sufficient.
