# Data Dictionary & Tables

This document outlines the core tables in the `public` schema. All tables use `snake_case` naming conventions.

## `members`
The core identity table.
- `id` (UUID): Primary key, matches `auth.users.id`.
- `gdg_id` (TEXT): The human-readable GDG Holy Angel University ID.
- `role` (TEXT): `MEMBER` or `ADMIN`.
- `updated_at` (TIMESTAMPTZ)

## `member_profiles`
Publicly viewable profile data for members.
- `id` (UUID)
- `member_id` (UUID): FK to `members`.
- `bio` (TEXT)
- `phone_number` (TEXT)
- `links` (JSONB): Links to GitHub, LinkedIn, etc.

## `id_qr_codes`
Stores the active QR code for a member's digital ID.
- `member_id` (UUID): FK to `members`.
- `qr_value` (TEXT): The securely hashed or random string encoded in the QR.
- `expires_at` (TIMESTAMPTZ): When the QR code must be rotated.

## `events`
A scheduled workshop, hackathon, or meeting.
- `id` (UUID)
- `title` (TEXT)
- `description` (TEXT)
- `location` (TEXT)
- `luma_url` (TEXT): Link to external RSVP system if used.
- `status` (TEXT): `DRAFT`, `PUBLISHED`, `COMPLETED`.

## `event_attendance`
Tracks who RSVP'd and who actually attended.
- `event_id` (UUID): FK to `events`.
- `member_id` (UUID): FK to `members`.
- `status` (TEXT): `REGISTERED` or `CHECKED_IN`.
- `confirmed_by` (UUID): FK to the admin who scanned the QR code.

## `points_ledger`
An append-only immutable ledger tracking the points economy.
- `id` (UUID)
- `member_id` (UUID): FK to `members`.
- `source_type` (TEXT): Reason for points (e.g., `EVENT_ATTENDANCE`, `MARKETPLACE_REDEMPTION`).
- `points` (INTEGER): Can be positive (earned) or negative (spent).
- `balance_after` (INTEGER): The running total of the member's points *after* this transaction.

## `badges` & `member_badges`
- `badges`: Dictionary of available badges (e.g., "Hackathon Winner").
- `member_badges`: Mapping table tracking which member earned which badge and when.

## `certificates`
Tracks generated PDFs for event attendees.
- `event_id` (UUID)
- `member_id` (UUID)
- `certificate_number` (TEXT): Unique verifier ID.
- `pdf_url` (TEXT): Pointer to Supabase Storage.

## `redemptions`
Marketplace requests made by members.
- `member_id` (UUID)
- `total_cost` (INTEGER): Points deducted.
- `status` (TEXT): `PENDING`, `FULFILLED`, `REJECTED`.
