# Core User Flows

This document outlines the major user journeys supported by the GDG HAU Axis platform.

## 1. Member Onboarding — Invite-Only Flow

Public self-registration is disabled. All Auth accounts originate from an administrator invitation tied to the pre-populated member registry.

1. **Admin Approval:** An active `ADMIN` changes the registry row from `PENDING` to `ACTIVE`. The database writes an audit record and protects the last active administrator.
2. **Admin Invites:** The admin submits up to 25 normalized, deduplicated emails at `/admin/invite`. One batch lookup requires every recipient to be an `ACTIVE`, unlinked `members` row. Both `MEMBER` and pre-approved `ADMIN` rows use this controlled path.
3. **Auth Boundary Check:** The Supabase Before User Created hook independently rejects new Auth identities whose email is not an active, unlinked registry row.
4. **Invitation Email:** Supabase sends a time-limited 6-digit code through `auth.admin.inviteUserByEmail`. A successful send records `invited_at`; a resend receives its own audit action.
5. **Invitation Confirmation:** At `/confirm-invite`, the recipient enters the member email and code. The server verifies an `invite` OTP and establishes the session without exposing a one-click token to email link scanners.
6. **Account Activation:** At `/activate`, the member sets a password, then `link_current_member_account()` verifies the Auth email and records `auth_id` and `activated_at`. Already activated accounts cannot reuse this endpoint to change their password.
7. **Profile Completion:** At `/verify`, the registry-owned full name is displayed read-only. `complete_current_member_profile()` saves only member-editable biography and social-link fields and sets `profile_completed_at`; it cannot overwrite `members.full_name`.
8. **Member Access:** Protected layouts and member-owned RLS policies require `member_status = 'ACTIVE'`.

If membership becomes `REJECTED`, `SUSPENDED`, `INACTIVE`, or `ALUMNI`, protected routes redirect to `/account-status`. RLS denies protected domain rows immediately even while an Auth session cookie exists.

### Password recovery

1. The member selects **Forgot password?** on `/login` and submits their account email. The browser client initiates the PKCE request so the code verifier is retained in that browser's cookies.
2. The UI always returns the same message so it does not reveal whether an Auth account exists.
3. Supabase sends a time-limited recovery link through `/auth/callback?next=/reset-password`.
4. The reset action requires the recovery session to match an `ACTIVE` member. It safely links a missing `members.auth_id`, applies the shared password policy, updates the password, and revokes active sessions.
5. The member logs in again with the new password.

## 2. Event Discovery and External Registration

Axis does not own GDG event content or registration. RSVP, attendance, and
check-in work remain explicitly deferred.

1. **GDG Event Management:** The chapter team creates and edits an event in GDG Community (Bevy), which remains the content source of truth.
2. **Event Synchronization:** Bevy sends an authenticated event webhook. Axis validates the documented payload, filters it to the HAU chapter, and atomically mirrors the record into `events`.
3. **Stale Delivery Protection:** Axis compares Bevy's `updated_ts` value and ignores delayed webhook deliveries that are older than the stored snapshot.
4. **Luma Destination:** An active Axis `ADMIN` may attach or remove an HTTPS `luma.com`/`lu.ma` event URL. This is the only event field editable in Axis.
5. **Discovery:** Public and member pages display mirrored upcoming and past events. A published event remains `PUBLISHED` after it concludes; the UI derives past/upcoming from `end_at`.
6. **Registration:** The call to action redirects to Luma. If no Luma URL exists, it redirects to the official GDG Community event page.

Axis does not scrape GDG Community HTML, call the Luma attendee API, create
`event_attendance` rows, or award points during this phase.

## 3. Gyrocoin Wallet and Manual Adjustments

1. An active administrator selects an active registry member and enters an award or deduction with a required reason.
2. The server validates the request and submits a UUID operation key to the database.
3. The database independently verifies the active administrator, locks the member wallet, and returns the existing row for an exact retry.
4. A new immutable ledger row stores the signed amount and calculated non-negative `balance_after` value.
5. The same transaction records an administrator audit event.
6. The member can view their current balance, earned/spent totals, and recent history at `/member/wallet`.

Members cannot mutate the ledger, and authenticated administrators cannot
insert ledger rows directly. Automatic event awards are intentionally not
connected.

## 4. Point Redemption

1. An active member views active rewards and their current available stock at `/member/rewards`.
2. The request supplies a quantity and UUID operation key. The database locks the catalog item and member wallet.
3. Available stock is reserved, an immutable `MARKETPLACE_REDEMPTION` debit is appended, and a `PENDING` redemption plus history/audit rows are created in one transaction.
4. The member may cancel only while pending; cancellation atomically restores stock and appends a `MARKETPLACE_REFUND` entry.
5. An active administrator approves or rejects the pending request at `/admin/rewards`. Rejection also restores stock and refunds the member.
6. An approved request remains reserved until an administrator records the physical handoff as `FULFILLED`.
7. Exact retries return the existing result. Reusing an operation key for different input is rejected.

Reward image URLs are optional placeholders during the design phase. Public
merchandise, shipping, payment processing, and event-attendance awards are not
part of this flow.

## 5. Certificate Generation

1. An admin starts certificate generation after an event.
2. The certificates package generates the PDF.
3. The file is stored in Supabase Storage.
4. A `certificates` row links the member, event, verifier number, and file location.
5. The member can view or download the issued certificate.
