# `@hau/axis-ui`

Shared, presentational React components for Axis applications.

The package is the code implementation of the Axis design system. UI/UX specifications, tokens, component states, and reusable React code live here; product pages and application-specific copy stay in their application.

## Usage

Declare the package in the consuming application's `package.json`:

```json
"@hau/axis-ui": "workspace:*"
```

Then import from the package's public entry point:

```tsx
import { Alert, Button, FormField, Input } from "@hau/axis-ui";
```

Both Next.js applications transpile `@hau/axis-ui`, and their Tailwind content configuration scans this package's source files.

Each application imports the design tokens once from its root layout:

```tsx
import "@hau/axis-ui/styles.css";
```

## Structure

```text
src/
├── components/      # Interactive or composed UI components
│   └── button/
│       ├── Button.tsx
│       ├── Button.styles.ts
│       ├── Button.types.ts
│       └── index.ts
├── primitives/      # Small layout and typography building blocks
├── utils/           # Framework-independent helpers
├── index.ts         # Public package API
└── styles.css       # Shared design tokens
```

## Available components

- Components: `Alert`, `Button`, `Card`, `FormField`, `Input`, and `Textarea`
- Primitives: `Box`, `Container`, `Stack`, and `Text`
- Utilities: `cn`

`Card` also exports `CardHeader`, `CardTitle`, `CardDescription`, and `CardContent`. Public prop and variant types are exported from the package root where they are defined. Treat this list and `src/index.ts` as the public API.

## Adding or changing a component

1. Start from a task issue that names the first consuming screen, design source, variants, responsive behavior, interaction states, and accessibility expectations.
2. Confirm the component is presentational and reusable. Keep routes, queries, authorization, business rules, and product copy in the app or domain package.
3. Add the implementation under `src/components/<component-name>/` or `src/primitives/<primitive-name>/`.
4. Export the component and its public types from the local `index.ts`, then from `src/index.ts`.
5. Use the component in at least one real application screen. Do not merge an unused abstraction.
6. Update this README and the UI/UX guide when the public API, tokens, setup, or ownership rules change.
7. Run the package and repository checks before review:

   ```bash
   pnpm --filter @hau/axis-ui typecheck
   pnpm lint
   pnpm typecheck
   pnpm test
   pnpm build
   ```

## Package rules

- Components must remain reusable by both applications.
- Do not import from `apps/`, Supabase, Next.js routing, or domain packages.
- Keep application copy, data fetching, authorization, and business rules in the consuming app or domain package.
- Export supported modules through `src/index.ts`; consumers must not use deep imports.
- Prefer accessible HTML defaults and forward refs for form primitives.
- Add application-specific components to an app first. Move them here only when the API is stable and a second consumer exists or is planned.
- Keep the public API backward-compatible when possible. If an API must change, update every consumer in the same pull request.

See the [UI/UX contribution guide](../../docs/contributing/ui-ux.md) for the designer-to-code workflow, handoff checklist, accessibility requirements, and component template.
