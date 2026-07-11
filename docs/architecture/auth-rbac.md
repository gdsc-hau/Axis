# Auth and RBAC

Authentication and authorization are shared concerns across the app.

## Current implementation clues

- `packages/auth/src/index.ts` exports session, roles, and guards helpers
- `packages/auth/src/roles.ts` resolves a user's role from the `members` table
- `packages/auth/src/guards.ts` is currently empty, so guard behavior still needs to be documented or implemented
- `packages/auth/src/roles.ts` also checks profile completeness through `member_profiles`

## What to document here

- Session lifecycle and Supabase auth flow
- Role model and permissions matrix
- Protected route groups and admin access rules
- Profile-completeness checks and onboarding gates

## Current route protection

`apps/gdg-hub/middleware.ts` currently protects `/member` and `/admin`, redirects unauthenticated users to `/login`, and sends authenticated users away from the auth pages unless they are on `/verify`.

That means the final RBAC story is split between middleware and role-aware layouts or pages.
