# Tables

The current migrations define these core tables and relationships:

## Identity

- `members`: identity record with `student_id`, `email`, `hau_id`, `full_name`, `program`, `department`, and acceptance state
- `member_profiles`: one-to-one profile data for a member
- `member_credentials`: identity or document credentials tied to a member
- `member_verifications`: verification events and reviewer notes
- `id_qr_codes`: per-member QR values for identity checks
- `verification_logs`: audit trail for verification actions

## Community and events

- `events`: event metadata including Luma URL, dates, status, and type
- `event_attendance`: member registration, check-in, and confirmation state per event
- `notifications`: user-facing notifications for members

## Rewards and recognition

- `points_ledger`: points transactions and running balances
- `badges`: badge catalog
- `member_badges`: badge ownership per member
- `certificates`: issued certificates linked to members and optionally events
- `redemptions`: reward redemption requests and approvals

## Shared and operational

- `app_settings`: key/value application settings
- `audit_logs`: generic activity log for sensitive actions

## Key relationships

- `member_profiles.member_id` references `members.id`
- `member_credentials.member_id` references `members.id`
- `member_verifications.member_id` references `members.id`
- `member_verifications.verified_by` references `members.id`
- `event_attendance.event_id` references `events.id`
- `event_attendance.member_id` references `members.id`
- `points_ledger.member_id` references `members.id`
- `member_badges.member_id` references `members.id`
- `member_badges.badge_id` references `badges.id`
- `certificates.member_id` references `members.id`
- `certificates.event_id` references `events.id`
- `redemptions.member_id` references `members.id`
- `redemptions.approved_by` references `members.id`

