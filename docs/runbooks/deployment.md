# Deployment Runbook

The applications are designed for Vercel and Supabase. This repository does not
currently contain a checked-in CI workflow, so confirm the deployment integration
in the hosting dashboards rather than assuming migrations run automatically.

## Vercel Frontend Deployment

Vercel is linked to the GitHub repository. Whenever code is pushed or merged into the `main` branch, Vercel automatically:

1. Detects the Turborepo setup.
2. Builds `@hau/*` packages.
3. Builds `apps/gdg-hub` and `apps/gdg-id`.
4. Deploys them to the production domains.

### Environment Variables

Production environment variables are managed directly in the Vercel Dashboard. They contain the live Supabase Project URL and Anon Keys.

## Supabase Backend Deployment

Database migrations must be reviewed with `supabase db push --dry-run` and applied
through an approved CI workflow or by an authorized operator.

> [!IMPORTANT]
> Never apply a production migration without a backup, a reviewed dry run, and a rollback plan.

## Rollbacks

If a deployment breaks production:

1. **Frontend:** Go to the Vercel dashboard and click "Promote to Production" on the previous stable deployment.
2. **Database:** Create an emergency hotfix PR that includes a "down migration" to revert the schema change, or use the Supabase Studio dashboard in extreme emergencies.
