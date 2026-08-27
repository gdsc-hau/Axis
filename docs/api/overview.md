# API & Data Flow Overview

Because we use Next.js App Router and Supabase, our "API" looks quite different from a traditional Express/Node backend.

We do not write many traditional REST API routes (e.g., `/api/users`). Instead, we leverage **React Server Components (RSC)** and **Server Actions**.

## How Data is Read (Server Components)

To fetch data to display on the screen, we query the database _directly_ from the server component.

```tsx
import { createClient } from "@hau/db/server";

export default async function MembersPage() {
  const supabase = await createClient();
  const { data: members } = await supabase.from("members").select("*");

  return <MembersTable data={members} />;
}
```

_Why this is good:_ It removes the need for a separate `fetch('/api/members')` call from the client, eliminating network waterfalls and ensuring the UI loads with data instantly.

## How Data is Mutated (Server Actions)

To handle form submissions, clicks, or data updates, we use Server Actions. These are asynchronous functions executed on the server but called from client components.

```tsx
"use server";

import { revalidatePath } from "next/cache";
import { getActiveAdmin } from "@hau/auth";
import { AdminGyrocoinAdjustmentSchema } from "@hau/contracts";
import { adjustMemberGyrocoins } from "@hau/db";
import { toSignedGyrocoinAmount } from "@hau/points";

export async function adjustGyrocoinsAction(input: unknown) {
  const request = AdminGyrocoinAdjustmentSchema.parse(input);
  if (!(await getActiveAdmin())) throw new Error("Admin access required");

  await adjustMemberGyrocoins({
    memberId: request.memberId,
    signedPoints: toSignedGyrocoinAmount(
      request.adjustmentKind,
      request.amount,
    ),
    reason: request.reason,
    operationKey: request.operationKey,
  });

  revalidatePath("/admin/gyrocoins");
  revalidatePath("/member/wallet");
}
```

Financial tables such as `points_ledger` must never be inserted into directly
from a Server Action. Their RPCs own locking, balance calculation,
idempotency, authorization, and audit logging as one transaction.

These patterns ensure strong type safety (because the server action and the UI share the same TypeScript scope) and faster development velocity.
