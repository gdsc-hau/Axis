# API Overview

The platform exposes route handlers for auth callbacks, leaderboard rebuilds, certificate issuance, attendance confirmation, Luma sync, and redemption creation.

## Route families

- `auth/callback`: handles authentication return flows
- `api/leaderboard/rebuild`: refreshes leaderboard data
- `api/certificates/issue` and `api/certificates/resend`: certificate workflows
- `api/attendance/confirm`: attendance confirmation workflow
- `api/luma/sync`: imports or refreshes event data from Luma
- `api/redemptions/create`: creates redemption requests

This section should document the purpose, inputs, outputs, and permissions for each endpoint.
