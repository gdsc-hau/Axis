# GDG HAU Axis

Axis is the shared platform for Google Developer Groups on Campus - Holy Angel University. The monorepo contains the GDG Hub member/admin portal, the GDG ID application, reusable packages, Supabase database history, tests, and project documentation.

The backend uses a linked hosted Supabase project. Local application development does not require a local database service.

## Applications

| Application    | Purpose                                                                                                                  | Local URL               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------- |
| `apps/gdg-hub` | Member portal, administration, events, attendance, Gyrocoins, rewards, credentials, content, communications, and reports | `http://localhost:3001` |
| `apps/gdg-id`  | Digital member ID and verification experience                                                                            | `http://localhost:3000` |

## Requirements

- Git
- Node.js 22 (`.node-version` currently pins `22.17.1`)
- Corepack, included with Node.js
- Python 3 and pip only when previewing or building the documentation
- Supabase CLI only for authorized developers who manage linked database migrations

The repository pins pnpm in `package.json`; do not substitute npm or Yarn for workspace commands.

## Quick start

```bash
git clone https://github.com/gdsc-hau/Axis.git
cd Axis
corepack enable
pnpm install --frozen-lockfile
```

Create the two untracked application environment files:

```bash
cp apps/gdg-hub/.env.example apps/gdg-hub/.env.local
cp apps/gdg-id/.env.example apps/gdg-id/.env.local
```

Ask a project maintainer for approved **non-production** Supabase values and other development secrets. Never copy secrets into source code, commit them, post them in an issue, or include them in a screenshot.

Run one application:

```bash
pnpm --filter gdg-hub dev
```

or run all workspace development tasks:

```bash
pnpm dev
```

See the [Developer Handbook](docs/project-overview/developer-handbook.md) for the
system mental model and where each kind of change belongs. Use
[Getting Started](docs/project-overview/getting-started.md) for exact environment
setup, commands, troubleshooting, and expected routes.

## Choose your task

| Task                                              | Start here                                                        |
| ------------------------------------------------- | ----------------------------------------------------------------- |
| First day in the repository                       | [Developer Handbook](docs/project-overview/developer-handbook.md) |
| Work on the member/admin/public Hub               | [GDG Hub README](apps/gdg-hub/README.md)                          |
| Work on digital ID or QR verification             | [GDG ID README](apps/gdg-id/README.md)                            |
| Add or change shared code                         | [Packages README](packages/README.md)                             |
| Implement a page, action, endpoint, or dependency | [Change Playbooks](docs/contributing/change-playbooks.md)         |
| Change the database                               | [Migration Workflow](docs/schema/migrations.md)                   |
| Operate or test a feature                         | [Runbook Index](docs/runbooks/README.md)                          |

## Repository map

| Path                   | Owner and purpose                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| `apps/`                | Product routes, screens, server actions, and application-specific behavior                  |
| `packages/axis-ui/`    | Reusable design tokens, primitives, and shared React components                             |
| `packages/contracts/`  | Shared validation schemas and boundary types                                                |
| `packages/db/`         | Supabase clients, database type definitions, and domain query modules                       |
| `packages/*`           | Shared authentication, events, points, marketplace, credentials, and infrastructure modules |
| `supabase/migrations/` | Ordered, reviewable database schema and security history                                    |
| `supabase/preflight/`  | Read-only compatibility, verification, and transactional smoke-test SQL                     |
| `supabase/functions/`  | Supabase Edge Function source code                                                          |
| `tests/`               | Repository-level Node test suites and tracked fixtures                                      |
| `docs/`                | Handwritten MkDocs documentation source                                                     |
| `tooling/`             | CI, generator, and maintenance scripts                                                      |

The [File and Directory Guide](docs/project-overview/file-and-directory-guide.md) explains what the important files do, what may be edited, and what must not be committed.

## Validation

Run these checks from the repository root before opening a pull request:

```bash
pnpm run format
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
```

The required Node version is 22. Formatting may modify files, so review `git diff` afterward.

## Documentation

```bash
python -m pip install -r docs/requirements.txt
pnpm docs:serve
```

Open `http://127.0.0.1:8000`. Edit files under `docs/`; the generated `site/` directory is ignored and must not be committed.

Start with:

- [Developer Handbook](docs/project-overview/developer-handbook.md)
- [Repository Layout](docs/project-overview/repository-layout.md)
- [Coding Standards](docs/contributing/standards.md)
- [Environment Configuration](docs/runbooks/environment-configuration.md)
- [Local Development Runbook](docs/runbooks/local-dev.md)
- [Migration Workflow](docs/schema/migrations.md)

## Security rules

- `NEXT_PUBLIC_*` values are browser-visible. Do not put privileged credentials in them.
- `SUPABASE_SERVICE_ROLE_KEY`, signing secrets, database URLs, and provider tokens are server-only.
- Browser code must use the anon key and rely on Row Level Security.
- Database changes must be represented by committed migrations and reviewed preflight/verification files.
- Use the shared package boundaries; do not import one application from another or deep-import private package files.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the branch, commit, review, and pull-request workflow.
