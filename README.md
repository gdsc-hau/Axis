# GDG HAU Axis - ID & Hub Platform

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?logo=supabase)](https://supabase.com/)
[![Turborepo](https://img.shields.io/badge/Turborepo-Monorepo-EF4444?logo=turborepo)](https://turbo.build/repo)

The official ecosystem and digital identity hub for **Google Developer Groups on Campus – Holy Angel University (GDG HAU)**. This platform contains multiple applications and shared packages designed to handle member identities, event management, ticketing, points, badges, and internal community operations.

For complete developer documentation, please refer to our [Documentation Portal](docs/index.md) (or run `mkdocs serve`).

---

## 🚀 Quick Start

Follow these steps to get your development environment running locally.

### Prerequisites

Ensure you have the following installed before proceeding:

- **[Node.js](https://nodejs.org/)** (v20 or newer)
- **[pnpm](https://pnpm.io/)** (Fast, disk space efficient package manager: `npm install -g pnpm`)
- **[Supabase CLI](https://supabase.com/docs/guides/cli)** (For local database development)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/gdg-hau/id-platform.git
   cd id-platform
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   Copy `.env.example` to `.env.local` or `.env` inside the respective applications (`apps/gdg-hub` and `apps/gdg-id`) and fill in your Supabase credentials.

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

- **Frontend:** Next.js 15 (App Router), Tailwind CSS, shadcn/ui
- **Backend & Database:** Supabase (PostgreSQL, Auth, Storage)
- **Type Safety:** Zod & TypeScript (End-to-End Type Safety)
- **Monorepo Management:** Turborepo & pnpm Workspaces
- **Documentation:** MkDocs (Material theme)

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

We welcome contributions! Please see our [Contributing Guidelines](docs/contributing/standards.md) for more details on our workflow, branching strategy, coding standards, and documentation rules.

---

Built with ❤️ by the **GDG HAU Core Team**.
