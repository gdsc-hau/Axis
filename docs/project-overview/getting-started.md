# Getting Started

Follow this guide to set up your local development environment for the GDG HAU Axis monorepo.

## 1. Prerequisites

Before cloning the repository, ensure you have the following installed on your machine:

- **[Git](https://git-scm.com/)**: For version control.
- **[Node.js](https://nodejs.org/) (v20+)**: JavaScript runtime.
- **[Corepack](https://nodejs.org/api/corepack.html)**: Included with Node.js and used to select the pnpm version pinned in the root `package.json`.
- **[Docker Desktop](https://www.docker.com/products/docker-desktop/)**: Required for running the local Supabase instance.
- **[Supabase CLI](https://supabase.com/docs/guides/cli)**: For database migrations and local development.

## 2. Clone the Repository

Clone the project to your local machine and navigate into the directory:

```bash
git clone https://github.com/gdsc-hau/Axis.git
cd Axis
```

## 3. Install Dependencies

Install the monorepo dependencies using pnpm. This will link all the local `packages/*` to the `apps/*` correctly.

```bash
corepack enable
pnpm install
```

## 4. Environment Variables

Both applications require their own uncommitted `.env.local` file:

- `apps/gdg-hub/.env.local`
- `apps/gdg-id/.env.local`

Use `apps/gdg-hub/.env.example` as the reference for shared Supabase variables. The `gdg-id` file also requires `QR_SIGNING_SECRET`, a private random value containing at least 32 characters. `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are optional locally; without them, the app uses its local fallback rate limiter.

Running `supabase status` prints the local URL and keys. Put the appropriate local values in both files, keep server-only keys out of client code, and never commit either `.env.local` file.

## 5. Start Local Supabase

To start the local database, auth service, and storage:

```bash
supabase start
```

_Note: Make sure Docker is running before executing this command._

This command will automatically apply all SQL migrations found in `supabase/migrations/` to your local database container.

To stop the local database later, run:

```bash
supabase stop
```

## 6. Run the Development Server

With the database running, you can start the Next.js development servers. Using Turborepo, run this from the root directory:

```bash
pnpm dev
```

This command simultaneously starts both `gdg-hub` and `gdg-id`, and watches for changes across all `packages/`.

- `gdg-hub` runs on [http://localhost:3001](http://localhost:3001)
- `gdg-id` runs on [http://localhost:3000](http://localhost:3000)

## 7. Useful Commands

- **Build everything:** `pnpm build`
- **Lint the codebase:** `pnpm lint`
- **Check TypeScript types:** `pnpm typecheck`
- **Run repository tests:** `pnpm test`
- **Preview the documentation:** `pnpm docs:serve`
- **View local database UI:** `supabase status` will give you the local Studio URL (usually `http://127.0.0.1:54323`).
