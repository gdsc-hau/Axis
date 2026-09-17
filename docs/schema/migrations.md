# Supabase Migrations

Axis manages every database schema and security change through committed Supabase migrations. The repository history is the reproducible contract for development, staging, production, application types, verification, and later phases.

## Never Mutate Production Manually

> [!WARNING]
> Do **not** use the Supabase Studio UI in production to create tables, add columns, or write SQL directly.
> All changes must be captured in a migration file and checked into Git.

## Current migration history

Migration timestamps define deployment order. The files remain committed after
deployment because a new environment, reviewer, or incident investigation must
be able to reconstruct the exact database contract.

| Stage             | Migration files                                      | Capability                                                                            |
| ----------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Baseline          | `0000` through `20260720020000`                      | Core tables, Auth link, normalized columns, constraints, RPCs, RLS, and RLS hardening |
| Phase 1           | `20260820123815`, `20260820144434`, `20260821081201` | Member lifecycle, Advisor hardening, and retry-safe profile completion                |
| Phase 2           | `20260821083404`                                     | Invitation and account-creation guardrails                                            |
| Phase 3           | `20260821092708`                                     | Read-only GDG Community/Bevy event mirror and managed Luma URLs                       |
| Phase 4           | `20260821104059`, `20260821125016`                   | Gyrocoin ledger, wallet, and deterministic ordering                                   |
| Phase 5           | `20260821172810`, `20260821182815`                   | Reward marketplace and registry-name protection                                       |
| Phase 6           | `20260825154838`                                     | Luma CSV attendance import and reconciliation                                         |
| Phase 7           | `20260825170545`                                     | Badge and certificate recognition workflows                                           |
| Phase 8           | `20260826001721`, `20260826004121`                   | Notifications, communications, email outbox, and policy cleanup                       |
| Phase 9           | `20260826014432`, `20260826060920`, `20260826072424` | Article authoring, publication consistency, and public reading                        |
| Phase 10          | `20260826090000`                                     | Reporting, CSV export support, and leaderboard queries                                |
| Phase 11          | `20260826160000`                                     | Versioned member profiles and portal settings                                         |
| Phase 12          | `20260826170000`                                     | Immutable administrator system-readiness health checks                                |
| Release hardening | `20260827014255`                                     | Foreign-key indexes requested by the hosted Performance Advisor                       |

Use the full filename in `supabase/migrations/` when reviewing or deploying; the
short timestamps above are only a navigation aid. Feature-specific acceptance
steps live in the [Runbook Index](../runbooks/README.md).

## Creating a migration

1. Start from the latest migration history on the maintainer-designated integration branch.
2. Create a new ordered migration file. Use `npx supabase migration new describe_your_change` or follow the existing timestamp naming pattern.
3. Write the smallest forward-only SQL change that preserves deployed data and compatibility.
4. Add a read-only preflight under `supabase/preflight/` that proves the expected baseline exists and rejects ambiguous data.
5. Add post-deployment verification. Behavioral changes also need a transactional smoke test whose fixture writes roll back.
6. Update `packages/db/src/database.types.ts`, domain modules, contracts, application code, tests, and runbooks affected by the schema.
7. Review the complete diff and commit all migration assets together.

Do not prototype shared-project schema changes by editing tables in Studio. Write and review the migration first. The SQL Editor is used for the tracked preflight, verification, smoke-test, and narrowly documented operational queries.

## Writing Migrations by Hand

Sometimes it is safer or cleaner to write the SQL by hand:

```bash
npx supabase migration new add_new_feature_table
```

This creates an empty `.sql` file in `supabase/migrations/` for you to write your SQL manually.

## Applying migrations to a linked project

Only an authorized operator should apply migrations to a shared project:

1. Confirm the intended Supabase organization, project reference, branch/environment, and current backup plan.
2. Run the migration's preflight in the hosted SQL Editor; every required row must pass.
3. Compare local and remote migration history.
4. Run `npx supabase db push --dry-run` and confirm the exact expected pending list.
5. Apply with `npx supabase db push` only after review and backup requirements are satisfied.
6. Run the tracked verification and transactional smoke test in the SQL Editor.
7. Rerun relevant Security and Performance Advisor checks and record the outcome.

Do not paste a migration body into the SQL Editor. That changes the schema without recording its version in `supabase_migrations.schema_migrations`.

## Running preflight, verification, and smoke-test SQL

The SQL files under `supabase/preflight/` are operator checks for an approved
hosted Supabase project. They are not migrations, and the Supabase CLI does not
apply them through `db push`.

Each feature normally has files with the same base name:

| File suffix        | When to run                  | Purpose                                                                                            |
| ------------------ | ---------------------------- | -------------------------------------------------------------------------------------------------- |
| `*_preflight.sql`  | Before the related migration | Confirms the expected baseline and data are safe for that migration                                |
| `*_verify.sql`     | After the related migration  | Confirms the schema, constraints, indexes, policies, grants, and functions were deployed correctly |
| `*_smoke_test.sql` | After verification           | Exercises important behavior; test fixture writes are rolled back by the tracked script            |

### Run a SQL check in Supabase Studio

1. In this repository, open the required file under `supabase/preflight/`.
2. Confirm its filename matches the migration or corrective migration being
   tested. Follow the exact order in the applicable feature runbook when a phase
   has more than one migration.
3. In Supabase Dashboard, select the intended organization, project, and
   environment. Confirm these before running anything; staging and production
   results are not interchangeable.
4. Open **SQL Editor** and choose **New query**.
5. Copy the **entire contents** of the tracked SQL file into the query. Do not run
   only the currently selected fragment and do not add your own `COMMIT`.
6. Select **Run** once and wait for the complete result.
7. For a multi-row check, require every value in the `passed` column to be
   `true`. Read `check_name` and `details` for the exact assertion. For a smoke
   test, require its final result row to report `passed = true` and state that
   fixture writes were rolled back or that no data was written.
8. If any row is `false`, or the SQL Editor reports an error, stop. Save the full
   result and error text and fix or classify the finding before continuing. Do
   not repeatedly run a failing migration or manually edit hosted tables to make
   the check pass.
9. Save the result as release evidence without copying member exports, secret
   values, access tokens, or database credentials into Git or a pull request.

Example successful result:

```text
check_name                         passed  details
phase_dependencies_deployed       true    required migrations are recorded
existing_rows_valid               true    invalid rows=0
```

### Complete migration sequence

Use Studio and the CLI together in this order:

```text
1. SQL Editor: run the tracked *_preflight.sql file; require all checks to pass.
2. Terminal:   npx supabase migration list --linked
3. Terminal:   npx supabase db push --dry-run
4. Backup:     complete the phase-specific backup/export requirement.
5. Terminal:   npx supabase db push
6. SQL Editor: run the tracked *_verify.sql file; require all checks to pass.
7. SQL Editor: run the tracked *_smoke_test.sql file, when present.
8. Studio:     refresh Security Advisor and Performance Advisor.
```

Only files in `supabase/migrations/` are applied by `npx supabase db push`.
Never paste one of those migration files into the SQL Editor merely because its
preflight passed.

### When the migration is already deployed

A preflight describes the state **before** its migration. It may intentionally
return a failed row after that migration is already recorded, such as
`migration_should_not_already_be_deployed`. Do not repair or roll back a healthy
database to make an old preflight pass.

For an already-deployed migration:

1. Confirm its local and remote timestamp match with
   `npx supabase migration list --linked`.
2. Run its `*_verify.sql` file against the intended hosted project.
3. Run its rollback-only `*_smoke_test.sql` when the phase provides one and its
   documented prerequisites are available.
4. Rerun System Health and the relevant Supabase Advisors.

Preflight files remain committed because they are required when the migration is
promoted to a different environment, reviewed by another developer, or audited
later. Verification and smoke-test files remain the repeatable evidence for the
database contract.

## Corrections and rollback planning

Migrations are forward-only. Prefer transactional statements so a failure leaves no partial deployment. If a deployed behavior needs correction, create a new ordered migration with its own preflight and verification; never edit or delete a migration that is already recorded remotely.

For a high-risk data change, document the restoration source, affected tables, validation query, and recovery decision before applying it. Schema backups and data exports must be stored outside the repository because they can contain personal or privileged information.

## Phase 1 member lifecycle migration

`20260820123815_member_status_lifecycle.sql` performs the identity and access hardening in one transactional migration:

1. Stops with a clear error if lowercasing member emails would create duplicates.
2. Normalizes stored emails and adds `member_status` plus invitation, activation, profile-completion, and deactivation timestamps.
3. Maps legacy `is_accepted = true` rows to `ACTIVE` and false rows to `PENDING`.
4. Keeps `is_accepted` temporarily synchronized as a derived compatibility value.
5. Changes `current_member_id()` and `is_admin()` so only active members reach protected RLS policies.
6. Revokes direct authenticated updates to `members`.
7. Adds audited RPCs for status changes, role changes, invitations, Auth linking, and profile completion.
8. Prevents self-demotion and protects the final active administrator.

The migration must be deployed before application code that selects `member_status` or calls the new RPCs.

## Post-lifecycle advisor hardening

`20260820144434_post_member_status_advisor_hardening.sql` resolves the database advisor findings discovered after the lifecycle rollout:

1. Gives the shared `set_updated_at()` trigger function an immutable empty search path.
2. Moves RLS-bypassing member/admin lookups into the unexposed `private` schema while retaining security-invoker public wrappers.
3. Converts points and attendance RPCs to security-invoker functions backed by the existing admin RLS policies.
4. Adds indexes for every uncovered foreign-key column.
5. Consolidates overlapping permissive read policies without changing member/admin access behavior.

After every production database migration, run `supabase db lint --linked --schema public` and `supabase db advisors --linked --type all` and review every remaining finding.

For this hardening migration, use the SQL Editor scripts in this order:

1. Run `supabase/preflight/post_member_status_advisor_hardening_preflight.sql`; every row must pass.
2. Deploy the tracked migration with `supabase db push` so remote migration history remains synchronized.
3. Run `supabase/preflight/post_member_status_advisor_hardening_verify.sql`; every row must pass.
4. Open **Database > Advisors** in the Supabase dashboard and rerun the security and performance checks.

Do not paste the migration itself into the SQL Editor. Doing so would apply the schema changes without recording the migration version in `supabase_migrations.schema_migrations`.

## Release Advisor foreign-key indexes

`20260827014255_release_advisor_foreign_key_indexes.sql` resolves the 21
unindexed-foreign-key findings exported from the hosted Performance Advisor on
2026-08-27. It adds only B-tree indexes; it changes no rows, RLS policies,
functions, grants, or application behavior. Nullable actor and audit references
use partial indexes so null-only entries do not consume index space.

Use the linked hosted project:

1. Run `supabase/preflight/release_advisor_foreign_key_indexes_preflight.sql` in
   the SQL Editor; every row must pass.
2. Run `npx supabase db push --dry-run` and confirm only
   `20260827014255_release_advisor_foreign_key_indexes.sql` is pending.
3. Apply it with `npx supabase db push` so migration history remains synchronized.
4. Run `supabase/preflight/release_advisor_foreign_key_indexes_verify.sql`; every
   row must pass.
5. Rerun the hosted Performance Advisor. The 21 unindexed-foreign-key findings
   must be gone.

Do not drop indexes reported as unused during pre-launch. Reassess those findings
after at least 30 days of representative traffic and review query plans before any
removal migration.

## Phase 2 invitation guardrails

`20260821083404_member_invitation_guardrails.sql` completes the database side of member onboarding:

1. Creates a least-privilege Before User Created Auth hook that admits only active, unlinked `members` emails.
2. Grants `supabase_auth_admin` access only to the three registry columns used by the hook and adds its dedicated RLS policy.
3. Rejects lifecycle moves to `REJECTED`, `SUSPENDED`, `INACTIVE`, or `ALUMNI` unless an administrator reason is supplied.
4. Prevents invitation audit records for already linked accounts.
5. Distinguishes first invitations from invitation resends in `audit_logs`.

Use the SQL Editor and CLI in this order:

1. Run `supabase/preflight/member_invitation_guardrails_preflight.sql`; every row must pass.
2. Run `supabase db push --dry-run` and confirm only `20260821083404_member_invitation_guardrails.sql` is pending.
3. Apply it with `supabase db push` so remote migration history stays synchronized.
4. Run `supabase/preflight/member_invitation_guardrails_verify.sql`; every row must pass.
5. Enable `public.hook_restrict_member_account_creation` as the **Before User Created** Postgres hook in the hosted Supabase Auth settings. Creating the function does not enable the hosted hook automatically.

## Phase 3 Bevy event mirror

`20260821092708_bevy_event_mirror.sql` creates a one-way, supported event
integration without enabling Axis RSVP or attendance behavior:

1. Extends `events` with upstream identity, status, URL, image, version, sync, and payload-hash columns.
2. Adds validated URL, identity, provider, title, and source-status constraints plus timeline and unique source indexes.
3. removes direct authenticated event writes and makes GDG-owned content read-only in Axis.
4. Adds the service-role-only, security-invoker `sync_bevy_event` RPC with atomic upsert and stale-delivery protection.
5. Adds an audited, active-admin-only `set_event_luma_url` RPC.
6. Makes published, completed legacy, and cancelled events visible while keeping drafts private to admins.

Use the linked hosted project:

1. Run `supabase/preflight/bevy_event_mirror_preflight.sql` in the hosted SQL Editor; every row must pass.
2. Run `npx supabase db push --dry-run` and confirm only `20260821092708_bevy_event_mirror.sql` is pending.
3. Export the current `events` rows from the hosted Table Editor as CSV and retain the preflight output. The migration is transactional and does not mutate member rows.
4. Apply the tracked migration with `npx supabase db push`.
5. Run `supabase/preflight/bevy_event_mirror_verify.sql` in the SQL Editor; every row must pass.
6. Run `supabase/preflight/bevy_event_mirror_smoke_test.sql`; it must pass and confirm that its event and audit writes were rolled back.
7. Follow `docs/integrations/bevy-events.md` to perform the non-writing local authentication and chapter-filter tests.

Do not configure the real Bevy webhook until GDG Hub has a reviewed public
HTTPS deployment. Applying this migration does not contact Bevy or Luma.

## Phase 4 Gyrocoin ledger and wallet

`20260821104059_gyrocoin_ledger_wallet.sql` makes the existing points ledger
safe to use from the administrator and member portals:

1. Normalizes legacy source labels and assigns deterministic references to old rows that did not have one.
2. Constrains source types, transaction direction, amount range, reasons, references, and non-negative balances.
3. Adds a unique source identity for idempotent retries and a cursor-friendly member timeline index.
4. Removes authenticated direct writes so callers cannot supply their own `balance_after` value.
5. Restricts the legacy `award_points` RPC to trusted service-role integrations and requires a supported, idempotent system source.
6. Adds an active-admin-only manual adjustment RPC that records the administrator, reason, operation key, resulting balance, and audit event atomically.
7. Adds authenticated read RPCs for the current member wallet summary and the administrator account list.

Use the linked hosted project:

1. Run `supabase/preflight/gyrocoin_ledger_wallet_preflight.sql` in the hosted SQL Editor; every row must pass.
2. Run `npx supabase db push --dry-run` and confirm only `20260821104059_gyrocoin_ledger_wallet.sql` is pending.
3. Export `points_ledger` and `audit_logs` from the hosted Table Editor as CSV. Retain the preflight output with the backup.
4. Apply the tracked migration with `npx supabase db push` so remote migration history remains synchronized.
5. Run `supabase/preflight/gyrocoin_ledger_wallet_verify.sql`; every row must pass.
6. Run `supabase/preflight/gyrocoin_ledger_wallet_smoke_test.sql`; it impersonates a linked active administrator and rolls back all test writes.
7. Test an actual manual award and deduction locally through `/admin/gyrocoins`, then confirm the member sees both entries at `/member/wallet`.

The initial production smoke test exposed that transaction-stable timestamps
cannot safely order multiple ledger entries written in one transaction.
`20260821125016_gyrocoin_ledger_ordering_fix.sql` corrects that before any real
ledger data exists by adding a monotonic identity sequence, rebuilding every
balance reader around that sequence, and adding a before-insert trigger that
derives the running balance independently of the caller.

For a project where `20260821104059` is already deployed, complete this
corrective checkpoint before retrying the smoke test:

1. Run `supabase/preflight/gyrocoin_ledger_ordering_fix_preflight.sql`; every row must pass and the ledger must still be empty.
2. Run `npx supabase db push --dry-run` and confirm only `20260821125016_gyrocoin_ledger_ordering_fix.sql` is pending.
3. Apply it with `npx supabase db push`.
4. Run `supabase/preflight/gyrocoin_ledger_ordering_fix_verify.sql`; every row must pass.
5. Rerun `supabase/preflight/gyrocoin_ledger_wallet_smoke_test.sql`; it must pass and roll back all fixture entries.

Do not paste the migration into the SQL Editor. The SQL Editor is only used for
the read-only preflight/verification and rollback-only smoke test. Event
attendance and automatic event awards remain disconnected in this phase.

## Phase 5 reward catalog and redemptions

`20260821172810_reward_redemption_marketplace.sql` connects a member-only reward
catalog to the corrected Phase 4 ledger:

1. Creates a validated, RLS-protected `rewards` catalog with available stock, visibility, cost, and stable slug fields.
2. Extends empty baseline `redemptions` rows with reward snapshots, quantity, operation identity, debit/refund ledger links, review data, and fulfillment data.
3. Adds append-only `redemption_status_history` rows for request, approval, rejection, cancellation, and fulfillment transitions.
4. Revokes authenticated and service-role direct marketplace writes. Active members and active administrators use self-checking RPCs through Server Actions.
5. Reserves stock and deducts Gyrocoins atomically when a request is submitted. A failed stock check or wallet check rolls back the entire request.
6. Restores stock and appends a refund ledger row atomically when a pending request is rejected or cancelled.
7. Requires idempotency UUIDs for every financial/status operation and writes marketplace audit events in the same transaction.

The migration deliberately refuses to run if the existing `redemptions` table
contains rows because the old schema has no trustworthy reward/catalog key to
backfill.

Use the linked hosted project:

1. Run `supabase/preflight/reward_redemption_marketplace_preflight.sql` in the hosted SQL Editor. Every row must pass.
2. Export `redemptions`, `points_ledger`, and `audit_logs` from the hosted Table Editor as CSV, even when `redemptions` is empty.
3. Run `npx supabase db push --dry-run` and confirm only `20260821172810_reward_redemption_marketplace.sql` is pending.
4. Apply the tracked migration with `npx supabase db push`.
5. Run `supabase/preflight/reward_redemption_marketplace_verify.sql`; every row must pass.
6. Run `supabase/preflight/reward_redemption_marketplace_smoke_test.sql`; it must pass and roll back every fixture write.
7. Complete the local acceptance path in `docs/runbooks/rewards-redemptions.md` before creating real catalog data.

## Registry-owned profile name hotfix

`20260821182815_lock_registry_name_during_profile_completion.sql` closes a
profile-onboarding path that previously allowed `/verify` to replace the
authoritative `members.full_name` value:

1. Keeps the existing RPC signature for compatibility, but requires its name argument to exactly match the linked member's registry value.
2. Removes `full_name` from the profile-completion update and audit field list.
3. Continues to save the member-editable `bio` and `links` fields exactly once.
4. Reasserts the private helper's hardened search path and the public wrapper's security-invoker execution boundary.

Use the linked hosted project:

1. Run `supabase/preflight/profile_registry_name_lock_preflight.sql`; every row must pass.
2. Run `npx supabase db push --dry-run` and confirm only `20260821182815_lock_registry_name_during_profile_completion.sql` is pending.
3. Apply the tracked migration with `npx supabase db push`.
4. Run `supabase/preflight/profile_registry_name_lock_verify.sql`; every row must pass.
5. Run `supabase/preflight/profile_registry_name_lock_smoke_test.sql`; it must reject both a forged RPC name and a direct table update, preserve the registry name, save editable fields, and roll back every fixture change.
6. Correct any already-altered registry names through a separately reviewed and audited administrator repair; the migration cannot infer historical names that were never stored in audit metadata.
