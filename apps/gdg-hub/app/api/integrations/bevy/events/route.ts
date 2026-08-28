import { createHash, timingSafeEqual } from "node:crypto";
import { BevyEventSchema, BevyWebhookPayloadSchema } from "@hau/contracts";
import { syncBevyEvent } from "@hau/db";
import {
  GDG_HAU_CHAPTER_SLUG,
  isExpectedBevyChapter,
  mapBevyEvent,
  serializeBevyEventForHash,
} from "@hau/events";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 1_048_576;
const DEFAULT_SECRET_HEADER = "x-axis-bevy-secret";

function jsonResponse(body: object, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function hasValidSecret(actual: string | null, expected: string) {
  if (!actual) return false;

  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return false;

  return timingSafeEqual(actualBuffer, expectedBuffer);
}

function isGdgCommunityEventUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.hostname === "gdg.community.dev" &&
      url.pathname.startsWith("/events/details/")
    );
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const webhookSecret = process.env.BEVY_WEBHOOK_SECRET?.trim();
  const secretHeader =
    process.env.BEVY_WEBHOOK_SECRET_HEADER?.trim().toLowerCase() ||
    DEFAULT_SECRET_HEADER;

  if (!webhookSecret || webhookSecret.length < 32) {
    return jsonResponse({ error: "Bevy webhook is not configured." }, 503);
  }

  if (!/^[a-z0-9-]+$/.test(secretHeader)) {
    return jsonResponse({ error: "Bevy webhook is misconfigured." }, 503);
  }

  if (!hasValidSecret(request.headers.get(secretHeader), webhookSecret)) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return jsonResponse({ error: "Webhook payload is too large." }, 413);
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return jsonResponse({ error: "Webhook payload is too large." }, 413);
  }

  let rawPayload: unknown;
  try {
    rawPayload = JSON.parse(rawBody);
  } catch {
    return jsonResponse({ error: "Webhook payload must be valid JSON." }, 400);
  }

  const payload = BevyWebhookPayloadSchema.safeParse(rawPayload);
  if (!payload.success) {
    return jsonResponse({ error: "Webhook envelope is invalid." }, 400);
  }

  const expectedChapterId = process.env.BEVY_CHAPTER_ID?.trim();
  const expectedChapterSlug =
    process.env.BEVY_CHAPTER_SLUG?.trim() || GDG_HAU_CHAPTER_SLUG;
  let processed = 0;
  let ignoredOtherTypes = 0;
  let ignoredOtherChapters = 0;

  for (const envelope of payload.data) {
    if (envelope.type !== "event") {
      ignoredOtherTypes += envelope.data.length;
      continue;
    }

    for (const rawEvent of envelope.data) {
      const parsedEvent = BevyEventSchema.safeParse(rawEvent);
      if (!parsedEvent.success) {
        return jsonResponse({ error: "Bevy event record is invalid." }, 400);
      }

      if (
        !isExpectedBevyChapter(
          parsedEvent.data,
          expectedChapterId,
          expectedChapterSlug,
        )
      ) {
        ignoredOtherChapters += 1;
        continue;
      }

      const event = mapBevyEvent(parsedEvent.data);
      if (!isGdgCommunityEventUrl(event.sourceUrl)) {
        return jsonResponse(
          { error: "Bevy event URL is outside GDG Community." },
          400,
        );
      }

      const payloadHash = createHash("sha256")
        .update(serializeBevyEventForHash(event))
        .digest("hex");

      const { error } = await syncBevyEvent({
        p_source_event_id: event.sourceEventId,
        p_source_chapter_id: event.sourceChapterId,
        p_title: event.title,
        p_description: event.description,
        p_location: event.location,
        p_event_type: event.eventType,
        p_start_at: event.startAt,
        p_end_at: event.endAt,
        p_source_url: event.sourceUrl,
        p_image_url: event.imageUrl,
        p_source_status: event.sourceStatus,
        p_source_updated_at: event.sourceUpdatedAt,
        p_source_payload_hash: payloadHash,
      });

      if (error) {
        console.error("Bevy event sync failed", {
          sourceEventId: event.sourceEventId,
          code: error.code,
        });
        return jsonResponse({ error: "Event synchronization failed." }, 500);
      }

      processed += 1;
    }
  }

  return jsonResponse({
    processed,
    ignoredOtherTypes,
    ignoredOtherChapters,
  });
}
