# Applications Deep Dive

The workspace currently houses two main Next.js applications within the `apps/` directory.

## gdg-hub

The `gdg-hub` application is the central administrative dashboard for GDG officers.

**Tech Highlights:**
- Relies heavily on Server Components to render data tables of members, events, and ledgers without sending JS to the client.
- Uses `shadcn/ui` data tables with tanstack-table for complex filtering and sorting of member data.
- Employs Next.js Server Actions to securely mutate database state (e.g., awarding points, checking in a member) while validating the user's `ADMIN` role.

**Key Routes:**
- `/admin/members`: Directory of all registered members.
- `/admin/events`: Event creation and RSVP list management.
- `/admin/scanner`: A specialized route utilizing the device camera to scan QR codes for rapid event check-ins.
- `/admin/marketplace`: Management of point redemptions.

## gdg-id

The `gdg-id` application is the public-facing identity portal designed primarily for mobile usage by members.

**Tech Highlights:**
- Implements a Progressive Web App (PWA) configuration (via `@hau/pwa`) allowing students to "Install" their GDG ID to their mobile phone's home screen for offline-like access.
- Highly optimized for speed and visual aesthetics (Tailwind CSS glassmorphism, animations).
- Uses Supabase Auth heavily for social login (Google OAuth).

**Key Routes:**
- `/`: The landing page and login portal.
- `/id`: The authenticated member's digital ID card containing their unique QR code.
- `/portfolio`: The public-facing view of a member's bio, skills, badges, and certificates.
- `/verify/[memberId]`: A public route that event sponsors or third parties can use to verify that a scanned QR code belongs to a legitimate, active GDG HAU member.
