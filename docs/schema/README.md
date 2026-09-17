# Data and Schema

Supabase PostgreSQL is the authoritative store for member identity, events,
attendance, Gyrocoins, rewards, credentials, content, communications, reports,
settings, and health history.

- [Schema Overview](overview.md) explains data ownership and security rules.
- [Tables](tables.md) groups the important tables by domain.
- [Migrations](migrations.md) is the required process for changing or promoting
  schema, policies, grants, functions, and indexes.

All exposed tables require RLS and least-privilege grants. Shared-project changes
must be reproducible from committed migration history; dashboard edits alone are
not an accepted schema change.
