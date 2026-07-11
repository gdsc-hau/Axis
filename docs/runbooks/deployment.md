# Deployment Runbook

Our deployment pipeline is highly automated. The frontend applications are hosted on **Vercel**, and the backend is hosted on **Supabase**.

## Vercel Frontend Deployment

Vercel is linked to the GitHub repository. Whenever code is pushed or merged into the `main` branch, Vercel automatically:
1. Detects the Turborepo setup.
2. Builds `@hau/*` packages.
3. Builds `apps/gdg-hub` and `apps/gdg-id`.
4. Deploys them to the production domains.

### Environment Variables
Production environment variables are managed directly in the Vercel Dashboard. They contain the live Supabase Project URL and Anon Keys.

## Supabase Backend Deployment

Database migrations are also automated using GitHub Actions.

When a pull request containing new SQL in `supabase/migrations/` is merged to `main`:
1. The GitHub Action authenticates with Supabase using a deployment token.
2. It runs `supabase db push` against the linked production project.
3. The schema is updated before the Vercel frontend finishes building.

> [!IMPORTANT]
> Never manually run `supabase db push` from your local machine to production unless you are recovering from a critical GitHub Actions failure. Let CI/CD handle it.

## Rollbacks

If a deployment breaks production:
1. **Frontend:** Go to the Vercel dashboard and click "Promote to Production" on the previous stable deployment.
2. **Database:** Create an emergency hotfix PR that includes a "down migration" to revert the schema change, or use the Supabase Studio dashboard in extreme emergencies.
