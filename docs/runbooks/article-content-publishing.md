# Phase 9 article content publishing

Phase 9 replaces the article placeholders with an administrator-owned content
workflow. Articles are not imported from GDG Community: Axis is the source of
truth for this content.

## Content lifecycle

Every new article begins as `DRAFT`. An administrator can then:

- schedule it for a future date and time;
- publish it immediately;
- return a scheduled or published article to draft;
- archive it so it is no longer public; or
- restore an archived article to draft before editing or publishing it again.

Scheduled articles become public when `scheduled_for <= now()`. The public read
function evaluates this condition at request time, so no separate service, cron
job, or deployment worker is required.

## Administrator operation

1. Open `/admin/articles`.
2. Create at least one active category. Category slugs are permanent.
3. Open **New article** and save the content as a draft.
4. Use `/admin/articles/[articleId]/preview` to review the placeholder rendering.
5. Return to the editor, make revisions with an edit reason, and save.
6. Use **Publication controls** to schedule, publish, unpublish, or archive it.

The article author is snapshotted from the active administrator's authoritative
`members.full_name`. It cannot be supplied by the browser. Content edits use
optimistic concurrency: if another administrator changes a record, the stale
form is rejected and must be refreshed.

Categories cannot be disabled while they contain a currently public article.
Archive those articles first.

## Public operation

- `/articles` lists only published articles and scheduled articles whose time
  has arrived.
- `/articles/[slug]` displays a single public article.
- `/articles/category/[slug]` filters the public list by active category.
- Drafts, future schedules, and archived articles return no public data.

The public RPC projection excludes administrator IDs, operation keys, revision
history, and audit metadata. Article Markdown is rendered without raw HTML.
External links and featured images must use HTTPS.

## Audit and recovery

Content revisions and status history are immutable append-only records. Every
category creation/update, article creation/update, and status transition also
creates an `audit_logs` entry. Operation keys make safe retries idempotent.

Phase 9 does not permanently delete categories, articles, revisions, or status
history. Archive content instead.

## Hosted rollout

1. In the Supabase SQL Editor, run
   `supabase/preflight/article_content_publishing_preflight.sql`. Every check
   must pass.
2. In Git Bash, run `npx supabase db push --dry-run`. Confirm the only pending
   migrations are `20260826014432_article_content_publishing.sql` and
   `20260826060920_article_publication_timestamp_consistency.sql`, followed by
   `20260826072424_article_public_reader_schema_access.sql` as applicable to the
   current installation.
3. Run `npx supabase db push` and approve the migrations displayed by the dry
   run. If correcting an existing Phase 9 installation, first run
   `supabase/preflight/article_publication_timestamp_consistency_preflight.sql`
   and then
   `supabase/preflight/article_public_reader_schema_access_preflight.sql`.
4. In the SQL Editor, run
   `supabase/preflight/article_publication_timestamp_consistency_verify.sql`,
   `supabase/preflight/article_public_reader_schema_access_verify.sql`,
   followed by `supabase/preflight/article_content_publishing_verify.sql`.
   Every check must pass.
5. Run
   `supabase/preflight/article_content_publishing_smoke_test.sql`, followed by
   `supabase/preflight/article_public_reader_schema_access_smoke_test.sql`.
   Both final rows must pass; article smoke-test writes are rolled back and the
   anonymous reader smoke test performs no writes.
6. Restart the local Hub if it was already running, then test the admin and
   public flows on `http://localhost:3001`.

No Vercel deployment, invitation sending, or email delivery is
part of this rollout.
