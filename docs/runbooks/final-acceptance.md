# Final Acceptance Audit

This audit converts the phase-by-phase database checks into one release decision.
It does not deploy the applications or authorize invitations, email, or webhooks.

## Current audit snapshot — 2026-08-27

| Gate                     | Result      | Evidence                                                                                     |
| ------------------------ | ----------- | -------------------------------------------------------------------------------------------- |
| Dependency audit         | Pass        | Zero known vulnerabilities at low severity after patched transitive floors                   |
| Peer compatibility       | Pass        | No peer dependency issues after updating `next-themes` for React 19                          |
| Lint                     | Pass        | Both applications passed uncached with zero warnings                                         |
| TypeScript               | Pass        | Hub, ID, and shared UI passed uncached                                                       |
| Automated tests          | Pass        | 56 passed, 0 failed                                                                          |
| Production builds        | Pass        | GDG Hub (47 routes) and GDG ID (11 routes) built with Next.js 15.5.24 on Node 22             |
| Documentation            | Pass        | MkDocs strict build completed                                                                |
| Migration reconciliation | Conditional | 28 deployed versions match; one reviewed release-advisor migration remains local and pending |
| Migration dry run        | Pass        | Hosted dry run identified only `20260827014255_release_advisor_foreign_key_indexes.sql`      |
| Linked schema lint       | Pass        | Public schema returned no errors at warning level                                            |
| Phase verification       | Pass        | Phase 1–12 verification and transactional smoke-test evidence supplied during implementation |
| System Health            | Conditional | 13 pass, 2 expected rollout warnings, 0 failures                                             |
| Security Advisor         | Conditional | One Free-plan Auth warning accepted with compensating controls                               |
| Performance Advisor      | Pass        | 0 errors, 0 warnings; 63 pre-launch unused-index information notices retained                |

The two remaining System Health warnings have known pre-launch dispositions:

- Most active registry members are intentionally unlinked until administrators
  start the invitation rollout.
- Event source activity remains empty until the public Hub and Bevy integration
  are explicitly enabled.

The support channel is configured as `gdsc.holyangel@gmail.com` and now passes
System Health. The latest recorded run has 13 passes, 2 warnings, and 0 failures.

## Supabase Advisor disposition — 2026-08-27

### Security Advisor

The hosted project reports one warning: leaked-password protection is disabled.
The project will remain on the Supabase Free plan, where this paid Auth control is
not available. This warning is accepted for the pre-launch release with these
compensating controls:

- Account creation remains restricted to active, unlinked emails in the
  authoritative `members` registry by the Before User Created hook.
- Public self-registration remains disabled; administrators control invitations.
- Strong password guidance and administrator MFA are required operationally.
- The warning must be reviewed again before a paid-plan upgrade or broad member
  invitation rollout.

### Performance Advisor

The refreshed Advisor reports 0 errors, 0 warnings, and 63 `INFO` findings, all of
type `unused_index`. The former 21 unindexed-foreign-key findings are gone after
applying `20260827014255_release_advisor_foreign_key_indexes.sql`. The 63 current
notices comprise the 42 pre-existing indexes plus the 21 newly installed foreign-key
indexes, none of which has representative production usage statistics yet.

All 63 unused indexes are intentionally retained. The system has not received
representative production traffic, so index-usage statistics cannot yet justify
dropping query, integrity, history, foreign-key, or report indexes. Review them
after at least 30 days of real traffic using query plans and index statistics.

**Current decision: release preparation passes conditionally, but production
release is not yet approved.** Remaining acceptance work is confirming migration
history reconciliation for the Advisor index migration, completing the exact hosted
Auth/Storage/Data API checks, configuring a Preview environment, and executing
Preview manual flow tests. Invitations, webhook registration, and email delivery
remain off.

## Evidence required

| Area                   | Required evidence                                                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Source                 | Reviewed commit SHA and intentional `git status`                                                                                 |
| Dependencies           | Frozen install and zero known vulnerabilities at low severity                                                                    |
| Static quality         | Lint and TypeScript checks pass without warnings                                                                                 |
| Automated behavior     | Complete Node test suite passes                                                                                                  |
| Production compilation | Both Next.js applications build under Node 22                                                                                    |
| Documentation          | MkDocs strict build passes                                                                                                       |
| Database history       | Local and remote migration versions match                                                                                        |
| Database contract      | Every phase verify and transactional smoke test passes                                                                           |
| Runtime integrity      | Latest System Health has zero failures                                                                                           |
| Security               | Supabase advisors reviewed, RLS/Data API exposure verified                                                                       |
| Manual flow            | Role, auth, profile, event, wallet, reward, attendance, credential, content, communication, report, and settings checks recorded |

## Local commands

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
git diff --check
git status --short
```

## Hosted checks

```bash
npx supabase migration list --linked
npx supabase db push --dry-run
npx supabase db lint --linked --schema public --level warning
```

Then use Supabase Studio to run the current verify scripts, System Health, and the
Security and Performance Advisors. A warning requires an owner and disposition; a
failure blocks release.

### Hosted inspection limitation

The automated Supabase connector available during the 2026-08-27 audit was
authenticated to a different account and did not expose the linked Axis project.
No advisor result from that connector was used as Axis evidence, and no remote
mutation was attempted. An administrator must complete the following read-only
checks in the `gdghau-id-platform` Studio project:

1. Open **Database > Advisors > Security** and resolve or document every finding.
2. Open **Database > Advisors > Performance** and resolve or document every finding.
3. Open **Authentication > URL Configuration** and verify the exact Site URL and
   redirect allow list for each environment. Keep only localhost entries until a
   Preview deployment exists.
4. Open **Authentication > Hooks** and confirm the Before User Created hook targets
   `hook_restrict_member_account_creation`.
5. Confirm public sign-up is disabled, email confirmation is enabled, and no member
   invitations have been sent before the approved rollout.
6. Review **Data API settings** and grants for exposed schemas; RLS must remain
   enabled on every exposed table.
7. Confirm the `certificates` Storage bucket is private.
8. Confirm Edge Function secrets are present without displaying their values, and
   keep both email-delivery gates disabled until the sender and worker are ready.

Attach screenshots or exported advisor findings to the release record. Do not copy
secret values into the issue, pull request, or acceptance document.

## Manual acceptance record

Record tester, environment, timestamp, commit SHA, and result for each workflow:

1. Authentication, recovery, role routing, and sign-out.
2. Registry identity lock and editable profile revision.
3. Bevy event mirror, Luma redirect, attendance import/check-in/correction.
4. Gyrocoin awards/deductions and append-only balance integrity.
5. Reward request, cancellation/refund, approval, and fulfillment.
6. Badge/certificate issue, private download, and public verification.
7. In-app campaign/inbox/preferences with outbound email still disabled.
8. Article draft, preview, revision, publish, category, and archive.
9. Reports, CSV export, privacy-safe leaderboard, dashboard, and settings.
10. System Health run with zero failures.

## Release decision

- **Accept:** every required gate passes and all warnings have documented owners.
- **Conditional:** no failures, but a non-critical warning has an approved deadline.
- **Reject:** any security, migration, integrity, build, or core user-flow failure.

Do not mark final acceptance complete solely because the UI renders. Database
integrity, authorization, and rollback readiness are equal release criteria.
