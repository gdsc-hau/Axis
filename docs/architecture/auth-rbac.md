# Authentication, Membership Status, and RBAC

Supabase Auth owns credentials, signed sessions, recovery, and invitation tokens. `public.members` is Axis's permanent domain identity and membership source of truth.

## Auth identity and domain identity

Members are registered before they receive an Auth account, so `public.members.id` is not the same value as `auth.users.id`. Every domain foreign key points to `members.id`.

`members.auth_id` is a nullable, unique bridge to `auth.users.id`. It remains null until activation. Application code treats `public.members` as the source of truth. A narrowly scoped private database function reads the server-managed Auth email during linking; the browser never receives Auth-schema access.

The invite-only flow is:

1. An active admin approves a registry row by setting `member_status` to `ACTIVE`.
2. A Before User Created Auth hook independently confirms the normalized email belongs to an active, unlinked registry row.
3. `auth.admin.inviteUserByEmail(email)` creates or re-invites the Auth user and sends a one-time code.
4. `/confirm-invite` verifies the email plus `invite` OTP and establishes a Supabase session.
5. `/activate` accepts a password only for an account whose activation is not already complete.
6. `link_current_member_account()` verifies the authenticated Auth email against an active registry row, then records `auth_id` and `activated_at`.
7. Subsequent lookups use `members.auth_id` to resolve the permanent member UUID.

For verified Auth users that predate `members.auth_id`, the first successful password login may perform the same audited link. The login action first resolves an unlinked row by normalized email, requires `member_status = 'ACTIVE'`, calls `link_current_member_account()`, and verifies the resulting ID-based link before granting portal access. Inactive or conflicting accounts are never linked automatically.

Public self-registration through `/signup` is disabled.

## Membership lifecycle

`members.member_status` decides whether an identity can access member features:

- `PENDING`: Awaiting a membership decision.
- `ACTIVE`: The only state that grants member or administrator portal access.
- `REJECTED`: Membership was not approved.
- `SUSPENDED`: Access is temporarily restricted.
- `INACTIVE`: Membership has been deactivated.
- `ALUMNI`: The identity remains in the registry, but alumni portal access is not enabled yet.

`is_accepted` remains temporarily as a database-derived compatibility field. A trigger always sets it to `member_status = 'ACTIVE'`; application code must not read or write it.

## Role-based access control

Roles describe what an active member may do:

- `MEMBER`: Member-owned portal features.
- `ADMIN`: Administrative operations in addition to member features.

An `ADMIN` role never bypasses membership status. An inactive administrator is denied in the same way as any other inactive member.

## Enforcement layers

The application uses verified `auth.getUser()` results, resolves the associated member, and applies an active-member or active-admin guard. Inactive authenticated users are redirected to `/account-status`.

RLS is the final authorization boundary:

- `current_member_id()` returns the domain UUID only for a linked `ACTIVE` member.
- `is_admin()` returns true only for a linked member with `member_status = 'ACTIVE'` and `role = 'ADMIN'`.
- Member-owned policies compare their `member_id` to `current_member_id()`.
- Admin policies call `is_admin()`.

Moving a member away from `ACTIVE` therefore blocks protected domain rows immediately, even if an older Auth JWT still exists.

Direct authenticated updates to `public.members` are revoked. Status, role, invitation, account-linking, and profile-completion mutations use explicit RPCs. Privileged implementations live in the non-exposed `private` schema, validate `auth.uid()`, and write lifecycle audit records.

New Auth identity creation is separately guarded by `hook_restrict_member_account_creation(event)`. The function is `SECURITY INVOKER`; only `supabase_auth_admin` can execute it, and that role receives column-level read access only to `members.email`, `members.member_status`, and `members.auth_id`. The hook must also be enabled in the hosted project's **Authentication > Hooks** settings after its migration is deployed.

## Shared auth helpers

`@hau/auth` exports:

- `getUser()`: Verifies the current session with Supabase Auth.
- `getMemberForAuthUser()`: Resolves the linked member, with a normalized-email fallback for invite onboarding.
- `getAuthenticatedMember()`: Returns the verified Auth user and registry member together.
- `getActiveMember()`: Requires `member_status = 'ACTIVE'`.
- `getActiveAdmin()`: Also requires `role = 'ADMIN'`.
