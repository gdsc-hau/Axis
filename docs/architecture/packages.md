# Shared packages

Axis keeps reusable logic in `packages/` so both applications can share stable contracts without importing from each other.

## Package map

| Package                  | Responsibility                                                                 | Typical consumers                                   |
| ------------------------ | ------------------------------------------------------------------------------ | --------------------------------------------------- |
| `@hau/typescript-config` | Base TypeScript configurations for Next.js, React libraries, and Node tooling. | All TypeScript workspaces                           |
| `@hau/types`             | Shared TypeScript-only domain types.                                           | Apps and domain packages                            |
| `@hau/contracts`         | Zod schemas and runtime-safe request/response contracts.                       | Forms, Server Actions, route handlers, integrations |
| `@hau/axis-ui`           | Reusable presentational components and design tokens.                          | `gdg-hub`, `gdg-id`                                 |
| `@hau/auth`              | Shared Supabase session and authorization helpers.                             | Server-side app code                                |
| `@hau/db`                | Supabase client creation and reusable, typed data access.                      | Server Actions, server components, route handlers   |
| `@hau/events`            | Event integration payloads, attendance rules, and Luma-related helpers.        | Event and attendance features                       |
| `@hau/points`            | Gyrocoin ledger, balance, and points-rule helpers.                             | Wallet, marketplace, attendance                     |
| `@hau/marketplace`       | Reward catalog, redemption, and fulfillment rules.                             | Member rewards and admin queues                     |
| `@hau/badges`            | Badge eligibility and award rules.                                             | Credential workflows                                |
| `@hau/certificates`      | Certificate template, PDF, private storage, and email helpers.                 | Credential workflows                                |

The current event registration flow is external: Axis mirrors GDG Community event information and redirects registration to the configured Luma link. The codebase does not currently treat an internal Axis RSVP record as the registration source of truth.

Progressive Web App support is intentionally deferred to a future version. The
current applications do not register an Axis service worker or promise offline
behavior.

## Ownership rules

- `apps/*` owns routes, page composition, deployment configuration, and application-specific UI.
- `@hau/axis-ui` owns reusable presentation and must not access routing, Supabase, or domain data.
- `@hau/contracts` owns runtime validation at form, API, database, and integration boundaries.
- `@hau/db` owns database clients and reusable data-access functions.
- `@hau/auth` owns shared session and authorization guards.
- Domain packages own business rules, not pages or application navigation.
- Packages never import from `apps/`.
- One application never imports source files from another application.
- Consumers import packages through their public exports, never through `src/...` deep paths.
- Every internal dependency uses `workspace:*` in the consuming `package.json`.

These boundaries let frontend contributors replace page composition and styling without duplicating backend authorization or database rules.

## Using `@hau/axis-ui`

`@hau/axis-ui` is a private source package. It is compiled by the consuming Next.js application and is not published to npm.

```tsx
import { Button, Card, FormField, Input } from "@hau/axis-ui";
```

When an application consumes it:

1. Declare `"@hau/axis-ui": "workspace:*"` in the application package.
2. Keep `@hau/axis-ui` in the application's `transpilePackages` list.
3. Include the package source in the Tailwind content paths.
4. Import `@hau/axis-ui/styles.css` once from the root layout.
5. Import supported components from `@hau/axis-ui`, not internal source files.

Application-specific components stay in their application until their API is stable and useful to both apps.

See the [file and directory guide](../project-overview/file-and-directory-guide.md) for the important files inside each package.
