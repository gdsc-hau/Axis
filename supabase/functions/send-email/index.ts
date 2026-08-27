type OutboxItem = {
  id: string;
  recipient_email: string;
  subject: string;
  text_body: string;
};

const jsonHeaders = { "Content-Type": "application/json" };

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function required(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing required secret: ${name}`);
  return value;
}

export function getSupabaseSecretKey() {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (legacy) return legacy;

  const encoded = Deno.env.get("SUPABASE_SECRET_KEYS")?.trim();
  if (!encoded) throw new Error("Missing Supabase secret key");
  const parsed: unknown = JSON.parse(encoded);
  const candidates: string[] = [];
  const visit = (value: unknown) => {
    if (typeof value === "string") candidates.push(value);
    else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object")
      Object.values(value).forEach(visit);
  };
  visit(parsed);
  const secret = candidates.find((value) => value.startsWith("sb_secret_"));
  if (!secret) throw new Error("SUPABASE_SECRET_KEYS contains no secret key");
  return secret;
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function rpc<T>(
  supabaseUrl: string,
  secretKey: string,
  functionName: string,
  body: Record<string, unknown>,
) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${functionName}`, {
    method: "POST",
    headers: {
      ...jsonHeaders,
      apikey: secretKey,
      Authorization: `Bearer ${secretKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`${functionName} failed (${response.status}): ${detail}`);
  }
  return (await response.json()) as T;
}

async function sendWithResend(item: OutboxItem) {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      ...jsonHeaders,
      Authorization: `Bearer ${required("RESEND_API_KEY")}`,
    },
    body: JSON.stringify({
      from: required("AXIS_EMAIL_FROM"),
      to: [item.recipient_email],
      subject: item.subject,
      text: item.text_body,
      html: `<p>${escapeHtml(item.text_body).replaceAll("\n", "<br>")}</p>`,
    }),
  });
  const payload = (await response.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
  };
  if (!response.ok || !payload.id) {
    const error = new Error(
      payload.message ?? `Resend returned ${response.status}`,
    );
    Object.assign(error, {
      retryable: response.status === 429 || response.status >= 500,
    });
    throw error;
  }
  return payload.id;
}

Deno.serve(async (request) => {
  if (request.method !== "POST")
    return json(405, { error: "Method not allowed." });
  if (Deno.env.get("AXIS_EMAIL_DELIVERY_ENABLED") !== "true") {
    return json(503, { error: "Email delivery is disabled by environment." });
  }
  const workerSecret = required("AXIS_EMAIL_WORKER_SECRET");
  if (request.headers.get("x-axis-worker-secret") !== workerSecret) {
    return json(401, { error: "Unauthorized." });
  }

  try {
    const supabaseUrl = required("SUPABASE_URL").replace(/\/$/, "");
    const secretKey = getSupabaseSecretKey();
    const items = await rpc<OutboxItem[]>(
      supabaseUrl,
      secretKey,
      "claim_notification_email_batch",
      { p_limit: 10 },
    );
    let sent = 0;
    let failed = 0;

    for (const item of items) {
      try {
        const providerMessageId = await sendWithResend(item);
        await rpc(supabaseUrl, secretKey, "complete_notification_email", {
          p_outbox_id: item.id,
          p_provider_message_id: providerMessageId,
        });
        sent += 1;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown provider error";
        const retryable = Boolean(
          error && typeof error === "object" && "retryable" in error
            ? error.retryable
            : true,
        );
        await rpc(supabaseUrl, secretKey, "fail_notification_email", {
          p_outbox_id: item.id,
          p_error: message.slice(0, 1000),
          p_retryable: retryable,
        });
        failed += 1;
      }
    }

    return json(200, { claimed: items.length, sent, failed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Worker failed";
    return json(500, { error: message });
  }
});
