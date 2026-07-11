# Routes

Document each route handler here, grouped by domain.

- Auth
- Certificates
- Events and attendance
- Leaderboard
- Redemptions
- Luma sync

## Current handlers

- [apps/gdg-hub/app/auth/callback/route.ts](../../apps/gdg-hub/app/auth/callback/route.ts)
- [apps/gdg-hub/app/api/certificates/issue/route.ts](../../apps/gdg-hub/app/api/certificates/issue/route.ts)
- [apps/gdg-hub/app/api/certificates/resend/route.ts](../../apps/gdg-hub/app/api/certificates/resend/route.ts)
- [apps/gdg-hub/app/api/attendance/confirm/route.ts](../../apps/gdg-hub/app/api/attendance/confirm/route.ts)
- [apps/gdg-hub/app/api/luma/sync/route.ts](../../apps/gdg-hub/app/api/luma/sync/route.ts)
- [apps/gdg-hub/app/api/leaderboard/rebuild/route.ts](../../apps/gdg-hub/app/api/leaderboard/rebuild/route.ts)
- [apps/gdg-hub/app/api/redemptions/create/route.ts](../../apps/gdg-hub/app/api/redemptions/create/route.ts)

## Observed behavior

- The leaderboard rebuild route currently responds with a simple JSON status payload
- The middleware protects member and admin pages before users reach those handlers
- The auth callback route is used to complete the sign-in flow
