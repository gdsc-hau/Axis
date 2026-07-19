# Contributing to Axis

Thank you for contributing. Keep each change focused, easy to review, and linked to an issue.

## Simple workflow

1. Create or choose an issue.
2. Add the issue to the GitHub Project and assign an owner, status, and priority.
3. Create a branch from the current development branch.
4. Make and test one focused change.
5. Commit it using the format below.
6. Open a pull request and link the issue.
7. Address review feedback, then merge when approved.

## Branch names

Use a short, descriptive name:

```text
feat/member-qr-code
fix/password-reset
docs/setup-guide
chore/update-dependencies
```

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

## Before opening a pull request

Run the checks relevant to your change. For application code, use:

```bash
pnpm lint
pnpm typecheck
pnpm test
```

Also confirm that:

- no secrets, environment files, or private member data were committed;
- documentation was updated when behavior or setup changed;
- database changes are included as migrations;
- unrelated files and formatting changes are not included.

## Monorepo boundaries

- Keep routes and application-specific composition in `apps/`.
- Put reusable UI primitives in `@hau/axis-ui` and import them from the package root.
- Put runtime input and API schemas in `@hau/contracts`.
- Put shared database access in `@hau/db` and authorization guards in `@hau/auth`.
- Put business rules in their domain package, such as `@hau/events` or `@hau/points`.
- Declare every internal dependency with `workspace:*`.
- Never import from one app into another, from a package into an app, or through a package's private source path.

UI/UX contributors should follow the [UI/UX contribution guide](docs/contributing/ui-ux.md) when proposing design tokens or shared components for `@hau/axis-ui`.

## Pull requests

- Keep one main purpose per pull request.
- Use a clear title that follows the commit format.
- Link the issue with `Closes #123`.
- Explain what changed and how it was tested.
- Add screenshots for visible interface changes.
- Request review only when the work is ready.

Project status is updated manually in GitHub Projects: move the issue through `Todo`, `In progress`, `In review`, and `Done` as the work advances.
