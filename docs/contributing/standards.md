# Coding Standards

To ensure a high-quality, maintainable codebase, all contributions to the GDG HAU Axis project must adhere to the following standards.

## TypeScript and Type Safety

- **Strict Mode:** TypeScript strict mode is enabled across the monorepo. Do not bypass it using `@ts-ignore` unless absolutely necessary (and if so, explain why in a comment).
- **Zod Validation:** All API inputs, form data, and Server Action arguments MUST be validated using Zod schemas defined in `@hau/contracts`. Do not trust client input.
- **No `any`:** Avoid using the `any` type. If you are unsure of a type, use `unknown` and perform type narrowing.

## React & Next.js Best Practices

- **Server Components First:** Default to building Server Components. Only add `'use client'` to components that require interactivity (hooks, event listeners) or browser APIs.
- **Server Actions:** Use Server Actions for data mutations instead of creating traditional API route handlers, keeping logic closely tied to the UI components that trigger them.
- **Component Colocation:** Keep styles, tests, and closely related sub-components in the same folder as the main component to maintain a clean structure.

## Database & SQL

- **Snake Case:** All tables and columns in Supabase must use `snake_case` (e.g., `member_id`, not `memberId`).
- **Row Level Security (RLS):** Every new table must have RLS enabled. Write clear policies defining who can select, insert, update, or delete rows.
- **Migrations:** Never alter production tables manually. Use the Supabase CLI to generate migration files.

## Pull Request Workflow

1. **Branch Naming:** Use conventional prefixes like `feat/`, `fix/`, `docs/`, `chore/` followed by a descriptive name (e.g., `feat/add-event-rsvp`).
2. **Commit Messages:** Follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).
3. **CI Checks:** Before pushing, run `pnpm typecheck` and `pnpm lint` locally. Pull requests will fail if the Vercel or GitHub Actions CI pipelines fail.
