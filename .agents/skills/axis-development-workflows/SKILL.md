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
