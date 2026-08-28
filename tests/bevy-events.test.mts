import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  BevyEventSchema,
  BevyWebhookPayloadSchema,
  LumaUrlSchema,
} from "../packages/contracts/src/index.ts";
import {
  getBevyEventStatus,
  isExpectedBevyChapter,
  mapBevyEvent,
  serializeBevyEventForHash,
} from "../packages/events/src/sync.ts";
import {
  getEventRegistrationLink,
  isLumaEventUrl,
} from "../packages/events/src/luma.ts";

const fixtureUrl = new URL(
  "./fixtures/bevy-event-webhook.json",
  import.meta.url,
);
const migrationUrl = new URL(
  "../supabase/migrations/20260821092708_bevy_event_mirror.sql",
  import.meta.url,
);
const routeUrl = new URL(
  "../apps/gdg-hub/app/api/integrations/bevy/events/route.ts",
  import.meta.url,
);

async function loadFixture() {
  return JSON.parse(await readFile(fixtureUrl, "utf8")) as unknown;
}

test("validates and maps the documented Bevy event webhook shape", async () => {
  const payload = BevyWebhookPayloadSchema.parse(await loadFixture());
  const event = BevyEventSchema.parse(payload[0]?.data[0]);

  assert.equal(isExpectedBevyChapter(event), true);
  assert.equal(getBevyEventStatus(event.status), "PUBLISHED");

  const mapped = mapBevyEvent(event);
  assert.deepEqual(mapped, {
    sourceEventId: "123456",
    sourceChapterId: "9876",
    title: "SYSTEM INITIALIZED: The 2026 Global Sync",
    description: "An official GDG on Campus HAU event.",
    location: "Holy Angel University, Sto. Rosario Street, Angeles City, 2009",
    eventType: "Tech Talk / Meetup",
    startAt: "2026-08-08T19:00:00+08:00",
    endAt: "2026-08-08T22:30:00+08:00",
    sourceUrl:
      "https://gdg.community.dev/events/details/google-gdg-on-campus-holy-angel-university-angeles-philippines-presents-system-initialized-the-2026-global-sync/",
    imageUrl: "https://example.com/event.jpg",
    sourceStatus: "Published",
    sourceUpdatedAt: "2026-08-01T10:30:00Z",
  });

  assert.equal(
    serializeBevyEventForHash(mapped),
    serializeBevyEventForHash({ ...mapped }),
  );
});

test("rejects reversed Bevy event dates and filters another chapter", async () => {
  const payload = BevyWebhookPayloadSchema.parse(await loadFixture());
  const original = payload[0]?.data[0] as Record<string, unknown>;

  assert.equal(
    BevyEventSchema.safeParse({
      ...original,
      end_date: "2026-08-08T18:00:00+08:00",
    }).success,
    false,
  );

  const event = BevyEventSchema.parse({
    ...original,
    chapter: {
      ...(original.chapter as Record<string, unknown>),
      id: 555,
      relative_url: "/another-chapter/",
    },
  });
  assert.equal(isExpectedBevyChapter(event), false);
  assert.equal(isExpectedBevyChapter(event, "555"), true);
});

test("accepts only event-specific HTTPS Luma destinations", () => {
  for (const value of [
    "https://luma.com/axis-event",
    "https://lu.ma/axis-event",
  ]) {
    assert.equal(LumaUrlSchema.safeParse(value).success, true);
    assert.equal(isLumaEventUrl(value), true);
  }

  for (const value of [
    "http://luma.com/axis-event",
    "https://luma.com/",
    "https://evil.example/axis-event",
  ]) {
    assert.equal(LumaUrlSchema.safeParse(value).success, false);
    assert.equal(isLumaEventUrl(value), false);
  }

  assert.deepEqual(
    getEventRegistrationLink({
      luma_url: "https://luma.com/axis-event",
      source_url: "https://gdg.community.dev/events/details/axis-event/",
    }),
    { href: "https://luma.com/axis-event", label: "Register on Luma" },
  );

  assert.deepEqual(
    getEventRegistrationLink({
      luma_url: "https://luma.com/axis-event",
      source_url: "https://gdg.community.dev/events/details/axis-event/",
      status: "CANCELLED",
    }),
    {
      href: "https://gdg.community.dev/events/details/axis-event/",
      label: "View on GDG Community",
    },
  );
});

test("keeps Bevy writes service-only and leaves RSVP out of the integration", async () => {
  const [migration, route] = await Promise.all([
    readFile(migrationUrl, "utf8"),
    readFile(routeUrl, "utf8"),
  ]);

  assert.match(
    migration,
    /REVOKE INSERT, UPDATE, DELETE ON TABLE public\.events/,
  );
  assert.match(migration, /TO service_role;/);
  assert.match(
    migration,
    /EXCLUDED\.source_updated_at >= events\.source_updated_at/,
  );
  assert.match(migration, /private\.require_active_admin\(\)/);
  assert.doesNotMatch(migration, /INSERT INTO public\.event_attendance/);

  assert.match(route, /BEVY_WEBHOOK_SECRET/);
  assert.match(route, /timingSafeEqual/);
  assert.match(route, /isExpectedBevyChapter/);
  assert.doesNotMatch(route, /playwright|beautifulsoup|scrap/i);
});
