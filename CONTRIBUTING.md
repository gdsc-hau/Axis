# Contributing to GDG HAU ID Platform

Welcome! We are thrilled that you want to contribute to the GDG HAU Digital Hub. To maintain our codebase's integrity and quality, please follow these guidelines.

## 🛠 Development Workflow

We follow a **Contract-First Architecture**. This means we define how data looks before we build the features.

1. **The Contract:** If you are adding a new feature (e.g., "Member Badges"), you must first update the Zod schemas in `packages/database`. This ensures the Backend and Frontend stay in sync.
2. **Implementation:** Once the types are defined, implement the logic in the respective `apps/` or `packages/`.
3. **Pull Request:** All changes must be submitted via a PR.

## 🌿 Branching Strategy
- `main` — Production-ready code.
- `staging` — Integration testing.
- `feature/[name]` — New features or improvements.
- `fix/[name]` — Bug fixes.

## 📝 Coding Standards
- **Type Safety:** Avoid using `any`. If a type is missing, define it.
- **Components:** Use functional components and follow the Atomic Design pattern within our UI package.
- **Linting:** Run `pnpm lint` before committing. We use strict ESLint rules to keep the code clean.
- **Self-Documentation:** Write code that is easy to read. Use comments only to explain "Why," not "What."

## 💾 Commit Messages
We follow [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` A new feature
- `fix:` A bug fix
- `docs:` Documentation changes
- `chore:` Maintenance tasks (dependencies, configs)

## 🤝 Code Review Process
- Every PR requires at least **one approval** from a Core Team member.
- Ensure all CI/CD checks (Lint, Build, Test) are passing.
- Be respectful and constructive in code reviews. We are all here to learn!

---
*Questions? Reach out to the CTO
