# GDG HAU ID Platform

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?logo=supabase)](https://supabase.com/)

The official digital identity and membership verification hub for **Google Developer Groups on Campus – Holy Angel University (GDG HAU)**. This platform allows members to search for, verify, and showcase their unique GDG IDs and digital membership cards.

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
   Copy `.env.example` to `.env.local` and fill in your Supabase credentials.
   ```bash
   cp .env.example .env.local
   ```

4. **Start the development server**
   ```bash
   pnpm dev
   ```

## 🛠 Tech Stack

- **Frontend:** Next.js 15 (App Router), Tailwind CSS, shadcn/ui
- **Backend & Database:** Supabase (PostgreSQL, Auth, Storage)
- **Type Safety:** Zod & TypeScript (End-to-End Type Safety)
- **Monorepo Management:** Turborepo & pnpm Workspaces

## 📂 Project Structure

This project uses a monorepo setup powered by Turborepo and pnpm workspaces:

```text
gdghau-id-platform/
├── apps/
│   └── id-platform/          # The core Next.js web application
├── packages/
│   ├── contracts/            # Shared DB schemas and Zod contracts
│   ├── typescript-config/    # Shared TypeScript configurations
│   └── ui/                   # Shared UI components (e.g., GdgIdCard)
└── supabase/
    └── migrations/           # Supabase SQL migration files
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for more details on our workflow, branching strategy, and coding standards.

---
Built with ❤️ by the **GDG HAU Core Team**.
