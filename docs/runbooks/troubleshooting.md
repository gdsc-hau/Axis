# Troubleshooting Guide

This document catalogs common issues encountered during local development and their solutions.

## Turborepo Caching Issues

**Symptom:** You made a change in `@hau/axis-ui` or `@hau/db`, but the change isn't reflecting in `gdg-hub` or `gdg-id`.
**Cause:** Turborepo or Next.js might be serving heavily cached build artifacts.
**Solution:**
Delete the `.turbo` and `.next` folders across the workspace.

```bash
pnpm clean
pnpm dev
```

## pnpm Workspace Phantom Dependencies

**Symptom:** `Cannot find module 'X'` when running an app, even though it's installed in the root `package.json`.
**Cause:** pnpm uses strict symlinking. If a package (like `gdg-hub`) requires a dependency, it _must_ be explicitly declared in `apps/gdg-hub/package.json`, not just at the monorepo root.
**Solution:**
Navigate to the app/package and add it:

```bash
pnpm --filter gdg-hub add X
```

## TypeScript Configuration Errors

**Symptom:** VSCode highlights valid code with red squiggly lines, complaining about missing types or paths like `@hau/db`.
**Cause:** The TypeScript language server in VSCode is looking at the wrong `tsconfig.json` or needs to be restarted after a new package was added.
**Solution:**

1. Open the Command Palette in VSCode (`Ctrl+Shift+P` / `Cmd+Shift+P`).
2. Type `TypeScript: Restart TS server` and execute it.

## Supabase Auth Not Working Locally

**Symptom:** You try to sign up or log in locally, and it fails or redirects in an infinite loop.
**Cause:** The `NEXT_PUBLIC_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_ANON_KEY` in your `.env.local` is missing or pointing to production instead of local (`http://127.0.0.1:54321`).
**Solution:**
Run `supabase status`, copy the local URL and Anon Key, and paste them into `.env.local`. Restart the Next.js server.
