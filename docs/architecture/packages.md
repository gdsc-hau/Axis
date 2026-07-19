# Shared Packages

Our monorepo isolates specific domains of logic into internal packages inside the `packages/` directory. This ensures strict boundaries, easy testing, and maximum reusability between `gdg-hub` and `gdg-id`.

## Core Infrastructure Packages

- **`@hau/config`**: Contains global ESLint and Prettier configurations. Both apps extend these to ensure code style consistency.
- **`@hau/typescript-config`**: Provides base `tsconfig.json` files tailored for Next.js, Node scripts, and React libraries.
- **`@hau/types`**: Global TypeScript interface definitions used across the frontend and backend.
- **`@hau/contracts`**: Zod schemas representing the boundaries between our API/Database and the frontend. We parse all form inputs and database responses through these Zod schemas to guarantee runtime type safety.
- **`@hau/axis-ui`**: The shared Axis design-system package. It contains design tokens, layout primitives, buttons, form controls, alerts, and cards available to both applications. Application-specific components such as the current `GdgIdCard` remain in their owning app until their API is stable and reusable.

## Backend & Data Packages

- **`@hau/db`**: The central nervous system of the platform. Contains the Supabase client initializers (server, browser, admin bypass) and reusable query functions (e.g., `getMemberById`, `updateLedger`).
- **`@hau/auth`**: Wrappers around `@supabase/ssr` to handle session management, cookie parsing, and role verification consistently across both Next.js apps.

## Feature / Domain Packages

- **`@hau/events`**: Logic for RSVPing, checking capacity, and validating event check-ins.
- **`@hau/points`**: Handles the complex logic of the points ledger—calculating current balances by summing up past transactions and ensuring members cannot spend more points than they have.
- **`@hau/badges`**: Logic for determining if a member qualifies for a new badge and inserting the record.
- **`@hau/certificates`**: Utilities utilizing server-side PDF generation libraries to dynamically stamp member names and event titles onto certificate templates.
- **`@hau/marketplace`**: Handles the logic for deducting points and requesting swag.
- **`@hau/pwa`**: Configuration generators for next-pwa to enable offline caching and home-screen installation for the `gdg-id` app.

## Package boundaries

- `apps/*` owns routing, page composition, deployment configuration, and application-specific UI.
- `@hau/axis-ui` owns reusable presentational components and must not access Next.js routing, Supabase, or domain data.
- `@hau/contracts` owns runtime validation for data crossing form, API, and integration boundaries.
- `@hau/db` owns database client creation and reusable data-access functions.
- `@hau/auth` owns session and authorization guards shared by applications.
- Domain packages such as `@hau/events` and `@hau/points` own business rules, not pages.
- Packages must never import files from `apps/`, and applications must consume packages only through their public exports.
- Every internal dependency must be declared with `workspace:*` in the consuming package.

The applications inherit the shared `@hau/typescript-config/nextjs.json` preset. Package-specific settings should extend a shared preset instead of copying compiler configuration.
