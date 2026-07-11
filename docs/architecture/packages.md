# Shared Packages

Our monorepo isolates specific domains of logic into internal packages inside the `packages/` directory. This ensures strict boundaries, easy testing, and maximum reusability between `gdg-hub` and `gdg-id`.

## Core Infrastructure Packages

- **`@hau/config`**: Contains global ESLint and Prettier configurations. Both apps extend these to ensure code style consistency.
- **`@hau/typescript-config`**: Provides base `tsconfig.json` files tailored for Next.js, Node scripts, and React libraries.
- **`@hau/types`**: Global TypeScript interface definitions used across the frontend and backend.
- **`@hau/contracts`**: Zod schemas representing the boundaries between our API/Database and the frontend. We parse all form inputs and database responses through these Zod schemas to guarantee runtime type safety.
- **`@hau/ui`**: Our component library, built on top of Tailwind CSS, Radix UI, and shadcn/ui. Contains buttons, inputs, modals, and the `GdgIdCard` component.

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
