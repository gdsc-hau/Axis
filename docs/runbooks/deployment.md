# Deployment Runbook

Axis uses two independently deployed Next.js applications backed by one hosted
Supabase project. GDG ID is already deployed; GDG Hub must remain local until a
release is explicitly approved. This runbook prepares the release but does not
authorize one.

## Release topology

Create one Vercel project per application:

| Project | Root directory | Local port | Purpose                                 |
| ------- | -------------- | ---------: | --------------------------------------- |
| GDG ID  | `apps/gdg-id`  |       3000 | Existing digital ID and QR verification |
| GDG Hub | `apps/gdg-hub` |       3001 | Member and administrator portal         |

For each Vercel project, enable access to source files outside the root directory
so workspace packages under `packages/` and `configs/` are available to the build.
Use Node 22 and the repository-pinned pnpm version. Do not configure a command that
runs `supabase db push` during a frontend deployment.

## 1. Freeze and identify the release

1. Stop feature changes and record the exact commit SHA.
2. Confirm the worktree contains no accidental generated files or secrets.
3. Review every migration after the last remote migration.
4. Create and verify a hosted database backup before any schema change.
5. Keep member invitations, the Bevy webhook, and outbound email disabled until
   their separate acceptance checks are approved.

## 2. Run local acceptance gates

From the repository root:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm audit --audit-level low
corepack pnpm peers check
corepack pnpm exec turbo lint --force
corepack pnpm exec turbo typecheck --force
corepack pnpm run test
corepack pnpm exec turbo build --force
python -m pip install -r docs/requirements.txt
python -m mkdocs build --strict
```

All commands must exit successfully. Review warnings rather than treating a green
exit code as permission to ignore them.

## 3. Reconcile hosted Supabase manually

This workflow intentionally avoids Docker. Run the following against the linked
hosted project:

```bash
npx supabase migration list --linked
npx supabase db push --dry-run
npx supabase db lint --linked --schema public --level warning
```

For a fully migrated release, the migration list must match and the dry run must
report no migrations to push. If migrations remain, stop and follow the reviewed
preflight, backup, push, verify, and smoke-test sequence used for that phase.

In Supabase Studio:

1. Run the latest System Health check and require zero failures.
2. Review Database Security Advisor and Performance Advisor findings.
3. Confirm RLS and intended Data API privileges on every exposed `public` table.
4. Confirm the Before User Created Auth hook still rejects unknown member emails.
5. Confirm Auth Site URL and redirect allow-list values match the exact release
   origins; retain `http://localhost:3001/**` only for local testing.
6. Confirm the `certificates` Storage bucket is private.
7. Confirm the database email-delivery gate remains disabled.

## 4. Configure hosting environments

Use [Environment Configuration](environment-configuration.md) as the authoritative
variable matrix. Configure Preview and Production independently. Values added or
changed in Vercel affect only new deployments, so redeploy after any correction.

For the future Hub project:

1. Import the same Git repository into a new Vercel project.
2. Set root directory to `apps/gdg-hub` and enable external workspace sources.
3. Add only the Hub variables for Preview first.
4. Do not connect the production domain, Bevy webhook, email worker, or invitation
   campaign during the first preview acceptance pass.

## 5. Preview acceptance

Using a dedicated non-production test identity where possible, verify:

1. Unknown emails cannot create accounts and inactive members cannot enter.
2. Member and admin routes enforce their roles and sign-out clears the session.
3. Registry-owned identity fields cannot be changed from profile forms.
4. Public articles and certificate verification expose only intended fields.
5. Events render and Luma buttons redirect to approved HTTPS Luma URLs.
6. Gyrocoin, reward, attendance, credential, communication, reporting, settings,
   and System Health paths match their phase runbooks.
7. Direct anonymous and member writes are rejected where an audited RPC is
   required.

## 6. Production promotion

1. Obtain explicit release approval.
2. Apply any approved database migrations before the dependent frontend.
3. Promote the exact accepted deployment; do not rebuild from an unreviewed SHA.
4. Set the final Auth URLs before exercising invitation or recovery links.
5. Run the post-deployment checks below and record evidence in the release ticket.

## Post-deployment checks

- `/login` returns 200.
- A protected route redirects an anonymous browser to `/login`.
- An active member reaches `/member/dashboard`; an admin reaches
  `/admin/dashboard`.
- `/articles` and one published article are anonymously readable.
- Invalid public certificate numbers return the controlled not-found state.
- System Health completes with zero failures.
- Vercel and Supabase logs contain no repeated auth, database, or function errors.

## Rollback

- **Frontend:** promote the previous known-good Vercel deployment immediately.
- **Database:** prefer a reviewed forward-fix migration. Restore a backup only as
  an incident decision because it can discard writes made after the backup.
- **Edge Function:** redeploy the last accepted function version and keep its
  feature gate disabled while investigating.
- **Compromised secret:** disable the affected integration, rotate the secret in
  its authority, update every consumer, redeploy, and inspect audit logs.

Never rewrite a migration already recorded by production.
