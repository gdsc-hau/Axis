# GDG Community (Bevy) Event Integration

## Ownership model

- **GDG Community / Bevy:** Authoritative event title, description, schedule, type, location, image, publication state, and official URL.
- **Axis:** Read-only synchronized mirror used for discovery pages.
- **Luma:** External registration/ticket page. Axis stores only the redirect URL.

Axis deliberately does not scrape GDG Community HTML. Bevy's documented event
webhook is the supported primary transport. A reviewed official export/manual
import can be added later if the chapter cannot obtain webhook access.

## Current activation state

The receiver and database contract can be tested locally, but the real webhook
must remain unconfigured while GDG Hub has no public HTTPS deployment. Bevy
requires HTTPS and cannot deliver to `localhost`.

Do not enable attendee, user, survey, or chapter-member webhook updates for
this integration. Only event updates are in scope.

## Environment variables

Add these only to the untracked `apps/gdg-hub/.env.local`:

```dotenv
BEVY_WEBHOOK_SECRET=<random-secret-with-at-least-32-characters>
BEVY_WEBHOOK_SECRET_HEADER=x-axis-bevy-secret
BEVY_CHAPTER_ID=
BEVY_CHAPTER_SLUG=gdg-on-campus-holy-angel-university-angeles-philippines
```

If the official numeric Bevy chapter ID is known, set `BEVY_CHAPTER_ID`; exact
ID matching then takes precedence over slug matching. Never commit the secret.

## Local no-Docker test

Prerequisites:

1. Apply and verify `20260821092708_bevy_event_mirror.sql` in the linked Supabase project.
2. Configure the environment variables above.
3. Start Hub from Git Bash:

```bash
pnpm --filter gdg-hub dev
```

In a second Git Bash terminal, set the same test secret and post the tracked
fixture:

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

Repeat the request. It should remain successful and update the same event row,
not create a duplicate.

## Manual Supabase checks

Run this read-only query in the hosted SQL Editor:

```sql
select
  id,
  source_event_id,
  source_chapter_id,
  title,
  status,
  source_status,
  source_url,
  luma_url,
  start_at,
  end_at,
  source_updated_at,
  last_synced_at
from public.events
where source_provider = 'BEVY'
order by start_at desc;
```

The fixture row should have `source_event_id = '123456'`, status `PUBLISHED`,
and a null `luma_url` initially.

Before allowing a local webhook request to write through to the linked project,
run `supabase/preflight/bevy_event_mirror_smoke_test.sql` in the hosted SQL
Editor. It executes the synchronization RPC as `service_role`, verifies event
creation, audit logging, and stale-delivery rejection, then rolls the test
writes back inside a PL/pgSQL exception subtransaction. The final result must
report `passed = true`, and no fixture event or audit record is retained.

Then open `http://localhost:3001/admin/events` as the active admin, attach a
test `https://luma.com/...` event URL, and confirm:

1. The admin page shows the saved URL after refresh.
2. `/events` uses **Register on Luma** for that event.
3. Clearing the field restores the official GDG Community fallback.
4. An invalid domain or non-HTTPS URL is rejected.

## Production activation (later)

After GDG Hub has a reviewed public HTTPS URL and environment secrets:

1. In the Bevy administrator webhook settings, use `https://<hub-host>/api/integrations/bevy/events`.
2. Set the Bevy **Webhooks Secret Key** to the configured header name and **Webhooks Secret** to the configured secret.
3. Enable event updates only.
4. Publish or edit one controlled GDG event and verify its Axis row and audit record.
5. Keep the webhook secret in the deployment secret store and rotate it if exposed.

References: [Bevy webhook configuration](https://help.bevy.com/hc/en-us/articles/1500001777062-Configure-webhooks), [documented payloads](https://help.bevy.com/hc/en-us/articles/20825389601175-Webhook-payloads), and [delivery behavior](https://help.bevy.com/hc/en-us/articles/38500256349463-When-are-webhook-payloads-sent).
