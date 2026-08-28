# Reward Marketplace Runbook

Phase 5 is a member-only Gyrocoin marketplace. It does not expose a public merch
store, take payments, ship items, send notifications, or award event attendance
points.

## Production migration checkpoint

Do not paste the migration body into the hosted
SQL Editor.

1. In the hosted Supabase SQL Editor, run `supabase/preflight/reward_redemption_marketplace_preflight.sql` and require every `passed` value to be `true`.
2. Export the current `redemptions`, `points_ledger`, and `audit_logs` tables as CSV. An empty `redemptions` export is expected.
3. From Git Bash at the repository root, run `npx supabase db push --dry-run`.
4. Confirm the only pending migration is `20260821172810_reward_redemption_marketplace.sql`.
5. Run `npx supabase db push` and answer `Y` only when that migration is listed.
6. Run `supabase/preflight/reward_redemption_marketplace_verify.sql` in the SQL Editor and require every check to pass.
7. Run `supabase/preflight/reward_redemption_marketplace_smoke_test.sql`. It must return one passing row and leave no catalog, redemption, ledger, history, or audit fixtures.

## Local acceptance test

Run GDG Hub locally on port 3001 and use a linked active administrator account.

1. Open `/admin/products` and create a hidden test reward with cost `25` and available stock `3`.
2. Expand the saved item, mark it visible, and save it again.
3. If the test member has no balance, use `/admin/gyrocoins` to award `100` Gyrocoins with a clear test reason.
4. Sign in as that active member and open `/member/rewards`. Confirm the catalog shows the reward, stock `3`, cost `25`, and the current wallet balance.
5. Redeem quantity `2`. Confirm the new record is `Pending review`, the visible stock is `1`, and `/member/wallet` contains a `Marketplace redemption` debit of `-50`.
6. Cancel that pending request with a reason. Confirm status `Cancelled`, stock returns to `3`, and the wallet shows a `Marketplace refund` of `+50`.
7. Submit quantity `1` again. As administrator, approve it at `/admin/rewards`, then mark it fulfilled. Confirm stock remains `2` and no refund exists.
8. Submit another quantity `1` request and reject it with a reason. Confirm stock returns to `2` and the member receives exactly one refund.
9. In Supabase, inspect `redemptions`, `redemption_status_history`, `points_ledger`, and `audit_logs`. Every UI action should have matching immutable history and audit rows.

Test actions write real hosted data. Preserve the immutable ledger and redemption
history; clean up by hiding the test reward and, if necessary, use an explicit
administrator Gyrocoin adjustment with a reason rather than deleting or editing
ledger rows.
