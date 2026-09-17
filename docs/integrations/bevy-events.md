# GDG Community (Bevy) Event Integration

## Ownership model

- **GDG Community / Bevy:** Authoritative public event content and status.
- **Axis:** Validated, read-only mirror used by Hub discovery pages.
- **Luma:** Optional external registration destination managed separately in Axis.

Axis supports two ingestion paths that share the same audited database upsert:

1. Public-page synchronization for chapter organizers without HQ integration access.
2. Bevy's official event webhook when an HQ administrator enables it later.

Neither path imports attendees, registrations, surveys, organizer profiles, contact
submissions, or dashboard-only events.

## Public-page synchronization

The public fallback reads only these fixed HTTPS locations:

```text
https://gdg.community.dev/gdg-on-campus-holy-angel-university-angeles-philippines/
https://gdg.community.dev/events/details/<event-slug>/
```

It uses the page's schema.org `Event` JSON-LD as the baseline and validates the
server-rendered public event data with Zod for the numeric Bevy identifiers, full
description, chapter ownership, location, image, and tags. It does not send a GDG
login, cookie, API key, or browser session.

The adapter rejects:

- non-HTTPS, non-GDG, credential-bearing, or non-event URLs;
- an event from a chapter other than GDG on Campus HAU;
- hidden events;
- inconsistent titles or timestamps between the two public metadata sources;
- invalid dates, oversized pages, redirects, and non-HTML responses.

### Administrator operation

Open `/admin/events` as an active administrator.

- Paste one copied public event URL and choose **Import event** for a precise import.
- Choose **Sync all chapter events** to follow the same public `Live` and
  `Completed` pagination used by GDG Community's **Load more** controls, then
  refresh already-known current events.
- Review the inserted, updated, unchanged, and failed counts.
- Add or update the separate Luma URL after the event is present.

The synchronizer follows every reported page with bounded page and event limits;
it is not limited to the first four server-rendered cards. Use **Import event**
when you need to retry one specific public event. A fetch or format failure never
deletes an existing Axis event.

Both `/events` and `/admin/events` provide **All events**, **Upcoming**, and
**Past** filters. An event becomes past after its end time (or its start time when
no end time exists).

### Optional scheduled operation

Generate a dedicated secret and configure it only in the deployment secret store:

```dotenv
GDG_EVENT_SYNC_SECRET=<at-least-32-random-characters>
```

Configure the scheduler to call:

```text
GET https://<hub-host>/api/integrations/gdg-community/events
Authorization: Bearer <GDG_EVENT_SYNC_SECRET>
```

Daily or every few hours is sufficient. The endpoint also accepts `POST`. A
successful response contains discovery and outcome counts. It returns `401` for
an invalid bearer token, `503` when scheduling is intentionally unconfigured, and
`502` when the upstream chapter request cannot be completed.

Do not place the scheduler secret in `NEXT_PUBLIC_*`, source control, screenshots,
or scheduler URLs/query strings. Rotate it if exposed.

## Official Bevy webhook

The existing receiver remains available at:

```text
POST https://<hub-host>/api/integrations/bevy/events
```

Configure these server-side variables when an HQ administrator grants webhook
access:

```dotenv
BEVY_WEBHOOK_SECRET=<random-secret-with-at-least-32-characters>
BEVY_WEBHOOK_SECRET_HEADER=x-axis-bevy-secret
BEVY_CHAPTER_ID=
BEVY_CHAPTER_SLUG=gdg-on-campus-holy-angel-university-angeles-philippines
```

In Bevy, enable event updates only. Do not enable attendee, user, survey, event
people, chapter, or chapter-member updates.

## Local webhook fixture test

Prerequisites:

1. Apply and verify `20260821092708_bevy_event_mirror.sql`.
2. Configure the Bevy variables in untracked `apps/gdg-hub/.env.local`.
3. Start Hub with `pnpm --filter gdg-hub dev`.

Then run from a second Git Bash terminal:

```bash
export BEVY_WEBHOOK_SECRET='replace-with-the-same-32-plus-character-secret'

curl -i -X POST 'http://localhost:3001/api/integrations/bevy/events' \
  -H 'Content-Type: application/json' \
  -H "x-axis-bevy-secret: $BEVY_WEBHOOK_SECRET" \
  --data-binary '@tests/fixtures/bevy-event-webhook.json'
```

Expected response:

```json
{ "processed": 1, "ignoredOtherTypes": 0, "ignoredOtherChapters": 0 }
```

Repeat it to confirm the same event is updated rather than duplicated.

## Database verification

Before a write-through integration test, run
`supabase/preflight/bevy_event_mirror_smoke_test.sql` in the hosted SQL Editor.
It verifies service-role synchronization, audit logging, and stale-delivery
rejection, then rolls its fixture writes back.

After an administrator import, inspect the normalized mirror:

```sql
select
  source_event_id,
  source_chapter_id,
  title,
  status,
  source_url,
  luma_url,
  start_at,
  end_at,
  last_synced_at
from public.events
where source_provider = 'BEVY'
order by start_at desc;
```

Confirm the public event has the expected Bevy ID, HAU chapter ID, official URL,
and timestamps. A public-page import reports its fetch time in
`source_updated_at`; its content hash excludes that fetch time so an unchanged
refresh does not create a misleading update audit record.

## Operational limitations

The public-page adapter is a compatibility fallback, not a Bevy API contract.
GDG Community may change its rendered metadata. Parser fixtures and strict
validation make that change fail visibly instead of corrupting existing data.
The official webhook remains the preferred long-term transport.

References: [Bevy webhook configuration](https://help.bevy.com/hc/en-us/articles/1500001777062-Configure-webhooks), [documented payloads](https://help.bevy.com/hc/en-us/articles/20825389601175-Webhook-payloads), and [delivery behavior](https://help.bevy.com/hc/en-us/articles/38500256349463-When-are-webhook-payloads-sent).
