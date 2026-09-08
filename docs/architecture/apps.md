# Applications

Axis contains two Next.js applications. Applications own routes, page composition, product copy, route-specific components, and Server Actions. Shared contracts, database access, reusable UI, and stable domain rules live in `packages/`.

## GDG Hub

`apps/gdg-hub` is the community, member, and administrator platform. It runs locally on port 3001.

### Public experience

- Published event mirror sourced from GDG Community/Bevy data.
- External Luma registration redirects managed by administrators.
- Published article listings, categories, detail pages, and administrative previews.
- Public certificate verification by certificate number.
- Authentication, activation, recovery, and reset flows.

### Member experience

- Versioned editable profile fields while registry identity remains locked.
- Dashboard aggregates for Gyrocoins, events, rewards, credentials, and notifications.
- Event discovery and attendance history.
- Immutable Gyrocoin wallet history and privacy-safe leaderboard.
- Reward catalog, redemption, cancellation/refund, and status tracking.
- Badge and private certificate access.
- In-app notifications, read/dismiss lifecycle, and opt-in email preferences.
- Account settings and support-channel information.

### Administrator experience

- Member registry search, roles, lifecycle status, activation, and invitations.
- Event mirror review, Luma-link management, Luma CSV attendance imports, manual attendance correction, and confirmation.
- Audited Gyrocoin adjustments with non-negative running balances.
- Reward catalog inventory, redemption review, approval, cancellation, and fulfillment.
- Badge definitions, individual/batch awards, revocation, certificate batches, and private storage workflows.
- Announcement campaigns and the gated email outbox.
- Versioned article authoring, previews, revisions, scheduling, publication, and archive history.
- Operational reports, CSV export, portal settings, and immutable system-readiness checks.

The visual design is intentionally replaceable while UI/UX finalizes the production system. The current screens expose the complete backend states and serve as functional acceptance interfaces.

### Important routes

| Route                   | Purpose                                 |
| ----------------------- | --------------------------------------- |
| `/login`                | Account login                           |
| `/events`               | Public event listing                    |
| `/articles`             | Public published content                |
| `/member/dashboard`     | Authenticated member overview           |
| `/member/events`        | Member event and attendance view        |
| `/member/wallet`        | Gyrocoin balance and immutable ledger   |
| `/member/rewards`       | Reward catalog and redemption history   |
| `/member/credentials`   | Badges and certificates                 |
| `/member/notifications` | In-app inbox and preferences            |
| `/admin/dashboard`      | Administrator overview                  |
| `/admin/members`        | Registry and lifecycle operations       |
| `/admin/events`         | Event and attendance operations         |
| `/admin/gyrocoins`      | Wallet accounts and audited adjustments |
| `/admin/products`       | Reward catalog and inventory            |
| `/admin/rewards`        | Redemption queue and fulfillment        |
| `/admin/credentials`    | Badge and certificate operations        |
| `/admin/articles`       | Content management                      |
| `/admin/communications` | Campaigns and delivery gate             |
| `/admin/reports`        | Operational analytics and CSV export    |
| `/admin/settings`       | Versioned portal settings               |
| `/admin/system`         | Release-readiness health runs           |

## GDG ID

`apps/gdg-id` is the digital membership identity application. It runs locally on port 3000.

Implemented behavior includes:

- Rate-limited member lookup using registry data.
- A visual GDG member card.
- A time-limited HMAC-signed QR verification URL.
- Client-side PNG and PDF card export.
- Organization About and Contact content.

GDG ID and GDG Hub use the same `public.members` registry. Neither application should invent an alternate identity source.

## Shared UI integration

Both applications consume `@hau/axis-ui` as a `workspace:*` dependency. Their Next.js configurations transpile the package, their Tailwind configurations scan its source, and each root layout imports its shared stylesheet once.

```tsx
import { Alert, Button, Card, Container } from "@hau/axis-ui";
```

Application-specific compositions stay in the owning app. A component moves to `@hau/axis-ui` after its visual API is stable and reuse is demonstrated or planned.

The GDG Hub member and administrator route groups use the shared
`ApplicationShell` and `ResponsiveSidebar` components. Their layouts still own
all authentication and role redirects, while their sidebar components own route
labels, active-link behavior, and sign-out actions. The public route group uses
an application-owned responsive header and footer. This keeps navigation easy to
change without moving product routes or authorization into the UI package.

## Request and mutation boundaries

- Server Components perform protected reads through `@hau/db`.
- Server Actions handle authenticated user-initiated mutations.
- Route handlers exist only for genuine HTTP boundaries such as webhook ingestion, downloads, or external verification.
- Shared Zod contracts validate input before it reaches domain or database code.
- Middleware refreshes sessions and enforces route access before protected page rendering.
