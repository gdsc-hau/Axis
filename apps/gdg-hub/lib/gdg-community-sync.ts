import "server-only";

import { createHash } from "node:crypto";
import {
  getBevyEventBySourceId,
  listRefreshableBevyEventUrls,
  syncBevyEvent,
} from "@hau/db";
import {
  discoverGdgCommunityEvents,
  fetchGdgCommunityEvent,
  serializeGdgCommunityEventForHash,
} from "@hau/events";

export interface GdgCommunitySyncSummary {
  discovered: number;
  inserted: number;
  updated: number;
  unchanged: number;
  failed: number;
  errors: string[];
}

function emptySummary(): GdgCommunitySyncSummary {
  return {
    discovered: 0,
    inserted: 0,
    updated: 0,
    unchanged: 0,
    failed: 0,
    errors: [],
  };
}

function safeErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message.slice(0, 300)
    : "Unexpected synchronization error.";
}

export async function syncGdgCommunityEventUrl(eventUrl: string) {
  const event = await fetchGdgCommunityEvent(eventUrl);
  const payloadHash = createHash("sha256")
    .update(serializeGdgCommunityEventForHash(event))
    .digest("hex");
  const existing = await getBevyEventBySourceId(event.sourceEventId);
  if (existing.error) {
    throw new Error("Existing event state could not be checked.");
  }

  const result = await syncBevyEvent({
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
  if (result.error) {
    throw new Error("The validated event could not be saved.");
  }

  return existing.data
    ? existing.data.source_payload_hash === payloadHash
      ? "unchanged"
      : "updated"
    : "inserted";
}

export async function syncGdgCommunityChapter() {
  const summary = emptySummary();
  const [discoveredUrls, knownEvents] = await Promise.all([
    discoverGdgCommunityEvents(),
    listRefreshableBevyEventUrls(),
  ]);
  if (knownEvents.error) {
    throw new Error("Known GDG events could not be loaded for refresh.");
  }

  const urls = new Set(discoveredUrls);
  for (const event of knownEvents.data ?? []) {
    if (event.source_url) urls.add(event.source_url);
  }
  summary.discovered = urls.size;

  const pendingUrls = [...urls];
  const workerCount = Math.min(4, pendingUrls.length);
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      for (;;) {
        const eventUrl = pendingUrls.shift();
        if (!eventUrl) return;
        try {
          const outcome = await syncGdgCommunityEventUrl(eventUrl);
          summary[outcome] += 1;
        } catch (error) {
          summary.failed += 1;
          if (summary.errors.length < 5) {
            summary.errors.push(safeErrorMessage(error));
          }
        }
      }
    }),
  );

  return summary;
}
