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
│   └── ui/               # Shared React components (Tailwind + shadcn/ui)
├── supabase/             # Database migrations and seed data
└── docs/                 # Documentation (you are here)
```

## Why a Monorepo?

1. **Code Reusability:** The `gdg-hub` and `gdg-id` apps often need the same UI components (like the ID card) and the same database schemas. The `packages/` directory prevents code duplication.
2. **Unified Tooling:** Linting, TypeScript compilation, and testing are configured once and applied across the entire repository.
3. **Atomic Commits:** When updating a shared package (e.g., `@hau/db`), we can simultaneously update the apps that rely on it in a single pull request, ensuring nothing breaks.
4. **Fast Builds:** Turborepo caches build artifacts. If you change code in `gdg-id`, Turborepo knows it doesn't need to rebuild `gdg-hub`.

## Internal Packages

Internal packages are named with the `@hau/*` scope (e.g., `@hau/ui`, `@hau/auth`). 
Inside any application's `package.json`, you will see dependencies like:

```json
"dependencies": {
  "@hau/db": "workspace:*",
  "@hau/ui": "workspace:*"
}
```

The `workspace:*` version indicator tells pnpm to resolve these packages locally from the monorepo rather than fetching them from the npm registry.
