---
name: axis-development-workflows
description: Development workflows and safety guidelines for the GDG HAU Axis monorepo.
---

# Axis Development Workflows & Quality Verification

This skill documents critical workspace guidelines and verification processes for engineering tasks within the GDG HAU Axis repository. Follow these instructions whenever modifying applications, packages, or workflows.

## Monorepo Boundaries & Rules

1. **Ownership Scope**:
   - Keep route configurations and product copy inside `apps/`.
   - Keep presentational components and design primitives inside `packages/axis-ui`.
   - Put runtime validation schemas and request models in `packages/contracts`.
   - Put database connectors and queries in `packages/db`.

2. **Import Rules**:
   - Apps must not import from other apps.
   - Packages must not import from apps.
   - Do not deep-import package source code directories; only import from the public entry point exports.
   - Internal monorepo dependencies must use `"workspace:*"` in `package.json`.

## Pre-Push Local Checks

Before committing or pushing any changes, you must run the following checks locally:

```bash
# Ensure Node 22 is active
node -v

# Run formatting checks and auto-formatting
pnpm run format

# Run project lints
pnpm run lint

# Compile and check type safety
pnpm run typecheck

# Run test suites
pnpm run test
```

## Branching & Pushing Constraints

- Direct pushes to `main` are restricted. All contributions must use branch names prefixed with their category (e.g. `feat/`, `fix/`, `docs/`, `chore/`).
- Code changes must go through a Pull Request target branch to `main`.

## Routing & Rerouting Standards

1. **Route Handlers vs. Server Actions**:
   - Use Route Handlers (`app/api/.../route.ts`) exclusively for third-party webhooks (e.g., Luma, Stripe), PDF certificate streaming/generation, and external verification endpoints.
   - For all user-facing interactions inside the applications (forms, buttons, mutations), use Next.js **Server Actions** (`use server`) instead of REST APIs to retain end-to-end type safety.
2. **Path Integrity**:
   - Any route restructurings or redirection logic must preserve the user authentication checks present in `apps/gdg-hub/middleware.ts` (e.g., redirecting unauthenticated users to `/login`, and redirecting authenticated users away from public auth routes unless they are in the invite onboarding flow `/activate` or `/verify`).

## Cleaning Unused Code & Imports

To maintain a clean codebase and avoid lint check failures:

1. **Unused Imports & Variables**:
   - Do not leave unused imports or dead variables in TypeScript files. Run ESLint checks (`pnpm run lint`) regularly to identify them.
   - Use automated tools or editor features ("Organize Imports") to remove unused imports before pushing.
2. **Dead Code & Scaffolds**:
   - Remove placeholder/commented-out blocks of code that are no longer needed.
   - If a placeholder route is being officially deprecated or replaced, delete the unused files entirely rather than leaving them empty or stubbed.
3. **Prettier Enforcement**:
   - All newly modified files must be formatted using Prettier. Run `pnpm run format` locally before requesting pull request reviews.
