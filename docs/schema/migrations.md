# Migrations

The repository currently has two migration files:

- [supabase/migrations/0000_initial_schema.sql](../../supabase/migrations/0000_initial_schema.sql)
- [supabase/migrations/20260526000000_init_members.sql](../../supabase/migrations/20260526000000_init_members.sql)

## Migration shape

- `0000_initial_schema.sql` defines the standardized schema for members, profiles, events, rewards, certificates, redemptions, notifications, and audit logs
- `20260526000000_init_members.sql` creates the base `members` table with `student_id`, `email`, `hau_id`, and index support

## Conventions observed in the migrations

- Tables use UUID primary keys
- Timestamps default to `NOW()` or `DEFAULT NOW()`
- Update tracking is handled with a reusable `set_updated_at()` trigger function
- Most foreign keys use `ON DELETE CASCADE` for child records
- Administrative and audit tables use `ON DELETE SET NULL` where preserving history is important

## Notes for future changes

- Keep migration order stable and additive where possible
- If a table is already live, prefer safe `ALTER TABLE IF EXISTS` updates over destructive recreation
- Document any schema dependency in the matching schema page when a migration changes a core relation
