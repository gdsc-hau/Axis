# Supabase Migrations

We manage all database schema changes through **Supabase Migrations**. This ensures that the local database, staging, and production are always perfectly synchronized.

## Never Mutate Production Manually

> [!WARNING]
> Do **not** use the Supabase Studio UI in production to create tables, add columns, or write SQL directly.
> All changes must be captured in a migration file and checked into Git.

## Creating a Migration

1. **Make changes locally:** You can use the local Supabase Studio (`http://127.0.0.1:54323` when `supabase start` is running) to create tables or columns via the UI.
2. **Generate the migration file:** Once you are happy with the local schema changes, ask the CLI to look at the difference between your local database and the last migration file:
   ```bash
   supabase db diff -f "describe_your_change"
   ```
   This will generate a file like `supabase/migrations/20260711123456_describe_your_change.sql`.
3. **Review the SQL:** Open the generated file and verify it only contains the expected `CREATE TABLE` or `ALTER TABLE` statements.
4. **Commit to Git:** Add this file to your pull request.

## Writing Migrations by Hand

Sometimes it is safer or cleaner to write the SQL by hand:
```bash
supabase migration new "add_new_feature_table"
```
This creates an empty `.sql` file in `supabase/migrations/` for you to write your SQL manually.

## Applying Migrations

- **Locally:** If you pull down a new migration from `main`, run `supabase db reset` or `supabase migration up` to apply it to your local Docker database.
- **Production:** When a PR is merged into the `main` branch, a GitHub Action automatically runs `supabase link` and `supabase db push` to apply the migrations to the live database safely.

## Rollbacks

If a migration fails in production, it usually rolls back automatically (since Supabase wraps migrations in a transaction). If you need to revert a change locally to try again:
```bash
supabase migration down
```
