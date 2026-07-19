# Applications Deep Dive

The workspace currently houses two main Next.js applications within the `apps/` directory.

## gdg-hub

The `gdg-hub` application is the central administrative dashboard for GDG officers.

**Implemented today:**
- Invite-only email/password onboarding through Supabase Auth.
- An administrator dashboard, member directory, approvals, role changes, and invitations.
- Server Components for database reads and Server Actions for protected mutations.

Events, points, rewards, certificates, reports, and most member-facing pages are currently route and package scaffolds.

**Key Routes:**
- `/admin/members`: Directory of all registered members.
- `/admin/invite`: Invite approved registry members to activate an account.

## gdg-id

The `gdg-id` application is the public-facing identity portal designed primarily for mobile usage by members.

**Implemented today:**
- A public, rate-limited member lookup by email or scanned student barcode.
- A visual GDG card whose QR contains a time-limited, HMAC-signed verification URL. The signed payload contains the member email but cannot be forged without the server secret.
- Client-side PNG/PDF card export and static About/Contact content.

**Key Routes:**
- `/`: Member lookup and card display.
- `/about`: Organization information.
- `/contact`: Contact information.

Dedicated ID, portfolio, verification, and PWA flows are planned but not implemented.
