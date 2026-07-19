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

## Package rules

- Components must remain reusable by both applications.
- Do not import from `apps/`, Supabase, Next.js routing, or domain packages.
- Keep application copy, data fetching, authorization, and business rules in the consuming app or domain package.
- Export supported modules through `src/index.ts`; consumers must not use deep imports.
- Prefer accessible HTML defaults and forward refs for form primitives.
- Add application-specific components to an app first. Move them here only when the API is stable and a second consumer exists or is planned.

See the [UI/UX contribution guide](../../docs/contributing/ui-ux.md) for the designer-to-code workflow, handoff checklist, accessibility requirements, and component template.
