# Luma attendance reconciliation

Axis does not implement an RSVP system and does not call the Luma API. Event
registration, cancellation, capacity, approval, tickets, and door check-in
remain in Luma. The GDG Hub event button redirects to the event-specific Luma
URL.

After an event, an administrator imports a Luma guest CSV into Axis. Axis uses
that snapshot only as attendance evidence, matches active members by normalized
email, and requires an explicit administrator confirmation before awarding
Gyrocoins.

## Source ownership

| Domain                                                                    | Source of truth                |
| ------------------------------------------------------------------------- | ------------------------------ |
| Event title, schedule, description, and GDG page                          | GDG Community / Bevy mirror    |
| Registration, cancellation, approval, capacity, ticket, and door check-in | Luma                           |
| Member identity and eligibility                                           | `public.members`               |
| Confirmed participation and event history                                 | Axis attendance tables         |
| Gyrocoin award and reversal                                               | Append-only Axis points ledger |

An Axis `REGISTERED` row is only a historical CSV snapshot. It is not a live
RSVP and must not be presented as current Luma registration state.

## Organizer runbook

1. Create the registration in Luma.
2. Attach its event-specific `https://luma.com/...` or `https://lu.ma/...` URL
   to the mirrored event in `/admin/events`.
3. Use Luma's QR scanner or guest search for door check-in.
4. After check-in is complete, open Luma's guest table. Prefer filtering it to
   **Checked In**, then download the filtered CSV.
5. Open `/admin/events/{eventId}/attendance` in Axis.
6. Configure the Gyrocoin award before confirming anyone. Zero is allowed for
   events without an award.
7. Import the CSV and review unmatched, inactive, ignored, and duplicate counts.
8. Confirm each checked-in member. Confirmation appends the Gyrocoin award once.
9. Use a manual check-in only for a documented exception, such as a scanner
   outage.
10. Use a correction with a required reason when attendance was confirmed in
    error. The correction appends a negative ledger entry; it never edits the
    original award.

Luma documents that group registration can produce one CSV row per ticket, so
the same email may occur more than once. Axis sorts checked-in evidence first
and deduplicates by normalized email. See [Download Guest List as
CSV](https://help.luma.com/p/download-guest-csv) and [Managing Your Guest
List](https://help.luma.com/p/managing-your-guest-list).

## Imported and discarded data

The server reads only recognized versions of these fields:

- Email
- Approval or registration status
- Registration timestamp
- Check-in flag or timestamp

The importer discards names, phone numbers, payment details, coupon codes, QR
codes, and answers to custom questions. Raw CSV content is not stored. The
database stores only batch filename/hash/counts and attendance rows linked to
members. Unmatched emails are returned to the submitting administrator for the
immediate review screen but are not persisted.

CSV files are limited to 2 MB and 5,000 rows. A SHA-256 hash makes retrying the
same event/file idempotent.

## Attendance lifecycle

```text
Luma CSV or manual exception
          |
          v
      CHECKED_IN -------> CONFIRMED -------> NO_SHOW / CANCELLED
          |                    |                       |
          |                    +-- award              +-- reversal
          +------ correction ------> NO_SHOW / CANCELLED
```

`PENDING`, waitlisted, and invited Luma guests are ignored. Approved guests
without check-in evidence may appear as `REGISTERED` in a full guest export,
but they cannot be confirmed until an administrator records check-in evidence.

## Financial correction rule

The Gyrocoin ledger cannot become negative. If a member has already spent an
attendance award, the correction is rejected atomically. An administrator must
first resolve the wallet balance through the existing audited manual adjustment
workflow, then retry the attendance correction.

## Security boundary

- Public and member pages cannot write attendance.
- Authenticated clients cannot directly insert, update, or delete attendance,
  import batches, status history, or ledger rows.
- Public RPC wrappers run as `SECURITY INVOKER`.
- Private privileged helpers use an empty search path and independently require
  a linked, active administrator.
- Import, manual check-in, confirmation, correction, award, reversal, history,
  and audit writes occur in the same database transaction.

## Deployment checks

Run in this order:

1. `supabase/preflight/event_attendance_luma_csv_preflight.sql`
2. `npx supabase db push --dry-run`
3. `npx supabase db push`
4. `supabase/preflight/event_attendance_luma_csv_verify.sql`
5. `supabase/preflight/event_attendance_luma_csv_smoke_test.sql`

The verification and smoke-test scripts are read-only or transactional. The
smoke-test fixtures are rolled back.
