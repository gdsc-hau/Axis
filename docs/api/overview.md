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
import { createClient } from "@hau/db/server";
import { revalidatePath } from "next/cache";

export async function awardPointsAction(memberId: string, points: number) {
  const supabase = await createClient();

  // 1. Validate Admin Role (handled automatically if RLS is strong, or explicitly here)

  // 2. Perform DB Mutation
  await supabase.from("points_ledger").insert({ member_id: memberId, points });

  // 3. Clear cache so the UI updates
  revalidatePath("/admin/members");
}
```

These patterns ensure strong type safety (because the server action and the UI share the same TypeScript scope) and faster development velocity.
