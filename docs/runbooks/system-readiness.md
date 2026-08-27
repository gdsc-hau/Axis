# Phase 12: system readiness and final hardening

Phase 12 adds a read-only, administrator-triggered health audit across the Phase 1-11 backend. It records immutable runs and individual results so a future regression cannot be hidden by refreshing the page.

## What the health check covers

- Member registry normalization, duplicate emails, and Supabase Auth links.
- Bevy/GDG Community event mirror fields and Luma redirect URLs.
- Gyrocoin running balances and overdraw protection.
- Reward-redemption ledger links and status histories.
- Attendance confirmation, award links, and status histories.
- Badge and certificate lifecycle histories.
- Notification outbox consistency and the outbound-email safety gate.
- Article revision and publication-state consistency.
- Member profile history and the singleton portal settings record.
- RLS on critical public tables and anonymous exposure of private security-definer functions.
- Operational setup warnings such as a blank support email or no synced Bevy events.

`FAIL` means the database has a release-blocking integrity or security problem. `WARN` means the backend is sound but an operational setup item remains. `PASS` means every check is clean.

The check does not repair data, scrape events, send email, invite members, deploy the app, or contact any external service.

## Hosted rollout

1. In the hosted Supabase SQL Editor, run `supabase/preflight/system_readiness_health_preflight.sql`. Every row must pass.
2. Run `npx supabase db push --dry-run`. Only `20260826170000_system_readiness_health.sql` should be listed.
3. Run `npx supabase db push` and confirm the prompt.
4. In the SQL Editor, run `supabase/preflight/system_readiness_health_verify.sql`. Every row must pass.
5. Run `supabase/preflight/system_readiness_health_smoke_test.sql`. It must return one passing row; its test writes are rolled back.

## Manual local acceptance

1. Restart GDG Hub with `pnpm --filter gdg-hub dev` from the repository root.
2. Sign in as the linked active administrator and open `/admin/system`.
3. Select **Run system health check**.
4. Confirm the run completes as `PASS` or `WARN`, has 15 result rows, and has zero failures.
5. Expected warnings before launch may include no Bevy events, only a small number of linked member accounts, or no support email. Resolve the warning only when its corresponding operation is intentionally ready.
6. Reload the page and confirm the run remains in **Recent runs**.
7. In Supabase Table Editor, confirm `system_health_runs` and `system_health_results` contain the same summary and details.
8. In `audit_logs`, confirm one `SYSTEM_HEALTH_CHECK_COMPLETED` entry references the run.
9. Sign out or sign in as a regular member and confirm `/admin/system` is inaccessible.

## Release interpretation

- Do not release with any `FAIL` result.
- Review every `WARN` and record why it is accepted or which operator will resolve it.
- Keep outbound email disabled until the provider, sender verification, worker secret, and Edge Function environment gate are intentionally configured and tested.
- Run this check again after every production migration and immediately before deployment.
