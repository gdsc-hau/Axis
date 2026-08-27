# Phase 8 notifications and communications

Phase 8 adds a secure in-app inbox and an optional email delivery pipeline. It
does not send invitations and does not enable email automatically.

## What creates notifications

- Administrator Gyrocoin awards and deductions.
- Reward redemption state changes.
- Event attendance imports, check-ins, confirmations, and corrections.
- Badge awards and revocations.
- Certificate issuance and revocation.
- Administrator announcements from `/admin/communications`.

Each source uses a unique deduplication key. Retrying a domain operation or a
campaign operation key cannot create a second copy of the same notification.

## Member operation

Members open `/member/notifications` to read or dismiss inbox entries. Email is
off until the member checks **Email copies** and saves preferences. Category
switches only affect optional email copies; security-relevant in-app records are
not hidden.

## Administrator operation

Administrators open `/admin/communications` to publish an in-app announcement.
The message is inserted for every active member in one audited database
transaction. Selecting email only queues copies for members who opted in.

The database delivery gate should remain disabled until the following worker
secrets are configured:

- `AXIS_EMAIL_DELIVERY_ENABLED=true`
- `AXIS_EMAIL_WORKER_SECRET` with a long random value
- `RESEND_API_KEY`
- `AXIS_EMAIL_FROM` using a verified Resend sender, such as
  `GDG HAU Axis <notifications@example.org>`

The hosted Supabase function provides `SUPABASE_URL` and either
`SUPABASE_SECRET_KEYS` or the legacy `SUPABASE_SERVICE_ROLE_KEY`.

Only after the Edge Function is deployed and tested should an administrator
enable the database gate. Both gates must be enabled before the worker can claim
queued email.

## Worker invocation

Invoke the `send-email` Edge Function with `POST` and the private header
`x-axis-worker-secret`. A scheduler may call it periodically after deployment.
Do not expose the worker secret to browser code.

The worker claims at most ten rows using `FOR UPDATE SKIP LOCKED`, sends each
message through Resend, and records success or retryable failure. After five
failed attempts, an item remains `FAILED` for administrator review.

## Hosted rollout (no Docker required)

1. Run `supabase/preflight/notifications_communications_preflight.sql` in the
   hosted SQL Editor. Every row must pass.
2. Run `npx supabase db push --dry-run` and confirm only
   `20260826001721_notifications_communications.sql` is pending.
3. Run `npx supabase db push` and approve the single migration.
4. Run `supabase/preflight/notifications_communications_verify.sql` in the SQL
   Editor. Every row must pass.
5. Run `supabase/preflight/notifications_communications_smoke_test.sql`. Its
   writes are rolled back.
6. Test the local member inbox and admin communications page while leaving both
   email gates disabled.
