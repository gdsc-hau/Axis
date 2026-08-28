# Contributing to Axis

Thank you for contributing. Keep each change focused, easy to review, and linked to an issue.

## Simple workflow

1. Create or choose an issue.
2. Add the issue to the GitHub Project and assign an owner, status, and priority.
3. Create a branch from the maintainer-designated integration branch.
4. Make and test one focused change.
5. Commit it using the format below.
6. Open a pull request and link the issue.
7. Address review feedback, then merge when approved.

## Branch names & Rules

Use a short, descriptive name prefixed by the change category:

```text
feat/member-qr-code
fix/password-reset
docs/setup-guide
chore/update-dependencies
```

### Branching Rules

- **Direct Pushes Restricted**: Never push code directly to the `main` branch unless it is an administrative config release explicitly coordinated by core maintainers.
- **Feature Branches**: Develop all changes on separate feature branches based on the latest maintainer-designated integration branch.
- **Target Branch**: During active development, this is normally `staging`. Use `main` only for a coordinated release or when a maintainer explicitly requests it.

## Commit messages

Use this format:

```text
<type>(optional-scope): short description
```

Common types:

- `feat`: new feature
- `fix`: bug fix
- `docs`: documentation only
- `refactor`: code change without a new feature or bug fix
- `test`: tests only
- `chore`: maintenance

Examples:

```text
feat(members): use email in verification QR code
fix(auth): handle expired password reset links
docs: clarify local setup
```

To use the included commit template locally:

```bash
git config commit.template .gitmessage
```

Then run `git commit` to open the template in your configured editor. Do not use `git commit -m` if you want the template to appear.

## CI/CD Validation

Every pull request to a protected integration branch triggers the GitHub Actions validation pipeline. This workflow runs:

1. Code Quality Linting (`pnpm run lint`)
2. TypeScript Compile Checks (`pnpm run typecheck`)
3. Project Test Suites (`pnpm run test`)

### Pre-PR Local Verification

To ensure a fast and passing pull request, you **MUST** run all verification steps locally before pushing your branch. Make sure your local environment is configured with **Node.js v22** and execute:

```bash
# Ensure Node 22 is active
node -v # Should display v22.x.x

# Run validation checks locally
pnpm run format
pnpm run lint
pnpm run typecheck
pnpm run test
```

For shared UI package modifications, also verify typing isolation:

```bash
pnpm --filter @hau/axis-ui typecheck
```

Confirm that:

- All checks pass cleanly with zero warnings or errors.
- No secrets, `.env.local` variables, or private registry credentials were committed.
- Documentation under `docs/` and the database `supabase/migrations/` schemas were updated accordingly.
- Unrelated styling or formatting changes have been trimmed.

## Monorepo boundaries

- Keep routes and application-specific composition in `apps/`.
- Put reusable UI primitives in `@hau/axis-ui`, follow its [package guide](packages/axis-ui/README.md), and import them from the package root.
- Put runtime input and API schemas in `@hau/contracts`.
- Put shared database access in `@hau/db` and authorization guards in `@hau/auth`.
- Put business rules in their domain package, such as `@hau/events` or `@hau/points`.
- Declare every internal dependency with `workspace:*`.
- Never import from one app into another, from a package into an app, or through a package's private source path.

UI/UX contributors should follow the [UI/UX contribution guide](docs/contributing/ui-ux.md) when proposing design tokens or shared components for `@hau/axis-ui`. A design-only contribution is valid when it includes the required states, responsive behavior, accessibility expectations, and a linked implementation task.

## Pull requests

- Keep one main purpose per pull request.
- Use a clear title that matches the commit message format.
- Link the related issue using `Closes #123`.
- Detail the exact changes introduced and provide a summary of local testing.
- Add screenshots/videos for visual layout updates.
- Wait for the GitHub Actions checks to pass successfully before requesting a review from team members.

Project status is updated manually in GitHub Projects: move the issue through `Todo`, `In progress`, `In review`, and `Done` as the work advances.
