# Application shells and page states

This guide explains how frontend contributors work with the shared Axis shells
and state components introduced in Phase 14. Progressive Web App and offline
behavior are not part of this phase.

## Ownership boundaries

`@hau/axis-ui` owns reusable presentation and interaction behavior. It does not
know about Next.js routes, Supabase, members, roles, or backend operations.

The applications own:

- route groups and navigation labels;
- authentication and role checks in server layouts;
- `Link`, `usePathname`, and active-route logic;
- product copy and Server Actions;
- page-specific spacing when a screen needs an exception.

Do not move an authentication redirect into a client sidebar. Protected layouts
must complete their server-side checks before rendering `ApplicationShell`.

## Hub route-group shells

| Route group   | Layout                                 | Navigation composition                  |
| ------------- | -------------------------------------- | --------------------------------------- |
| Public        | `apps/gdg-hub/app/(public)/layout.tsx` | `PublicHeader` and `PublicFooter`       |
| Member        | `apps/gdg-hub/app/member/layout.tsx`   | `ApplicationShell` with `MemberSidebar` |
| Administrator | `apps/gdg-hub/app/admin/layout.tsx`    | `ApplicationShell` with `AdminSidebar`  |

Member and administrator navigation use `ResponsiveSidebar`. On narrow screens,
the menu opens as a drawer with a backdrop and closes after selecting a link or
pressing Escape. At the `md` breakpoint and above, it becomes a persistent
sidebar. Public navigation switches to a compact menu below the `lg` breakpoint.

To add a route, update the route list in the owning sidebar or public header and
keep the matching page inside the same route group. Do not add product routes to
`@hau/axis-ui`.

## Shared page states

- `LoadingSkeleton` provides an announced loading placeholder. Prefer a route
  group's `loading.tsx` for page navigation and use a smaller instance only for
  an independently loading section.
- `EmptyState` explains why a valid collection has no rows and what the user can
  do next. It is not an error message.
- `StatusBadge` displays a compact neutral, informational, success, warning, or
  danger state. The application maps domain statuses to those visual tones.
- `ConfirmationDialog` confirms consequential actions. The consuming client
  component owns its open state and calls its existing Server Action after the
  user confirms.

## Development checks

After changing a shell or shared state component, run the repository checks from
the workspace root:

```bash
pnpm run format
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
```

Then manually check:

1. Public, member, and administrator navigation at mobile and desktop widths.
2. Keyboard focus, Escape-to-close, active-link state, and sign out.
3. Loading, empty, success, warning, and error states in light and dark themes.
4. Long labels and narrow screens without horizontal page overflow.
5. Unauthenticated and non-administrator redirects still behave as documented.

The [UI/UX contribution guide](ui-ux.md) defines the full component handoff and
review checklist.
