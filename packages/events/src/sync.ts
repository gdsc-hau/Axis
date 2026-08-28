import type { BevyEvent, EventStatus } from "@hau/contracts";

export const GDG_HAU_CHAPTER_SLUG =
  "gdg-on-campus-holy-angel-university-angeles-philippines";

export interface BevyEventSyncInput {
  sourceEventId: string;
  sourceChapterId: string;
  title: string;
  description: string | null;
  location: string | null;
  eventType: string | null;
  startAt: string;
  endAt: string;
  sourceUrl: string;
  imageUrl: string | null;
  sourceStatus: BevyEvent["status"];
  sourceUpdatedAt: string;
}

function optionalText(value: string | null | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function getChapterSlug(event: BevyEvent) {
  const relativeUrl = optionalText(event.chapter.relative_url);
  if (relativeUrl) {
    return relativeUrl.split("/").filter(Boolean).at(-1)?.toLowerCase() ?? null;
  }

  if (!event.chapter.url) return null;

  try {
    return new URL(event.chapter.url).pathname
      .split("/")
      .filter(Boolean)
      .at(-1)
      ?.toLowerCase();
  } catch {
    return null;
  }
}

export function isExpectedBevyChapter(
  event: BevyEvent,
  expectedChapterId?: string,
  expectedChapterSlug = GDG_HAU_CHAPTER_SLUG,
) {
  if (expectedChapterId?.trim()) {
    return event.chapter.id === expectedChapterId.trim();
  }

  return getChapterSlug(event) === expectedChapterSlug.trim().toLowerCase();
}

export function getBevyEventStatus(status: BevyEvent["status"]): EventStatus {
  switch (status) {
    case "Draft":
      return "DRAFT";
    case "Published":
      return "PUBLISHED";
    case "Canceled":
      return "CANCELLED";
  }
}

function getLocation(event: BevyEvent) {
  const combinedAddress = optionalText(event.get_event_address);
  if (combinedAddress) return combinedAddress;

  const parts = [
    event.venue_name,
    event.venue_address,
    event.venue_city,
    event.venue_zip_code,
  ]
    .map(optionalText)
    .filter((value): value is string => Boolean(value));

  return parts.length > 0 ? Array.from(new Set(parts)).join(", ") : null;
}

export function mapBevyEvent(event: BevyEvent): BevyEventSyncInput {
  return {
    sourceEventId: event.id,
    sourceChapterId: event.chapter.id,
    title: event.title.trim(),
    description: optionalText(event.description_short),
    location: getLocation(event),
    eventType: optionalText(event.event_type_title),
    startAt: event.start_date,
    endAt: event.end_date,
    sourceUrl: event.url,
    imageUrl:
      optionalText(event.picture?.url) ??
      optionalText(event.picture?.thumbnail_url),
    sourceStatus: event.status,
    sourceUpdatedAt: event.updated_ts,
  };
}

export function serializeBevyEventForHash(event: BevyEventSyncInput) {
  return JSON.stringify({
    sourceEventId: event.sourceEventId,
    sourceChapterId: event.sourceChapterId,
    title: event.title,
    description: event.description,
    location: event.location,
    eventType: event.eventType,
    startAt: event.startAt,
    endAt: event.endAt,
    sourceUrl: event.sourceUrl,
    imageUrl: event.imageUrl,
    sourceStatus: event.sourceStatus,
    sourceUpdatedAt: event.sourceUpdatedAt,
  });
}
