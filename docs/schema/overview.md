# Schema Overview

The data layer is powered by Supabase and PostgreSQL.

## Current schema signals

- Auth and role lookup references the `members` table
- Profile completion checks reference `member_profiles`
- Shared database access comes from `packages/db`
- The repository contains Supabase migrations under [supabase/migrations](../../supabase/migrations)

## Documentation goals

Use this section to explain the schema at a high level, including the major entities and how they support membership, events, rewards, certificates, and governance.
