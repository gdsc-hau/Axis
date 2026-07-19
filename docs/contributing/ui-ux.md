# UI/UX Contribution Guide

This guide explains how designers and developers collaborate on the Axis design system in `packages/axis-ui`.

## Can UI/UX contributors add components as code?

Yes. A UI/UX contributor who is comfortable with React, TypeScript, and Tailwind may implement a component directly in `@hau/axis-ui`. A designer who does not code can provide a complete component specification through a task issue, then work with a developer during implementation and review.

Applications consume approved components from the package root:

```tsx
import { Button, Card, Container, Stack } from "@hau/axis-ui";
```

Do not copy the component into each application and do not deep-import files such as `@hau/axis-ui/src/components/button/Button`.

## What belongs in `axis-ui`?

Add a component when it is reusable, presentational, and independent of product data.

Good candidates:

- buttons, inputs, alerts, badges, dialogs, tabs, tooltips, and tables;
- layout primitives such as containers, stacks, grids, and text;
- design tokens for color, spacing, radius, typography, shadow, and motion;
- reusable interaction and accessibility behavior;
- stable compositions that are needed by more than one screen or application.

Keep these in an application:

- routes and complete pages;
- Supabase queries and authentication logic;
- member, event, points, or marketplace business rules;
- application-specific copy and navigation;
- components that are experimental or have only one highly specific consumer.

## Package structure

```text
packages/axis-ui/
├── src/
│   ├── components/
│   │   └── component-name/
│   │       ├── ComponentName.tsx
│   │       ├── ComponentName.styles.ts
│   │       ├── ComponentName.types.ts
│   │       └── index.ts
│   ├── primitives/
│   │   └── primitive-name/
│   │       ├── PrimitiveName.tsx
│   │       └── index.ts
│   ├── utils/
│   ├── index.ts
│   └── styles.css
├── package.json
├── README.md
└── tsconfig.json
```

Use lowercase kebab-case folders and PascalCase React files. A small component may keep its types or style map in the component file; split them when the API or variants become substantial.

## Designer-to-code workflow

### 1. Create a task issue

Choose the **Task assignment** issue template and use a title such as:

```text
feat(axis-ui): add accessible modal component
```

Set the owner, priority, target date, project status, dependencies, and acceptance criteria. Link the design source and name the first screens that will consume the component.

### 2. Specify the component

The design handoff must define:

- purpose and intended use;
- anatomy and content rules;
- variants and sizes;
- default, hover, focus, active, disabled, loading, empty, and error states where relevant;
- light and dark appearance;
- responsive behavior and minimum/maximum dimensions;
- spacing, typography, color, radius, shadow, icons, and motion;
- keyboard behavior, focus order, accessible name, and screen-reader expectations;
- examples of correct and incorrect use.

Use existing tokens from `src/styles.css`. If a new token is necessary, explain why an existing semantic token cannot represent the design.

### 3. Agree on the component API

Design and development should agree on code-facing names before implementation:

```tsx
<Button variant="primary" size="md" loading={isSaving}>
  Save changes
</Button>
```

Prefer a small set of meaningful variants over styling props such as arbitrary colors or pixel values. Consumers may use `className` for layout, but core visual states belong to the component.

### 4. Implement the component

A code contribution should:

- use semantic HTML before ARIA workarounds;
- forward refs for interactive primitives;
- preserve standard HTML attributes;
- support keyboard and visible focus behavior;
- avoid imports from Next.js, Supabase, `apps/`, or domain packages;
- use static Tailwind class names so both applications generate the required CSS;
- export types and components through the component `index.ts` and package `src/index.ts`;
- avoid real member data, production screenshots, or secrets in examples.

Minimal pattern:

```tsx
// components/example/Example.types.ts
import type { HTMLAttributes } from "react";

export interface ExampleProps extends HTMLAttributes<HTMLDivElement> {
  tone?: "default" | "highlighted";
}
```

```tsx
// components/example/Example.tsx
import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import type { ExampleProps } from "./Example.types";

export const Example = forwardRef<HTMLDivElement, ExampleProps>(
  function Example({ className, tone = "default", ...props }, ref) {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg",
          tone === "highlighted" && "bg-blue-50",
          className,
        )}
        {...props}
      />
    );
  },
);
```

```ts
// components/example/index.ts
export { Example } from "./Example";
export type { ExampleProps } from "./Example.types";
```

### 5. Review the result in a real application

The first pull request should use the component in at least one real screen. Review it at narrow mobile, tablet, and desktop widths; with keyboard-only input; in light and dark modes; and with long, missing, loading, disabled, and error content.

### 6. Verify before review

Run:

```bash
pnpm --filter @hau/axis-ui typecheck
pnpm lint
pnpm typecheck
pnpm build
```

The pull request must include screenshots or a short recording for visual changes and list the states that were manually checked.

## Importing components in an application

The application declares the workspace dependency:

```json
"@hau/axis-ui": "workspace:*"
```

The application root layout imports tokens once:

```tsx
import "@hau/axis-ui/styles.css";
```

Individual screens import component code:

```tsx
import { Alert, Button, FormField, Input } from "@hau/axis-ui";
```

This is a source-based internal package. Next.js transpiles it directly, so component updates are available to both applications without publishing to npm.

## Review checklist

- [ ] The component belongs in the shared design system.
- [ ] Names match the approved design terminology.
- [ ] All required interaction states are implemented.
- [ ] Light, dark, mobile, and desktop behavior were reviewed.
- [ ] Keyboard navigation and visible focus work.
- [ ] Labels, roles, and announcements are meaningful to assistive technology.
- [ ] Design tokens are used instead of one-off values where possible.
- [ ] The component has no application or backend dependency.
- [ ] Public exports and usage documentation are updated.
- [ ] A real application consumes the component.
- [ ] Lint, type checks, and production builds pass.
