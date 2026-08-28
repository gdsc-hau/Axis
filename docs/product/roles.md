# Roles & Access Control

The GDG HAU Axis platform utilizes a straightforward Role-Based Access Control (RBAC) system to ensure data security and operational integrity.

Roles describe what an active member may do. Membership access is decided separately by `members.member_status`, and only `ACTIVE` members can enter protected portal areas.

## User Roles

Currently, the system defines two primary roles in the `members` table:

### 1. `MEMBER`

The default role assigned to any student who registers for a GDG HAU account.

**Capabilities:**

- Access their own digital ID via `gdg-id`.
- Edit their own public profile (bio, social links).
- View their own points ledger and transaction history.
- RSVP to public events.
- Download their own certificates and view their earned badges.
- Request point redemptions in the marketplace.

### 2. `ADMIN`

Assigned to the GDG HAU Executive Team, Core Officers, and technical maintainers.

**Capabilities:**

- **All `MEMBER` capabilities.**
- **Member Management:** View and edit profiles of other members, manually adjust the points ledger, and assign badges.
- **Event Operations:** Create and modify events, manage RSVPs, and perform check-ins.
- **Marketplace Ops:** Approve or reject point redemption requests.
- **System Settings:** Modify global application settings.

## Technical Implementation

Role enforcement happens at multiple layers to ensure maximum security:

1. **Database Level (Row Level Security):**
   Supabase RLS policies are the ultimate source of truth. Member-owned rows compare their domain foreign key to `current_member_id()`, which resolves only active members. Admin policies use `is_admin()`, which requires both `ACTIVE` status and the `ADMIN` role.

2. **API & Server Actions Level:**
   Next.js Server Actions and API routes (found in `@hau/db` or the apps) check the user's session and role before executing mutations.

3. **UI Level:**
   Frontend components conditionally render based on the user's role. For example, the "Create Event" button is entirely hidden from `MEMBER` users. _Note: UI hiding is for UX, not security. RLS provides the actual security._

## Upgrading a Member

An active administrator can upgrade an active `MEMBER` through the `gdg-hub` dashboard. The audited `set_member_role()` operation prevents self-demotion and protects the last active administrator. If the promoted row does not have an Auth account yet, it can then be invited through the same registry-gated invitation flow. Production role changes must not be made manually in Supabase Studio.
