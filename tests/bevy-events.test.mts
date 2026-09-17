import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  BevyEventSchema,
  BevyWebhookPayloadSchema,
  GdgCommunityEventUrlSchema,
  LumaUrlSchema,
} from "../packages/contracts/src/index.ts";
import {
  getBevyEventStatus,
  isExpectedBevyChapter,
  mapBevyEvent,
  serializeBevyEventForHash,
} from "../packages/events/src/sync.ts";
import {
  discoverGdgCommunityEvents,
  parseGdgCommunityEventPage,
  serializeGdgCommunityEventForHash,
} from "../packages/events/src/public-sync.ts";
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
const publicSyncFixtureUrl = new URL(
  "./fixtures/gdg-community-event.html",
  import.meta.url,
);
const scheduledSyncRouteUrl = new URL(
  "../apps/gdg-hub/app/api/integrations/gdg-community/events/route.ts",
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

test("parses a public GDG Community event without organizer credentials", async () => {
  const html = await readFile(publicSyncFixtureUrl, "utf8");
  const eventUrl =
    "https://gdg.community.dev/events/details/google-gdg-on-campus-holy-angel-university-angeles-philippines-presents-axis-public-sync-test/";
  const event = parseGdgCommunityEventPage(
    html,
    eventUrl,
    new Date("2026-09-17T00:00:00Z"),
  );

  assert.deepEqual(event, {
    sourceEventId: "128563",
    sourceChapterId: "2910",
    title: "Axis Public Sync Test",
    description: "Full & validated event description.",
    location: "Online",
    eventType: "Career Development · Tech Talk / Meetup",
    startAt: "2026-10-01T18:00:00+08:00",
    endAt: "2026-10-01T20:00:00+08:00",
    sourceUrl: eventUrl,
    imageUrl: "https://example.com/axis-event.jpg",
    sourceStatus: "Published",
    sourceUpdatedAt: "2026-09-17T00:00:00.000Z",
  });
  assert.equal(
    serializeGdgCommunityEventForHash(event).includes("sourceUpdatedAt"),
    false,
  );
});

test("accepts HTML entities in GDG Community structured event titles", async () => {
  const html = (await readFile(publicSyncFixtureUrl, "utf8"))
    .replace(
      '"name": "Axis Public Sync Test"',
      '"name": "Axis Public &amp; Sync Test"',
    )
    .replace(
      '"title": "Axis Public Sync Test"',
      '"title": "Axis Public & Sync Test"',
    );
  const eventUrl =
    "https://gdg.community.dev/events/details/google-gdg-on-campus-holy-angel-university-angeles-philippines-presents-axis-public-sync-test/";

  assert.equal(
    parseGdgCommunityEventPage(html, eventUrl).title,
    "Axis Public & Sync Test",
  );
});

test("accepts only canonical GDG Community event links", () => {
  const valid =
    "https://gdg.community.dev/events/details/google-gdg-on-campus-holy-angel-university-angeles-philippines-presents-axis-test/";
  assert.equal(GdgCommunityEventUrlSchema.safeParse(valid).success, true);
  assert.equal(
    GdgCommunityEventUrlSchema.safeParse(
      "https://gdg.community.dev.evil.example/events/details/test/",
    ).success,
    false,
  );
});

test("follows GDG Community upcoming and past event pagination", async () => {
  const eventUrl = (suffix: string) =>
    `https://gdg.community.dev/events/details/${suffix}/`;
  const requestedPages: string[] = [];
  const fetchImpl = (async (input: string | URL | Request) => {
    const url = new URL(
      typeof input === "string" || input instanceof URL ? input : input.url,
    );
    requestedPages.push(
      `${url.searchParams.get("status")}:${url.searchParams.get("page")}`,
    );
    const status = url.searchParams.get("status");
    const page = Number(url.searchParams.get("page"));
    const results =
      status === "Live"
        ? [{ chapter_id: 2910, url: eventUrl("upcoming-event") }]
        : page === 1
          ? [
              { chapter_id: "2910", url: eventUrl("newest-past-event") },
              { chapter_id: "9999", url: eventUrl("another-chapter") },
            ]
          : [{ chapter_id: 2910, url: eventUrl("older-past-event") }];

    return new Response(
      JSON.stringify({
        pagination: {
          previous_page: page > 1 ? page - 1 : null,
          current_page: page,
          next_page: status === "Completed" && page === 1 ? 2 : null,
          page_size: 20,
        },
        results,
      }),
      { headers: { "content-type": "application/json" } },
    );
  }) as typeof fetch;

  assert.deepEqual(await discoverGdgCommunityEvents({ fetchImpl }), [
    eventUrl("upcoming-event"),
    eventUrl("newest-past-event"),
    eventUrl("older-past-event"),
  ]);
  assert.deepEqual(requestedPages.sort(), [
    "Completed:1",
    "Completed:2",
    "Live:1",
  ]);
});

test("protects scheduled public synchronization with a server secret", async () => {
  const route = await readFile(scheduledSyncRouteUrl, "utf8");
  assert.match(route, /GDG_EVENT_SYNC_SECRET/);
  assert.match(route, /timingSafeEqual/);
  assert.match(route, /Bearer /);
  assert.doesNotMatch(route, /cookie|attendee|organizer/i);
});
