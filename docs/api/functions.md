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
- `set_member_status(member_id, status, reason)`: Active-admin-only lifecycle transition with an audit entry and last-admin protection.
- `set_member_role(member_id, role)`: Active-admin-only role transition with an audit entry and last-admin protection.
- `record_member_invitation(member_id)`: For an active, unlinked member, records `invited_at` and either a first-invite or resend audit event after Supabase accepts an invitation.
- `link_current_member_account()`: Links the Auth user to the matching active member after verifying the server-managed Auth email.
- `complete_current_member_profile(registry_full_name, bio, links)`: Verifies the server-supplied name against the authoritative `members.full_name`, updates only member-editable profile fields, and records `profile_completed_at`. The name argument remains solely for compatibility and is never written by this RPC.

The public RPC names above are `SECURITY INVOKER` wrappers. Privileged implementations live in the non-exposed `private` schema, explicitly validate the authenticated caller, and have `PUBLIC` execution revoked.

Axis deliberately does not auto-create public member records. Administrators preload
`public.members`, and account activation links the Auth user through `members.auth_id`.

`hook_restrict_member_account_creation(event)` is an Auth hook rather than a Data API RPC. Only Supabase's internal `supabase_auth_admin` role may execute it. It rejects new Auth users unless the event email matches an active, unlinked member row.
