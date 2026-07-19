# Authentication & RBAC

Authentication on the GDG HAU Axis platform is fully handled by **Supabase Auth**. This provides secure, scalable session management out-of-the-box.

## Supabase Auth vs. Public Data

Supabase maintains an internal table called `auth.users` which safely stores encrypted passwords, OAuth provider links, and session metadata.

We *never* query `auth.users` directly in our application code. Instead, we use a custom public table called `public.members`.

### The `auth_id` Bridge

Unlike a typical Supabase project where `auth.users.id` and `public.members.id` share the same UUID via a trigger, Axis uses a **pre-populated members table** as the source of truth. Members are added by admins *before* they have a Supabase auth account.

The link between an auth session and a member record is stored in the `auth_id` column on `public.members`:

```sql
-- Added via migration 0001_add_auth_id.sql
ALTER TABLE public.members 
ADD COLUMN auth_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;
```

When an admin sends an invitation:
1. `auth.admin.generateLink({ type: 'invite', email })` creates an `auth.users` row and returns a signed link.
2. When the member clicks the link and sets their password at `/activate`, the `activateAccount` server action calls `public.members.update({ auth_id: user.id })` to establish the link.
3. All subsequent lookups use `.eq('auth_id', userId)` instead of `.eq('id', userId)`.

This means `public.members` is **never auto-populated by a trigger** — it is always managed by administrators. The `auth_id` column is `NULL` until the member activates their account.

> **Important:** Public self-registration via `/signup` is disabled. The `/signup` page is now an informational dead-end. All accounts must be invited by an `ADMIN`.


## Role-Based Access Control (RBAC)

As outlined in the [Roles documentation](../product/roles.md), we utilize two roles: `MEMBER` and `ADMIN`.

We implement RBAC firmly at the database level using Supabase Row Level Security (RLS).

### Row Level Security (RLS) Example

Because Next.js Server Components and Server Actions pass the user's JWT to Supabase securely, Supabase knows exactly *who* is making the request.

For example, the policy on the `events` table might look like this:
- **SELECT (Read):** `true` (Anyone can view events)
- **INSERT/UPDATE/DELETE:** `(SELECT role FROM public.members WHERE id = auth.uid()) = 'ADMIN'`

This guarantees that even if a malicious user discovers the API endpoint to delete an event, the database will reject the request because their role is not `ADMIN`.

## `@hau/auth` Package

To make authentication seamless in Next.js, we encapsulate `@supabase/ssr` logic inside the `@hau/auth` package.

It exports utilities such as:
- `createClient()`: Retrieves a configured Supabase client depending on whether it's running on the client, server component, or server action.
- `getUser()`: Parses the cookies, verifies the JWT, and returns the user object.
- `requireAuth()`: A helper function that throws an error or redirects if a user is not logged in.
- `requireAdmin()`: A helper function that throws an error if the logged-in user is not an `ADMIN`.
