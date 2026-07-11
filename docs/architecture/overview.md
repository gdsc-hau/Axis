# System Overview

The codebase is a pnpm and Turbo monorepo with two Next.js applications, shared domain packages, and Supabase-backed data services.

## Primary surfaces

- [apps/gdg-hub](../../apps/gdg-hub): the main community hub for public, member, and admin flows
- [apps/gdg-id](../../apps/gdg-id): the identity-focused companion app
- [packages/](../../packages): shared libraries for auth, database access, events, certificates, rewards, and UI primitives
- [supabase/](../../supabase): database migrations, seed data, and edge functions

## Current runtime shape

The root layout for `gdg-hub` sets the application metadata and loads the Inter font in [apps/gdg-hub/app/layout.tsx](../../apps/gdg-hub/app/layout.tsx).

The application routes are grouped into public, auth, member, and admin surfaces, with API routes for leaderboard rebuilds, certificates, attendance, Luma sync, and redemptions.

## Documentation goal

This section should let contributors understand where a feature belongs before they start reading implementation details.
