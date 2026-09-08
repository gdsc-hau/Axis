# Architecture

This section explains how requests move through the applications, shared
packages, Supabase Auth, PostgreSQL, Storage, and Edge Functions.

Read in this order:

1. [System Overview](overview.md) for the deployment and dependency picture.
2. [Applications](apps.md) for product ownership and route groups.
3. [Shared Packages](packages.md) for package responsibilities and imports.
4. [Authentication and RBAC](auth-rbac.md) before changing sessions, roles,
   membership lifecycle, middleware, or RLS.

The core boundary is deliberate: apps compose product behavior, packages expose
reusable capabilities, and Supabase policies remain the final authorization
layer.
