# Applications Deep Dive

The workspace currently houses two Next.js applications within the `apps/` directory. Applications own routes, page composition, product copy, and app-specific components. Shared contracts, data access, authorization, business rules, and reusable UI live in `packages/`.

## gdg-hub

The `gdg-hub` application contains the public community site plus authenticated member and administrator workspaces.

**Implemented today:**

- Invite-only email/password onboarding through Supabase Auth.
- Password recovery and account activation flows.
- Public content routes for organization information, events, articles, products, merchandise, FAQs, and contact details.
- Member dashboard routes for profile, events, wallet, rewards, leaderboard, notifications, and settings.
- An administrator dashboard, member directory, approvals, role changes, invitations, and feature management scaffolds.
- Server Components for database reads and Server Actions for protected mutations.

Certificates, reports, and content-management routes remain scaffolds and should not be documented as complete until their acceptance criteria are implemented and tested. Event discovery/Luma routing, the Gyrocoin ledger/wallet, and the member-only reward marketplace are implemented. RSVP, attendance, automatic event awards, notifications, and public merchandise remain deferred.

**Key Routes:**

- `/`: Public community landing page.
- `/events`: Public event listing.
- `/member/dashboard`: Authenticated member workspace.
- `/admin/dashboard`: Protected administrator workspace.
- `/admin/members`: Directory of all registered members.
- `/admin/invite`: Invite approved registry members to activate an account.
- `/member/rewards`: Active reward catalog and member redemption history.
- `/admin/products`: Reward catalog and available-inventory management.
- `/admin/rewards`: Redemption review and fulfillment queue.

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

## Shared UI integration

Both applications consume `@hau/axis-ui` as a `workspace:*` dependency. Each Next.js configuration includes the package in `transpilePackages`, each Tailwind configuration scans `packages/axis-ui/src`, and each root layout imports `@hau/axis-ui/styles.css` once.

Pages and app components import only the package's public API:

```tsx
import { Alert, Button, Card, Container } from "@hau/axis-ui";
```

Application-specific compositions stay in their owning app. They move into `@hau/axis-ui` only after the visual API is stable and reuse is demonstrated or planned.
