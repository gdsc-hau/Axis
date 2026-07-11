# Troubleshooting

Use this page for common failures, logs to inspect, and recovery steps.

## Common issues

- Users get redirected to login unexpectedly: check middleware auth state and Supabase session cookies
- A member profile is treated as incomplete: verify `member_profiles` has both `bio` and `links`
- Admin pages are inaccessible: confirm the member role in `members.role`
- API routes return empty success responses: inspect the route handler and downstream Supabase or edge function calls

## Good places to inspect

- `apps/gdg-hub/middleware.ts`
- `packages/auth/src/roles.ts`
- `packages/db/src`
- `supabase/migrations`

