# API Routes

While Next.js App Router minimizes the need for traditional API routes, we still use Route Handlers (`app/api/.../route.ts`) for specific scenarios where Server Actions are not applicable.

## When to use API Routes

You should only create an API Route handler if you are building:

1. **Webhooks:** Receiving data from third-party services (e.g., Stripe, Luma) that need to POST to a public URL.
2. **Third-Party Integrations:** Providing a JSON API for external sponsors or organizations to verify member credentials programmatically.
3. **File Streaming/Generation:** Generating PDFs dynamically or streaming large payloads that are better handled via standard HTTP responses rather than Server Actions.

## Security in API Routes

Because API Routes do not have a built-in React UI context, you must manually verify the user's session if the route is protected.

```typescript
import { createClient } from "@hau/db/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Handle logic...
  return NextResponse.json({ success: true });
}
```

## Existing Routes

- `gdg-id POST /api/search`: Rate-limited approved-member lookup.
- `gdg-id POST /api/verify`: Validates a signed, unexpired QR credential and returns the approved public profile.
- `gdg-hub GET /auth/callback`: Exchanges a Supabase invite, confirmation, or password-recovery code for a session.
- `gdg-hub /confirm-invite`: Verifies a scanner-resistant email plus 6-digit invitation OTP.
- `gdg-hub /activate`: Sets the initial password and links an invited Auth identity to its active member row.
- `gdg-hub /forgot-password`: Requests a non-enumerating Supabase password recovery email.
- `gdg-hub /reset-password`: Validates the temporary recovery session and updates the password for an approved member.
- `gdg-hub POST /api/integrations/bevy/events`: Secret-authenticated Bevy event webhook. It accepts documented event batches, filters to the HAU chapter, and invokes the service-only event sync RPC. It returns `503` until `BEVY_WEBHOOK_SECRET` is configured.
- `gdg-hub GET /api/certificates/[certificateId]/download`: Streams an administrator-authorized generated certificate PDF.

There are no placeholder feature APIs in the current route tree. Luma is an
external registration destination and CSV attendance source, not an Axis API.
Leaderboard rankings are derived directly from the append-only ledger and do
not require a rebuild endpoint.
