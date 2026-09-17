# Shared Packages

The `@hau/*` packages are the stable boundaries shared by the Axis
applications. They are private workspace packages linked by pnpm and orchestrated
by Turborepo; they are not independently published.

| Directory           | Package                  | Use                                                                      |
| ------------------- | ------------------------ | ------------------------------------------------------------------------ |
| `auth`              | `@hau/auth`              | Verified sessions and active member/admin guards                         |
| `axis-ui`           | `@hau/axis-ui`           | Design tokens, primitives, and reusable presentational components        |
| `contracts`         | `@hau/contracts`         | Zod schemas and runtime-safe boundary types                              |
| `db`                | `@hau/db`                | Supabase clients, environment guards, generated types, and domain access |
| `events`            | `@hau/events`            | Event sync, attendance, Luma, and RSVP-domain helpers                    |
| `points`            | `@hau/points`            | Gyrocoin ledger and balance rules                                        |
| `marketplace`       | `@hau/marketplace`       | Reward and redemption behavior                                           |
| `badges`            | `@hau/badges`            | Badge recognition and award rules                                        |
| `certificates`      | `@hau/certificates`      | Certificate templates, files, and delivery helpers                       |
| `types`             | `@hau/types`             | General TypeScript-only types                                            |
| `typescript-config` | `@hau/typescript-config` | Shared strict TypeScript configurations                                  |

## Dependency direction

```text
apps -> shared UI / contracts / auth / db / domain packages
domain packages -> contracts and general types when required
packages -X-> apps
app -X-> another app
```

Add internal dependencies with `workspace:*` in the consuming workspace. Import
from the package's supported entry point; do not deep-import another package's
private `src` files.

## Add or extend a package

1. Choose the narrowest existing owner before creating a new package.
2. Keep the public API small and export supported members through `src/index.ts`
   or declared `package.json` exports.
3. Add the package to the consumer with
   `pnpm --filter <workspace> add @hau/<name>@workspace:*`.
4. Add focused tests under the repository test setup.
5. Run lint, typecheck, tests, and builds for affected consumers.
6. Update [Shared Packages](../docs/architecture/packages.md) when ownership or
   the public API changes.

`@hau/axis-ui` has its own [component guide](axis-ui/README.md). Database access
and schema changes must also follow the
[migration workflow](../docs/schema/migrations.md).
