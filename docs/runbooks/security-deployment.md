# Security Deployment Checklist

Complete these steps before exposing Axis to real members.

## Supabase Auth

1. In **Authentication → Providers → Email**, disable public user signup.
2. Keep email invitations enabled for the administrator invitation flow.
3. Confirm email verification is required.
4. Verify the only active administrator is linked through `members.auth_id`.

The local `supabase/config.toml` does not automatically change hosted Auth settings.

## Secrets

Configure these server-side variables in both the appropriate Vercel project and
local untracked environment files:

- `SUPABASE_SERVICE_ROLE_KEY`
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `QR_SIGNING_SECRET` — at least 32 cryptographically random characters
- `DATABASE_URL` — include the database password for migration tooling

Never expose the service role, QR signing secret, Redis token, or database URL as
`NEXT_PUBLIC_*` variables.

Rotating `QR_SIGNING_SECRET` invalidates all previously issued signed QR codes.

## Database migration

1. Create a production backup.
2. Run `supabase db push --dry-run` against a staging project restored from production.
3. Apply migrations in staging and run the full test/build suite.
4. Check RLS as anonymous, member, and admin users.
5. Apply the reviewed migration to production.

The normalization migration renames legacy camelCase domain columns to snake_case.
It preserves data, constraints, indexes, and policy expressions, but every external
consumer must be tested against the new names.

## Release verification

Run:

```bash
pnpm audit --audit-level low
pnpm lint
pnpm typecheck
pnpm test
pnpm build
python -m mkdocs build --strict
```
