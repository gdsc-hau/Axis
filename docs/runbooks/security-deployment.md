# Security Deployment Checklist

Complete these checks before exposing Axis to real members.

## Supabase Auth

1. Keep public signup disabled and retain the Before User Created hook that matches
   normalized emails against active `members` rows.
2. Require email confirmation and configure custom SMTP before invitations or
   password recovery are used with real members.
3. Keep the hosted Site URL and redirect allow list synchronized with the exact
   Hub origins. Avoid broad production wildcards.
4. Verify at least one active linked administrator before changing auth controls.
5. Test an eligible member, unknown email, inactive member, member route, admin
   route, recovery link, and sign-out in Preview.

The local `supabase/config.toml` documents intended behavior but does not update
hosted Auth settings automatically.

## Secrets

- Store service-role/secret keys, QR secrets, Redis credentials, webhook secrets,
  provider keys, and database passwords only in server-side secret stores.
- Never prefix a secret with `NEXT_PUBLIC_`.
- Use separate Preview and Production secrets.
- Rotate secrets after exposure or personnel/ownership changes.
- Keep outbound email and inbound webhook gates disabled until their dependencies
  and monitoring are accepted.

See [Environment Configuration](environment-configuration.md) for the exact matrix.

## Database and Data API

1. Back up production and verify the target project.
2. Run the relevant phase preflight before each migration.
3. Review `supabase db push --dry-run`, then apply only the expected files.
4. Run phase verification and transactional smoke tests in Supabase SQL Editor.
5. Confirm RLS is enabled on every exposed table and that table grants match the
   intended anonymous, authenticated, and service roles. Do not assume a newly
   created table is exposed through the Data API.
6. Review Security Advisor and Performance Advisor findings.
7. Require SSL for external database connections and restrict network access when
   the project plan and operator workflow permit it.

## Storage and public data

- Keep the certificate bucket private and use short-lived signed downloads.
- Public certificate verification returns only the verification projection.
- Public articles expose published content only; drafts and revisions remain
  administrative.
- The leaderboard excludes email, student ID, phone, bio, and social links.

## Release verification

Follow [Final Acceptance Audit](final-acceptance.md) and
[Deployment Runbook](deployment.md). Any failed integrity, auth, RLS, dependency,
or production-build check blocks deployment.
