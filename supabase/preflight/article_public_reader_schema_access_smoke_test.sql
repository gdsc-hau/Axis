-- Transaction-free anonymous-role smoke test for Phase 9 public readers.
-- It performs reads only and leaves no data behind.

BEGIN;

SET LOCAL ROLE anon;

WITH reader_calls AS MATERIALIZED (
  SELECT
    (SELECT count(*) FROM public.list_public_articles(NULL, 100)) AS article_count,
    (SELECT count(*) FROM public.list_public_article_categories()) AS category_count,
    (SELECT count(*) FROM public.get_public_article(
      'phase-9-article-acceptance'
    )) AS acceptance_article_count
)
SELECT
  'article_public_reader_anonymous_smoke_test'::TEXT AS check_name,
  true AS passed,
  format(
    'anonymous RPC execution succeeded; public articles=%s; categories=%s; acceptance article matches=%s',
    article_count,
    category_count,
    acceptance_article_count
  ) AS details
FROM reader_calls;

RESET ROLE;

ROLLBACK;
