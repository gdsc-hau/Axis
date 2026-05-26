# GDG HAU ID Platform

The official digital identity and membership verification hub for **Google Developer Groups on Campus – Holy Angel University (GDG HAU)**. This platform allows members to search for, verify, and showcase their unique GDG IDs and digital membership cards.

## 🚀 Quick Start

Get the development environment running locally

### Prerequisites
- **Node.js** (v20+)
- **pnpm** (Fast package manager: `npm install -g pnpm`)
- **Supabase CLI** (For local database development)

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

4. **Start development**
   ```bash
   pnpm dev
   ```

## 🛠 Tech Stack
- **Frontend:** Next.js 15 (App Router), Tailwind CSS, shadcn/ui
- **Backend/DB:** Supabase (PostgreSQL, Auth, Storage)
- **Type Safety:** Zod & TypeScript (End-to-End Type Safety)
- **Monorepo Management:** Turborepo & pnpm Workspaces

## 📂 Project Structure
```text
gdg-hau-platform/
├── apps/
│   └── id-platform/          # The Next.js website
├── packages/
│   ├── ui/                   # Shared UI components (inc. GdgIdCard)
│   ├── database/             # Shared DB schemas and Zod contracts
│   └── configs/              # Shared ESLint/Prettier/Tailwind configs
└── supabase/
    └── migrations/           # SQL migration files
```

---
Built with ❤️ by the **GDG HAU Core Team**.
