# Authentication & RBAC

Authentication on the GDG HAU Axis platform is fully handled by **Supabase Auth**. This provides secure, scalable session management out-of-the-box.

## Supabase Auth vs. Public Data

Supabase maintains an internal table called `auth.users` which safely stores encrypted passwords, OAuth provider links, and session metadata.

We *never* query `auth.users` directly in our application code. Instead, we use a custom public table called `public.members`.

### The `members` Table Bridge
When a new user successfully signs up via Supabase Auth, a PostgreSQL trigger fires automatically:

```sql
-- Automatically runs when a row is inserted into auth.users
CREATE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.members (id, email, role)
  VALUES (new.id, new.email, 'MEMBER');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

This ensures that every `auth.user` has exactly one corresponding `public.member` record sharing the identical UUID. Our application logic queries `public.members` to read profiles, assign roles, and calculate points.

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
