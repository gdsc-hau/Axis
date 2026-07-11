# Apps

## `apps/gdg-hub`

The primary application surface for public, member, and admin functionality.

Route groups currently include:

- `(public)` for landing pages, about, community, events, contact, FAQ, merch, articles, and products
- `(auth)` for login, signup, and verification entry points
- `member/` for dashboards, profile, rewards, leaderboard, notifications, settings, wallet, and event detail views
- `admin/` for dashboards, members, events, articles, reports, products, rewards, and gyrocoin management
- `api/` for server-side workflows such as attendance, certificates, leaderboard rebuilds, Luma sync, and redemptions

## `apps/gdg-id`

A separate app focused on the GDG ID experience and supporting routes.

Use this app for identity-specific pages and scans rather than the community hub workflows.
