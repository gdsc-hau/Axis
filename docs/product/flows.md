# Core User Flows

This document outlines the major user journeys supported by the GDG HAU Axis platform. Understanding these flows is crucial for modifying the frontend UI or backend business logic.

## 1. Member Onboarding — Invite-Only Flow

> **Note:** Public self-registration is disabled. All accounts are created via admin invitation.

1. **Admin Invites:** An `ADMIN` visits `/admin/invite` in `gdg-hub` and enters one or more member email addresses. Each email is validated against the `public.members` table — the member must exist, be approved (`is_accepted = true`), and not already have an active account.
2. **Invitation Email:** Supabase generates a cryptographically signed, time-limited invite link and sends it to the member's email via the `auth.admin.generateLink` API. The link redirects through `/auth/callback?next=/activate`.
3. **Account Activation:** The member clicks the invite link. Supabase exchanges the code for a session at `/auth/callback`, which redirects them to `/activate`. On this page the member sets and confirms their password, which is saved via `supabase.auth.updateUser({ password })`. Their `auth_id` is linked to the `public.members` row at this point.
4. **Profile Completion:** The member is redirected to `/verify`, where they enter their full name, bio, and optional social links (LinkedIn, GitHub). These are saved directly to `public.members`.
5. **Member Access:** The member is redirected to `/member/dashboard` and has full access to the member portal.

## 2. Event Registration & Check-In

1. **Event Creation (Admin):** An `ADMIN` creates an event in `gdg-hub`, setting the title, date, and optionally a Luma URL for external registration.
2. **Registration:** A `MEMBER` RSVPs for the event. A record is created in `event_attendance` with status `REGISTERED`.
3. **Check-In (At Event):** 
   - The member presents their digital GDG ID (QR Code) via `gdg-id`.
   - An `ADMIN` uses a scanner (or the `gdg-hub` interface) to scan the QR code.
   - The system verifies the QR code, marks the attendance record as `CHECKED_IN`, and logs the `verified_by` ID.
4. **Points Awarded:** The system automatically triggers a points ledger entry, awarding the member points for attendance.

## 3. Point Redemption (Marketplace)

1. **Earning Points:** Members accumulate points via event attendance, hackathon wins, or manual admin awards.
2. **Browsing:** The member views available swag or perks in the marketplace interface.
3. **Redemption Request:** The member clicks "Redeem". A record is created in `redemptions` with a `PENDING` status. The required points are deducted from their ledger to prevent double-spending.
4. **Fulfillment (Admin):** An `ADMIN` reviews the pending redemption in `gdg-hub`. Upon handing over the physical swag, they mark the redemption as `FULFILLED`.
5. **Rejection (Edge Case):** If the item is out of stock or the request is invalid, the `ADMIN` rejects it, and the points are refunded to the member's ledger.

## 4. Certificate Generation

1. **Post-Event:** After an event concludes, an `ADMIN` triggers certificate generation for all members who were marked `CHECKED_IN`.
2. **PDF Creation:** The `@hau/certificates` package dynamically generates PDFs with the member's name and event details.
3. **Storage:** The PDFs are uploaded to a Supabase Storage bucket.
4. **Database Record:** A record is added to the `certificates` table linking the member, event, and the public URL of the PDF.
5. **Member Access:** The member visits their `gdg-id` portfolio and can view or download their newly earned certificate.
