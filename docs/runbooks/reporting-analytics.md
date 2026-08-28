# Reporting, analytics, and leaderboard

Phase 10 provides read-only operational reporting. It does not create a cached
leaderboard or copy financial data into another table.

## Sources of truth

- Member lifecycle: `members`
- Events and participation: `events`, `event_attendance`
- Gyrocoins: append-only `points_ledger`
- Marketplace: `redemptions`
- Recognition: `member_badges`, `certificates`
- Communications: `notification_campaigns`, `notification_email_outbox`
- Publishing: `articles`

## Member workflow

Open `/member/leaderboard`. Active members can view up to the first 100 active
members ordered by current Gyrocoin balance. Equal balances share a rank. The
current member is highlighted. The RPC excludes email, student ID, and ledger
notes.

## Administrator workflow

Open `/admin/reports`.

1. Choose an inclusive start and end date in Asia/Manila time.
2. Apply the range. A range may not exceed 366 days.
3. Review member, event, attendance, financial, marketplace, credential,
   communications, and content totals.
4. Review aggregate participation by event.
5. Select **Download CSV** to export the same aggregate results.

Use an event's attendance workspace when personally identifiable attendee data
is required. The general reports page intentionally shows aggregate counts only.

## Hosted rollout

1. Run `supabase/preflight/reporting_analytics_leaderboard_preflight.sql` in the
   hosted Supabase SQL Editor. Every row must pass.
2. Run `npx supabase db push --dry-run`. Only
   `20260826090000_reporting_analytics_leaderboard.sql` should be listed.
3. Run `npx supabase db push` after reviewing the dry run.
4. Run `supabase/preflight/reporting_analytics_leaderboard_verify.sql`. Every row
   must pass.
5. Run `supabase/preflight/reporting_analytics_leaderboard_smoke_test.sql`. Its
   single result must pass. The test writes no domain data.

## Local acceptance

1. Restart the local GDG Hub server after the migration.
2. Sign in as the linked active administrator.
3. Open `/admin/reports`, change the range, and download the CSV.
4. Open `/member/leaderboard` and confirm the administrator's row is marked
   **You**.
5. Sign out and confirm both member and admin routes redirect to `/login`.

The legacy `/api/leaderboard/rebuild` endpoint now returns HTTP 410 because
ranking is calculated from the live append-only ledger.
