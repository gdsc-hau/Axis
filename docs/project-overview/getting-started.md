# Getting Started

Follow this guide to set up your local development environment for the GDG HAU Axis monorepo.

## 1. Prerequisites

Before cloning the repository, ensure you have the following installed on your machine:
- **[Git](https://git-scm.com/)**: For version control.
- **[Node.js](https://nodejs.org/) (v20+)**: JavaScript runtime.
- **[pnpm](https://pnpm.io/)**: Fast, disk space efficient package manager.
  ```bash
  npm install -g pnpm
  ```
- **[Docker Desktop](https://www.docker.com/products/docker-desktop/)**: Required for running the local Supabase instance.
- **[Supabase CLI](https://supabase.com/docs/guides/cli)**: For database migrations and local development.

## 2. Clone the Repository

Clone the project to your local machine and navigate into the directory:

```bash
git clone https://github.com/gdg-hau/id-platform.git
cd id-platform
```

## 3. Install Dependencies

Install the monorepo dependencies using pnpm. This will link all the local `packages/*` to the `apps/*` correctly.

```bash
pnpm install
```

## 4. Environment Variables

Both applications (`gdg-hub` and `gdg-id`) require environment variables to connect to Supabase.

1. Locate the `.env.example` file in the root directory or inside the app directories.
2. Copy it to `.env.local` or `.env`.
   ```bash
   cp .env.example .env.local
   ```
3. When running local Supabase, it will print out local URLs and anonymous keys. Update your `.env` files with these local credentials to test against your local database.

## 5. Start Local Supabase

To start the local database, auth service, and storage:

```bash
supabase start
```
*Note: Make sure Docker is running before executing this command.*

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
- `gdg-hub` typically runs on [http://localhost:3000](http://localhost:3000)
- `gdg-id` typically runs on [http://localhost:3001](http://localhost:3001)

## 7. Useful Commands

- **Build everything:** `pnpm build`
- **Lint the codebase:** `pnpm lint`
- **Check TypeScript types:** `pnpm typecheck`
- **View local database UI:** `supabase status` will give you the local Studio URL (usually `http://127.0.0.1:54323`).
