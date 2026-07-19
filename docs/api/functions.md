# Supabase Postgres Functions (RPC)

In addition to Next.js Server Actions, we occasionally push complex logic directly into the PostgreSQL database using Functions (often referred to as RPC - Remote Procedure Calls).

## Why use Postgres Functions?

1. **Atomicity & Transactions:** If a process involves deducting points, generating a record, and updating a status simultaneously, a Postgres Function ensures all steps succeed or fail together as a single transaction.
2. **Performance:** Running complex calculations (like summing a massive ledger) on the database is faster than pulling all records to the Next.js server to sum them in JavaScript.
3. **Database-Level Integrity:** Functions can be tied to triggers. For instance, creating a `member_profile` row automatically when an `auth.user` is created.

## How to Call Functions

From your Next.js server components or actions, you use the `.rpc()` method provided by Supabase:

```typescript
const supabase = await createClient();
const { data, error } = await supabase.rpc("calculate_member_points", {
  member_uuid: "1234-abcd",
});
```

## Important Functions

- `set_updated_at()`: A trigger function attached to nearly all tables that automatically updates the `updated_at` column whenever a row is modified.

Axis deliberately does not auto-create public member records. Administrators preload
`public.members`, and account activation links the Auth user through `members.auth_id`.
