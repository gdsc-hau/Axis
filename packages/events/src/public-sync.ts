import {
  GdgCommunityEventUrlSchema,
  GdgCommunityEventListingSchema,
  GdgCommunityJsonLdEventSchema,
  GdgCommunityPageEventSchema,
} from "@hau/contracts";

export const GDG_HAU_PUBLIC_CHAPTER_SLUG =
  "gdg-on-campus-holy-angel-university-angeles-philippines";
export const GDG_HAU_PUBLIC_CHAPTER_ID = "2910";

export interface GdgCommunityEventSyncInput {
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
  sourceStatus: "Draft" | "Published" | "Canceled";
  sourceUpdatedAt: string;
}

export const GDG_COMMUNITY_ORIGIN = "https://gdg.community.dev";

const MAX_RESPONSE_BYTES = 2_097_152;
const FETCH_TIMEOUT_MS = 12_000;
const MAX_DISCOVERED_EVENTS = 500;
const MAX_LISTING_PAGES = 25;
const EVENT_LISTING_PAGE_SIZE = 20;

export interface GdgCommunityFetchOptions {
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

function normalizeGdgEventUrl(value: string) {
  const parsed = GdgCommunityEventUrlSchema.parse(value);
  const url = new URL(parsed);
  url.search = "";
  url.hash = "";
  if (!url.pathname.endsWith("/")) url.pathname += "/";
  return url.toString();
}

function extractScript(html: string, selector: RegExp, label: string) {
  const match = selector.exec(html);
  if (!match?.[1]) {
    throw new Error(`GDG Community ${label} was not found.`);
  }
  return match[1];
}

function parseJson(value: string, label: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new Error(`GDG Community ${label} is not valid JSON.`);
  }
}

function findJsonLdEvent(html: string) {
  const scripts = html.matchAll(
    /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const script of scripts) {
    const raw = script[1];
    if (!raw) continue;
    const parsed = parseJson(raw, "structured event data");
    const candidates = Array.isArray(parsed) ? parsed : [parsed];
    for (const candidate of candidates) {
      const event = GdgCommunityJsonLdEventSchema.safeParse(candidate);
      if (event.success) return event.data;
    }
  }
  throw new Error("GDG Community structured event data was not found.");
}

function decodeHtmlEntities(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value.replace(
    /&(#(?:x[0-9a-f]+|\d+)|[a-z]+);/gi,
    (match, entity: string) => {
      if (entity.startsWith("#x")) {
        const codePoint = Number.parseInt(entity.slice(2), 16);
        return Number.isFinite(codePoint)
          ? String.fromCodePoint(codePoint)
          : match;
      }
      if (entity.startsWith("#")) {
        const codePoint = Number.parseInt(entity.slice(1), 10);
        return Number.isFinite(codePoint)
          ? String.fromCodePoint(codePoint)
          : match;
      }
      return named[entity.toLowerCase()] ?? match;
    },
  );
}

function htmlToPlainText(value: string | null | undefined) {
  if (!value) return null;
  const withBreaks = value.replace(/<\s*br\s*\/?>|<\/\s*p\s*>/gi, "\n");
  const stripped = withBreaks.replace(/<[^>]*>/g, " ");
  const normalized = decodeHtmlEntities(stripped)
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return normalized || null;
}

function getImage(value: string | string[] | null | undefined) {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function getLocation(
  event: ReturnType<typeof GdgCommunityPageEventSchema.parse>,
  attendanceMode?: string | null,
) {
  if (
    event.is_virtual_event ||
    attendanceMode?.endsWith("OnlineEventAttendanceMode")
  ) {
    return "Online";
  }
  const parts = [
    event.venue_name,
    event.venue_address,
    event.venue_city,
    event.venue_state,
    event.venue_zip_code,
  ].filter((value): value is string => Boolean(value));
  return parts.length ? Array.from(new Set(parts)).join(", ") : null;
}

function getSourceStatus(eventStatus: string | null | undefined) {
  return eventStatus?.endsWith("EventCancelled") ? "Canceled" : "Published";
}

export function parseGdgCommunityEventPage(
  html: string,
  requestedUrl: string,
  fetchedAt = new Date(),
): GdgCommunityEventSyncInput {
  const normalizedRequestedUrl = normalizeGdgEventUrl(requestedUrl);
  const jsonLd = findJsonLdEvent(html);
  const nextDataJson = extractScript(
    html,
    /<script\b[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i,
    "page data",
  );
  const nextData = parseJson(nextDataJson, "page data") as {
    props?: { pageProps?: { eventData?: unknown } };
  };
  const event = GdgCommunityPageEventSchema.parse(
    nextData.props?.pageProps?.eventData,
  );
  const normalizedEventUrl = normalizeGdgEventUrl(event.url);

  if (normalizedEventUrl !== normalizedRequestedUrl) {
    throw new Error("GDG Community returned a different event URL.");
  }
  if (event.chapter_slug.toLowerCase() !== GDG_HAU_PUBLIC_CHAPTER_SLUG) {
    throw new Error("The event does not belong to the GDG HAU chapter.");
  }
  if (event.is_hidden) {
    throw new Error("Hidden GDG Community events cannot be imported.");
  }
  if (
    event.title !== htmlToPlainText(jsonLd.name) ||
    event.start_date_iso !== jsonLd.startDate ||
    event.end_date_iso !== jsonLd.endDate
  ) {
    throw new Error("GDG Community event metadata is inconsistent.");
  }

  const description =
    htmlToPlainText(event.description) ??
    htmlToPlainText(event.description_short) ??
    htmlToPlainText(jsonLd.description);

  return {
    sourceEventId: event.id,
    sourceChapterId: event.chapter_id,
    title: event.title,
    description,
    location: getLocation(event, jsonLd.eventAttendanceMode),
    eventType: event.tags?.length
      ? event.tags.join(" · ").slice(0, 300)
      : (event.event_type_title ?? null),
    startAt: event.start_date_iso,
    endAt: event.end_date_iso,
    sourceUrl: normalizedEventUrl,
    imageUrl: event.picture ?? getImage(jsonLd.image),
    sourceStatus: getSourceStatus(jsonLd.eventStatus),
    sourceUpdatedAt: fetchedAt.toISOString(),
  };
}

export function serializeGdgCommunityEventForHash(
  event: GdgCommunityEventSyncInput,
) {
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
  });
}

async function fetchPublicHtmlOnce(url: string, fetchImpl: typeof fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, {
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "GDG-HAU-Axis-Event-Sync/1.0",
      },
      cache: "no-store",
      redirect: "manual",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`GDG Community returned HTTP ${response.status}.`);
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("text/html")) {
      throw new Error("GDG Community returned an unexpected content type.");
    }
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_RESPONSE_BYTES) {
      throw new Error("GDG Community response exceeded the size limit.");
    }
    const html = await response.text();
    if (Buffer.byteLength(html, "utf8") > MAX_RESPONSE_BYTES) {
      throw new Error("GDG Community response exceeded the size limit.");
    }
    return html;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchPublicHtml(url: string, fetchImpl: typeof fetch) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await fetchPublicHtmlOnce(url, fetchImpl);
    } catch (error) {
      lastError = error;
      const isTransient =
        error instanceof TypeError ||
        (error instanceof Error && error.name === "AbortError");
      if (!isTransient) throw error;
    }
  }
  throw lastError;
}

async function fetchPublicJson(url: string, fetchImpl: typeof fetch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetchImpl(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "GDG-HAU-Axis-Event-Sync/1.0",
      },
      cache: "no-store",
      redirect: "manual",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`GDG Community returned HTTP ${response.status}.`);
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json")) {
      throw new Error("GDG Community returned an unexpected content type.");
    }
    const contentLength = Number(response.headers.get("content-length") ?? 0);
    if (contentLength > MAX_RESPONSE_BYTES) {
      throw new Error("GDG Community response exceeded the size limit.");
    }
    const body = await response.text();
    if (Buffer.byteLength(body, "utf8") > MAX_RESPONSE_BYTES) {
      throw new Error("GDG Community response exceeded the size limit.");
    }
    return parseJson(body, "event listing");
  } finally {
    clearTimeout(timeout);
  }
}

function getGdgCommunityListingUrl(status: "Live" | "Completed", page: number) {
  const url = new URL(
    `/api/event_slim/for_chapter/${GDG_HAU_PUBLIC_CHAPTER_ID}/`,
    GDG_COMMUNITY_ORIGIN,
  );
  url.searchParams.set("page_size", String(EVENT_LISTING_PAGE_SIZE));
  url.searchParams.set("status", status);
  url.searchParams.set("include_cohosted_events", "true");
  url.searchParams.set("visible_on_parent_chapter_only", "true");
  url.searchParams.set(
    "order",
    status === "Live" ? "start_date" : "-start_date",
  );
  url.searchParams.set("fields", "chapter_id,url");
  url.searchParams.set("page", String(page));
  return url.toString();
}

export async function discoverGdgCommunityEventListingUrls(
  status: "Live" | "Completed",
  options: GdgCommunityFetchOptions = {},
) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const urls = new Set<string>();
  let page = 1;

  for (
    let requestCount = 0;
    requestCount < MAX_LISTING_PAGES;
    requestCount += 1
  ) {
    const listing = GdgCommunityEventListingSchema.parse(
      await fetchPublicJson(getGdgCommunityListingUrl(status, page), fetchImpl),
    );
    if (listing.pagination.current_page !== page) {
      throw new Error("GDG Community returned an unexpected listing page.");
    }
    for (const event of listing.results) {
      if (event.chapter_id === GDG_HAU_PUBLIC_CHAPTER_ID) {
        urls.add(normalizeGdgEventUrl(event.url));
      }
      if (urls.size >= MAX_DISCOVERED_EVENTS) return [...urls];
    }

    const nextPage = listing.pagination.next_page;
    if (!nextPage) return [...urls];
    if (nextPage <= page) {
      throw new Error("GDG Community returned invalid listing pagination.");
    }
    page = nextPage;
  }

  throw new Error("GDG Community event listing exceeded the page limit.");
}

export async function fetchGdgCommunityEvent(
  eventUrl: string,
  options: GdgCommunityFetchOptions = {},
) {
  const normalizedUrl = normalizeGdgEventUrl(eventUrl);
  const fetchImpl = options.fetchImpl ?? fetch;
  const html = await fetchPublicHtml(normalizedUrl, fetchImpl);
  return parseGdgCommunityEventPage(
    html,
    normalizedUrl,
    (options.now ?? (() => new Date()))(),
  );
}

export async function discoverGdgCommunityEvents(
  options: GdgCommunityFetchOptions = {},
) {
  const [upcoming, past] = await Promise.all([
    discoverGdgCommunityEventListingUrls("Live", options),
    discoverGdgCommunityEventListingUrls("Completed", options),
  ]);
  return [...new Set([...upcoming, ...past])];
}
