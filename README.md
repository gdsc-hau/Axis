# GDG HAU Axis - ID & Hub Platform

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?logo=supabase)](https://supabase.com/)
[![Turborepo](https://img.shields.io/badge/Turborepo-Monorepo-EF4444?logo=turborepo)](https://turbo.build/repo)

The official ecosystem and digital identity hub for **Google Developer Groups on Campus – Holy Angel University (GDG HAU)**. This platform contains multiple applications and shared packages designed to handle member identities, event management, ticketing, points, badges, and internal community operations.

For complete developer documentation, see the [Documentation Portal](docs/index.md) or run `pnpm docs:serve`.

---

## 🚀 Quick Start

Follow these steps to get your development environment running locally.

### Prerequisites

Ensure you have the following installed before proceeding:

- **[Node.js](https://nodejs.org/)** (v20 or newer)
- **[Corepack](https://nodejs.org/api/corepack.html)**, included with Node.js, to use the repository's pinned pnpm version
- **[Supabase CLI](https://supabase.com/docs/guides/cli)** (For local database development)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/gdsc-hau/Axis.git
   cd Axis
   ```

2. **Install dependencies**

   ```bash
   corepack enable
   pnpm install
   ```

3. **Set up environment variables**
   Create `.env.local` inside both `apps/gdg-hub` and `apps/gdg-id`. Use `apps/gdg-hub/.env.example` as the reference for the shared Supabase variables. `gdg-id` also requires a private `QR_SIGNING_SECRET` containing at least 32 characters; its Upstash variables are optional for local development. Never commit either `.env.local` file.

4. **Start local Supabase (Database & Auth)**
   Make sure Docker is running on your machine, then run:

   ```bash
   supabase start
   ```

5. **Start the development server**
   Using Turborepo, you can start all apps simultaneously:
   ```bash
   pnpm dev
   ```

---

## 🛠 Tech Stack

- **Frontend:** Next.js 15 (App Router), Tailwind CSS, and the shared `@hau/axis-ui` design system
- **Backend & Database:** Supabase (PostgreSQL, Auth, Storage)
- **Type Safety:** Zod & TypeScript (End-to-End Type Safety)
- **Monorepo Management:** Turborepo & pnpm Workspaces
- **Documentation:** MkDocs with the Read the Docs theme

---

## 📂 Project Structure

This project uses a monorepo setup powered by Turborepo and pnpm workspaces:

```text
gdg-axis/
├── apps/
│   ├── gdg-hub/              # Internal event, membership, and points management system
│   └── gdg-id/               # Public-facing digital ID, profile, and portfolio viewer
├── packages/
│   ├── auth/                 # Shared authentication logic & Supabase wrappers
│   ├── badges/               # Badge awarding and verification logic
│   ├── certificates/         # PDF certificate generation for events
│   ├── config/               # ESLint, Prettier, and global configs
│   ├── contracts/            # Shared DB schemas and Zod contracts
│   ├── db/                   # Database clients, models, and queries
│   ├── events/               # Event registration and attendance logic
│   ├── marketplace/          # Point redemption and swag marketplace logic
│   ├── points/               # Points ledger and calculation logic
│   ├── pwa/                  # Progressive Web App configuration logic
│   ├── types/                # Global TypeScript type definitions
│   ├── typescript-config/    # Shared `tsconfig.json` configurations
│   └── axis-ui/              # Shared Axis design system and React components
├── supabase/
│   └── migrations/           # Supabase SQL migration files
└── docs/                     # MkDocs documentation source files
```

---

## 🤝 Contributing

We welcome contributions! Start with the root [contribution workflow](CONTRIBUTING.md), then use the detailed [coding standards](docs/contributing/standards.md) as needed.

UI/UX contributors and developers working on shared components should also read the [UI/UX contribution guide](docs/contributing/ui-ux.md) and the [`@hau/axis-ui` package guide](packages/axis-ui/README.md). Applications import supported components from `@hau/axis-ui`; they do not copy shared component code or deep-import package source files.

---

Built with ❤️ by the **GDG HAU Core Team**.
