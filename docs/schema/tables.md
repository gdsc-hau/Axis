# Data Dictionary & Tables

This document outlines the core tables in the `public` schema. All tables use `snake_case` naming conventions.

## `members`

The core identity table.

- `id` (UUID): Primary key for the member registry.
- `full_name` (TEXT): Registry-owned legal/display identity used by GDG ID and Axis. Member onboarding and profile forms must never modify it.
- `auth_id` (UUID, nullable): Link to `auth.users.id` after activation.
- `gdg_id` (TEXT): The human-readable GDG Holy Angel University ID.
- `role` (TEXT): `MEMBER` or `ADMIN`.
- `member_status` (TEXT): `PENDING`, `ACTIVE`, `REJECTED`, `SUSPENDED`, `INACTIVE`, or `ALUMNI`. Only `ACTIVE` grants portal access.
- `is_accepted` (BOOLEAN): Deprecated compatibility field derived from `member_status`; application code must not use it.
- `invited_at` (TIMESTAMPTZ, nullable): Most recent successfully recorded invitation.
- `activated_at` (TIMESTAMPTZ, nullable): First successful Auth-account link.
- `profile_completed_at` (TIMESTAMPTZ, nullable): First successful profile completion.
- `deactivated_at` (TIMESTAMPTZ, nullable): Time of the latest transition away from `ACTIVE`.
- `deactivation_reason` (TEXT, nullable): Optional internal administrator note for a restricted state.
- `updated_at` (TIMESTAMPTZ)

Member-editable profile data is flattened onto `members` through the `bio`,
`phone_number`, `links`, and `status_message` columns. Identity fields such as
`full_name`, `gdg_id`, `student_id`, `email`, `program`, and `department` remain
registry-owned. There is no active `member_profiles` table.

## `id_qr_codes`

Stores the active QR code for a member's digital ID.

- `member_id` (UUID): FK to `members`.
- `qr_value` (TEXT): The securely hashed or random string encoded in the QR.
- `expires_at` (TIMESTAMPTZ): When the QR code must be rotated.

## `events`

A read-only local mirror of authoritative GDG Community event content, plus a
separately managed Luma destination.

- `id` (UUID): Axis identifier.
- `title`, `description`, `location`, `event_type`: Mirrored Bevy content.
- `start_at`, `end_at` (TIMESTAMPTZ): Mirrored schedule. Past/upcoming is derived from these timestamps.
- `status` (TEXT): `DRAFT`, `PUBLISHED`, `COMPLETED`, or `CANCELLED`. Bevy maps only to `DRAFT`, `PUBLISHED`, and `CANCELLED`; completed Bevy events remain published.
- `luma_url` (TEXT, nullable): Admin-managed HTTPS registration URL on `luma.com` or `lu.ma`.
- `source_provider` (TEXT): `MANUAL` for legacy rows or `BEVY` for synchronized rows.
- `source_event_id`, `source_chapter_id` (TEXT): Stable upstream identity. The provider/event pair is unique.
- `source_url` (TEXT): Official `gdg.community.dev/events/details/...` page.
- `image_url` (TEXT, nullable): Mirrored HTTPS image reference. Placeholder UI does not render remote images yet.
- `source_status` (TEXT): Bevy's `Draft`, `Published`, or `Canceled` value.
- `source_updated_at` (TIMESTAMPTZ): Upstream version used to reject stale deliveries.
- `last_synced_at` (TIMESTAMPTZ): Most recent accepted delivery time.
- `source_payload_hash` (TEXT): SHA-256 of the normalized upstream event.

Authenticated users have no direct insert, update, or delete privileges on
this table. The service-only `sync_bevy_event` RPC owns upstream writes, while
the self-checking `set_event_luma_url` RPC owns the single admin-editable field.

## `event_attendance`

Tracks who RSVP'd and who actually attended.

- `event_id` (UUID): FK to `events`.
- `member_id` (UUID): FK to `members`.
- `status` (TEXT): `REGISTERED` or `CHECKED_IN`.
- `confirmed_by` (UUID): FK to the admin who scanned the QR code.

## `points_ledger`

An append-only immutable ledger tracking the points economy.

- `id` (UUID)
- `ledger_sequence` (BIGINT identity): Canonical monotonic transaction order. Sequence values can have gaps after rolled-back writes.
- `member_id` (UUID): FK to `members`.
- `source_type` (TEXT): `MANUAL_AWARD`, `MANUAL_DEDUCTION`, `EVENT_ATTENDANCE`, `MARKETPLACE_REDEMPTION`, or `MARKETPLACE_REFUND`.
- `source_id` (TEXT): Required idempotency/source reference. Manual adjustments store the submitted operation UUID.
- `points` (INTEGER): Can be positive (earned) or negative (spent).
- `balance_after` (INTEGER): The running total of the member's points _after_ this transaction.
- `note` (TEXT): Required administrator reason for manual transactions and optional context for system transactions.
- `created_at` (TIMESTAMPTZ): Immutable transaction timestamp.

Members can read only their own ledger; active administrators can read every
ledger. Authenticated users cannot insert, update, or delete rows directly.
Manual changes use `adjust_member_gyrocoins()`, while the service-role-only
`award_points()` function is reserved for supported future integrations. Both
functions lock per member, reject overdrafts, and make exact retries
idempotent. A before-insert trigger independently derives `balance_after` from
the highest ledger sequence so callers cannot supply or race the running total.

## `badges` & `member_badges`

- `badges`: Dictionary of available badges (e.g., "Hackathon Winner").
- `member_badges`: Mapping table tracking which member earned which badge and when.

## `certificates`

Tracks generated PDFs for event attendees.

- `event_id` (UUID)
- `member_id` (UUID)
- `certificate_number` (TEXT): Unique verifier ID.
- `pdf_url` (TEXT): Pointer to Supabase Storage.

## `rewards`

Member-only reward catalog managed by active administrators.

- `slug` and `name`: Stable catalog identity and display label.
- `point_cost`: Gyrocoin price captured again on each redemption.
- `stock_quantity`: Available inventory; pending and approved requests have already reserved their units.
- `active`: Controls visibility to active members. Inactive rows remain readable to administrators and are never deleted from historical links.
- `sort_order`: Deterministic catalog ordering.

Authenticated roles have read-only table privileges. Catalog changes use the
audited create/update RPCs, and deleting a catalog row is intentionally not
supported.

## `redemptions`

Marketplace requests made by active members.

- `member_id` and `reward_id`: Immutable owner and catalog references.
- `quantity`, `unit_cost`, and `total_cost`: Price snapshot; the database verifies `total_cost = quantity × unit_cost`.
- `request_operation_key`: UUID that makes an exact request retry idempotent.
- `debit_ledger_id` and `refund_ledger_id`: Immutable Phase 4 ledger links.
- `status`: `PENDING`, `APPROVED`, `FULFILLED`, `REJECTED`, or `CANCELLED`.
- Review, rejection/cancellation reason, and fulfillment fields are constrained to match the current status.

Requests atomically reserve inventory and deduct Gyrocoins. A pending member
cancellation or administrator rejection restores both using a compensating
ledger entry; ledger history is never rewritten.

## `redemption_status_history`

Append-only transition history for every redemption. `operation_key` is unique,
and constraints allow only `NULL → PENDING`, `PENDING → APPROVED/REJECTED/CANCELLED`,
or `APPROVED → FULFILLED` transitions. Members can read history for their own
redemptions, while active administrators can read all history.
