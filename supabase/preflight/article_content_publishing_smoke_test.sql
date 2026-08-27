-- Transactional hosted smoke test for Phase 9 article publishing.
-- Creates an audited category and article lifecycle, then rolls everything back.

BEGIN;

SELECT set_config(
  'request.jwt.claim.sub',
  (
    SELECT auth_id::TEXT
    FROM public.members
    WHERE member_status = 'ACTIVE'
      AND role = 'ADMIN'
      AND auth_id IS NOT NULL
    ORDER BY created_at, id
    LIMIT 1
  ),
  TRUE
);

SET LOCAL ROLE authenticated;

DO $article_operations$
DECLARE
  category_record public.article_categories;
  repeated_category public.article_categories;
  article_record public.articles;
  repeated_article public.articles;
  public_record RECORD;
  direct_write_rejected BOOLEAN := FALSE;
  stale_update_rejected BOOLEAN := FALSE;
BEGIN
  IF public.current_member_id() IS NULL OR NOT (SELECT public.is_admin()) THEN
    RAISE EXCEPTION 'A linked active administrator is required';
  END IF;

  SELECT * INTO category_record
  FROM public.create_article_category(
    'phase-9-smoke', 'Phase 9 Smoke',
    'Rollback-only article category',
    'a1190000-0000-4000-8000-000000000001'
  );
  SELECT * INTO repeated_category
  FROM public.create_article_category(
    'phase-9-smoke', 'Phase 9 Smoke',
    'Rollback-only article category',
    'a1190000-0000-4000-8000-000000000001'
  );
  IF repeated_category.id <> category_record.id THEN
    RAISE EXCEPTION 'Category creation was not idempotent';
  END IF;

  SELECT * INTO article_record
  FROM public.create_content_article(
    'phase-9-smoke-article', 'Phase 9 smoke article',
    'This draft proves the secure article lifecycle works.',
    '# Phase 9 smoke article

This rollback-only body is deliberately longer than fifty characters.',
    category_record.id, NULL, NULL, TRUE,
    'Phase 9 smoke article',
    'This description verifies safe public article projection.',
    'a1190000-0000-4000-8000-000000000002'
  );
  SELECT * INTO repeated_article
  FROM public.create_content_article(
    'phase-9-smoke-article', 'Phase 9 smoke article',
    'This draft proves the secure article lifecycle works.',
    '# Phase 9 smoke article

This rollback-only body is deliberately longer than fifty characters.',
    category_record.id, NULL, NULL, TRUE,
    'Phase 9 smoke article',
    'This description verifies safe public article projection.',
    'a1190000-0000-4000-8000-000000000002'
  );
  IF repeated_article.id <> article_record.id THEN
    RAISE EXCEPTION 'Article creation was not idempotent';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.list_public_articles(NULL, 100)
    WHERE slug = article_record.slug
  ) THEN
    RAISE EXCEPTION 'A draft article was publicly visible';
  END IF;

  SELECT * INTO article_record
  FROM public.update_content_article(
    article_record.id, article_record.version,
    article_record.slug, 'Phase 9 updated smoke article',
    article_record.excerpt,
    article_record.body_markdown || E'\n\nThis sentence records revision two.',
    article_record.category_id, NULL, NULL, TRUE,
    article_record.seo_title, article_record.seo_description,
    'Verify content revision history',
    'a1190000-0000-4000-8000-000000000003'
  );

  BEGIN
    PERFORM public.update_content_article(
      article_record.id, 1, article_record.slug, article_record.title,
      article_record.excerpt, article_record.body_markdown,
      article_record.category_id, NULL, NULL, TRUE,
      article_record.seo_title, article_record.seo_description,
      'Attempt a stale update',
      'a1190000-0000-4000-8000-000000000004'
    );
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%changed by another administrator%' THEN
      stale_update_rejected := TRUE;
    ELSE
      RAISE;
    END IF;
  END;
  IF NOT stale_update_rejected THEN
    RAISE EXCEPTION 'Optimistic concurrency did not reject a stale edit';
  END IF;

  SELECT * INTO article_record
  FROM public.transition_content_article(
    article_record.id, article_record.version, 'SCHEDULED',
    pg_catalog.clock_timestamp() + INTERVAL '1 hour',
    'Verify future publication visibility',
    'a1190000-0000-4000-8000-000000000005'
  );
  IF EXISTS (
    SELECT 1 FROM public.list_public_articles(NULL, 100)
    WHERE slug = article_record.slug
  ) THEN
    RAISE EXCEPTION 'A future scheduled article was publicly visible';
  END IF;

  SELECT * INTO article_record
  FROM public.transition_content_article(
    article_record.id, article_record.version, 'PUBLISHED', NULL,
    'Publish for public projection test',
    'a1190000-0000-4000-8000-000000000006'
  );
  SELECT * INTO public_record
  FROM public.get_public_article(article_record.slug);
  IF public_record.id IS NULL OR public_record.title <> article_record.title THEN
    RAISE EXCEPTION 'Published article was not publicly readable';
  END IF;

  SELECT * INTO article_record
  FROM public.transition_content_article(
    article_record.id, article_record.version, 'ARCHIVED', NULL,
    'Remove smoke article from public access',
    'a1190000-0000-4000-8000-000000000007'
  );
  IF EXISTS (
    SELECT 1 FROM public.get_public_article(article_record.slug)
  ) THEN
    RAISE EXCEPTION 'Archived article remained publicly visible';
  END IF;

  PERFORM public.update_article_category(
    category_record.id, category_record.version,
    category_record.name, category_record.description, FALSE,
    'Disable category after article archive',
    'a1190000-0000-4000-8000-000000000008'
  );

  BEGIN
    INSERT INTO public.articles(
      slug, title, excerpt, body_markdown, category_id,
      author_id, author_display_name, updated_by, create_operation_key
    ) VALUES (
      'forbidden-direct-write', 'Forbidden direct write',
      'This direct write must never be accepted by the database.',
      'This direct write body is intentionally long enough for validation.',
      category_record.id, public.current_member_id(), 'Forbidden',
      public.current_member_id(),
      'a1190000-0000-4000-8000-000000000009'
    );
  EXCEPTION WHEN insufficient_privilege THEN
    direct_write_rejected := TRUE;
  END;
  IF NOT direct_write_rejected THEN
    RAISE EXCEPTION 'Authenticated direct article insertion was allowed';
  END IF;

  IF (SELECT count(*) FROM public.article_revisions
      WHERE article_id = article_record.id) <> 2 THEN
    RAISE EXCEPTION 'Article content revision history is incomplete';
  END IF;
  IF (SELECT count(*) FROM public.article_status_history
      WHERE article_id = article_record.id) <> 4 THEN
    RAISE EXCEPTION 'Article status history is incomplete';
  END IF;
  IF (SELECT count(*) FROM public.audit_logs
      WHERE entity_id = article_record.id::TEXT
        AND action IN (
          'ARTICLE_CREATED', 'ARTICLE_CONTENT_UPDATED',
          'ARTICLE_STATUS_CHANGED'
        )) <> 5 THEN
    RAISE EXCEPTION 'Article audit history is incomplete';
  END IF;
END
$article_operations$;

ROLLBACK;

SELECT
  'article_content_publishing_transactional_smoke_test'::TEXT AS check_name,
  TRUE AS passed,
  'category, draft privacy, revision, stale edit, schedule, publish, archive, audit, idempotency, and write-denial assertions passed; fixtures rolled back'::TEXT AS details;
