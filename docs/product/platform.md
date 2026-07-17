# Platform Breakdown

The GDG HAU Axis ecosystem consists of two primary user-facing applications, each serving a distinct purpose and audience.

## 1. GDG Hub (`apps/gdg-hub`)

The **GDG Hub** is the internal operational portal for the community. It serves as the administrative backend where organizers manage the community and active members track their involvement.

**Key Features:**
- **Member Directory:** A searchable database of all registered GDG members.
- **Event Management:** Create, publish, and manage RSVPs for workshops, hackathons, and study jams.
- **Attendance Tracking:** Check-in functionality for events to ensure accurate participation records.
- **Points Ledger:** A system to award and track points for members based on their activity and engagement.
- **Marketplace Management:** Define redeemable swag items and approve point redemptions.

**Primary Audience:**
- GDG Officers and Core Team Members (ADMIN role)
- Highly active members checking their points, RSVPing to exclusive events, or redeeming swag.

## 2. GDG ID (`apps/gdg-id`)

The **GDG ID** application is the public-facing identity portal. It is designed to be mobile-first and serves as the digital portfolio for every member.

**Key Features:**
- **Digital ID Card:** A scannable, visually appealing GDG membership card containing a unique QR code.
- **Public Profile:** A shareable page showcasing the member's bio, skills, and links (GitHub, LinkedIn).
- **Certificates & Badges Wallet:** A public showcase of earned certificates from events and badges awarded for specific achievements or roles.
- **Verification Portal:** Allows third parties (like sponsors or other organizations) to scan the QR code and verify the member's standing and credentials.

**Primary Audience:**
- General Members accessing their digital ID for events.
- External viewers (recruiters, sponsors, other students) verifying a student's involvement or checking their portfolio.

## Why Two Apps?

Separating the Hub and the ID portal allows us to:
1. **Optimize for Audience:** The Hub is a data-heavy dashboard optimized for desktop, while the ID portal is a lightweight, mobile-first web app.
2. **Security:** The public ID portal has minimal access to sensitive administrative data.
3. **Deployment:** We can scale and deploy them independently. During a large event where hundreds of students load their ID cards simultaneously, `gdg-id` can scale without impacting the performance of `gdg-hub` for organizers checking people in.
