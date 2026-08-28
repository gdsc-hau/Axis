const LUMA_HOSTS = new Set(["luma.com", "www.luma.com", "lu.ma", "www.lu.ma"]);

export function isLumaEventUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      LUMA_HOSTS.has(url.hostname.toLowerCase()) &&
      url.pathname !== "/"
    );
  } catch {
    return false;
  }
}

export function getEventRegistrationLink(event: {
  luma_url: string | null;
  source_url: string | null;
  status?: string;
  end_at?: string | null;
}) {
  const isConcluded = event.end_at
    ? new Date(event.end_at).getTime() < Date.now()
    : false;

  if (event.status === "CANCELLED" || isConcluded) {
    return event.source_url
      ? { href: event.source_url, label: "View on GDG Community" }
      : null;
  }

  if (event.luma_url && isLumaEventUrl(event.luma_url)) {
    return { href: event.luma_url, label: "Register on Luma" };
  }

  if (event.source_url) {
    return { href: event.source_url, label: "View on GDG Community" };
  }

  return null;
}
