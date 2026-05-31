# Contributing to the GDG HAU ID Platform

Welcome! We are thrilled that you want to contribute to the GDG HAU Digital Hub. To maintain our codebase's integrity, quality, and scalability, please follow these guidelines when contributing.

## 🛠 Development Workflow

We follow a **Contract-First Architecture**. This means we define the structure and validation of our data before implementing the features.

1. **The Contract:** If you are adding a new feature (e.g., "Member Badges"), you must first update the Zod schemas in `packages/contracts`. This ensures the Backend and Frontend stay perfectly in sync.
2. **Implementation:** Once the types and schemas are defined, implement the logic in the respective applications (`apps/`) or shared packages (`packages/`).
3. **Pull Request:** All changes must be submitted via a Pull Request (PR) for review.

## 🌿 Branching Strategy

Please ensure you are branching off the correct base branch and naming your branches appropriately:

- `main` — Production-ready code.
- `staging` — Integration testing and pre-production.
- `feature/<feature-name>` — New features or improvements (e.g., `feature/user-profile`).
- `fix/<bug-name>` — Bug fixes (e.g., `fix/header-alignment`).
- `chore/<task-name>` — Maintenance tasks (e.g., `chore/update-dependencies`).

## 📝 Coding Standards

- **Type Safety:** Strictly avoid using `any`. If a type is missing, explicitly define it. We aim for 100% type safety.
- **Components:** Use functional components and follow the Atomic Design pattern within our UI package (`packages/ui`).
- **Linting & Formatting:** Run `pnpm lint` and formatting scripts before committing. We use strict ESLint rules to keep the code clean and consistent.
- **Self-Documentation:** Write code that is easy to read. Variable and function names should be descriptive. Use comments only to explain "Why" a decision was made, not "What" the code is doing.

## 💾 Commit Messages

We strictly follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. This helps us automate changelogs and versioning.

Examples:
- `feat: add new member badge component`
- `fix: resolve hydration error on the home page`
- `docs: update setup instructions in README`
- `chore: bump typescript version to 5.4`

## 🤝 Code Review Process

1. **Self-Review:** Before submitting, review your own code. Have you removed console logs? Is the code clean?
2. **CI/CD:** Ensure all automated CI/CD checks (Lint, Build, Test) are passing on your PR.
3. **Approval:** Every PR requires at least **one approval** from a Core Team member before it can be merged.
4. **Constructive Feedback:** Be respectful and constructive during code reviews. We are all here to learn and build something great together!

---
*Questions? Reach out to the GDG HAU Core Team or the CTO.*
