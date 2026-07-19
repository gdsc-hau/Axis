# Repository Layout

The GDG HAU Axis project is structured as a **monorepo** using [Turborepo](https://turbo.build/) and [pnpm workspaces](https://pnpm.io/workspaces). This architecture allows us to build multiple applications that share code seamlessly without publishing internal packages to npm.

## Monorepo Structure

The workspace is divided into two main top-level directories: `apps/` and `packages/`.

```text
gdg-axis/
├── apps/                 # User-facing applications
│   ├── gdg-hub/          # The internal management hub
│   └── gdg-id/           # The public ID verification and portfolio app
├── packages/             # Shared libraries and internal dependencies
│   ├── auth/             # Supabase auth wrappers & utilities
│   ├── badges/           # Badge awarding logic
│   ├── certificates/     # PDF generation for certificates
│   ├── config/           # Linting and formatting configurations
│   ├── contracts/        # Zod schemas & types for API boundaries
│   ├── db/               # Supabase database clients & queries
│   ├── events/           # Event registration business logic
│   ├── marketplace/      # Swag and point redemption logic
│   ├── points/           # Ledger calculations for member points
│   ├── pwa/              # Progressive Web App configs
│   ├── types/            # Global TypeScript interfaces
│   ├── typescript-config/# Shared tsconfig.json bases
│   └── axis-ui/          # Axis design system, primitives, and React components
├── supabase/             # Database migrations and seed data
└── docs/                 # Documentation (you are here)
```

## Why a Monorepo?

1. **Code Reusability:** The `gdg-hub` and `gdg-id` apps share stable UI primitives, contracts, database clients, authorization guards, and domain rules through `packages/`.
2. **Unified Tooling:** Linting, TypeScript compilation, and testing are configured once and applied across the entire repository.
3. **Atomic Commits:** When updating a shared package (e.g., `@hau/db`), we can simultaneously update the apps that rely on it in a single pull request, ensuring nothing breaks.
4. **Fast Builds:** Turborepo caches build artifacts. If you change code in `gdg-id`, Turborepo knows it doesn't need to rebuild `gdg-hub`.

## Internal Packages

Internal packages are named with the `@hau/*` scope (e.g., `@hau/axis-ui`, `@hau/auth`).
Inside any application's `package.json`, you will see dependencies like:

```json
"dependencies": {
  "@hau/db": "workspace:*",
  "@hau/axis-ui": "workspace:*"
}
```

The `workspace:*` version indicator tells pnpm to resolve these packages locally from the monorepo rather than fetching them from the npm registry.

## Ownership rule

Code starts in the narrowest correct owner. Route and product-specific code stays in `apps/`. A module moves to `packages/` when it represents a stable shared contract, UI primitive, infrastructure service, or domain rule. Packages expose a small public API through `src/index.ts`; apps do not deep-import package internals, and packages never import from apps.

For UI work, tokens and reusable presentational components belong in `packages/axis-ui`; complete screens, route-aware navigation, product copy, and data-bound compositions stay in the relevant app. See the [UI/UX contribution guide](../contributing/ui-ux.md) for the handoff and implementation workflow.
