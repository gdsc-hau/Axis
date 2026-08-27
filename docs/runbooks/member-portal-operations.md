# Phase 11: member portal operations

Phase 11 completes the protected member dashboard, profile, and settings routes and adds administrator-managed portal defaults. The `members` table remains the identity source of truth.

## Registry ownership

Members cannot change their registered name, email, GDG ID, student ID, program, department, role, or lifecycle status. They may revise only their bio, phone number, LinkedIn URL, and GitHub URL. Every save requires a reason and creates an immutable `member_profile_revisions` row plus an audit event.

## Portal settings

Active administrators manage one versioned `PORTAL_SETTINGS` record at `/admin/settings`. It controls the organization label, optional support email, member dashboard message, default report range, and leaderboard row limit. Direct table writes are revoked; the audited RPC uses optimistic concurrency and idempotency keys.

## Hosted rollout

1. Run `supabase/preflight/member_portal_operations_preflight.sql` in the hosted SQL Editor. Every row must pass.
2. Run `npx supabase db push --dry-run`. Only `20260826160000_member_portal_operations.sql` should be listed.
3. Run `npx supabase db push` and confirm the prompt.
4. Run `supabase/preflight/member_portal_operations_verify.sql`. Every row must pass.
5. Run `supabase/preflight/member_portal_operations_smoke_test.sql`. It must return one passing row; all writes roll back.

## Manual UI acceptance

1. Restart the local GDG Hub server and sign in as the linked active administrator.
2. Open `/admin/settings`, change the dashboard message with a reason, and save. Confirm the version advances and the revision appears.
3. Open `/member/dashboard` and confirm the configured message and live domain totals appear.
4. Open `/member/profile`. Confirm every registry field is read-only, revise an editable field, enter a reason, and save.
5. Reload `/member/profile`. Confirm the registered name is unchanged and a new revision is visible.
6. Open `/member/settings`; verify notification preferences, password recovery, and registry-support links.
7. Open `/admin/reports` and `/member/leaderboard`; verify their defaults follow the portal settings.

No invitations, deployment, email delivery, or external data writes are performed by this phase.
