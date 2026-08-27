-- Keep publication timestamps consistent with the public visibility clock.
--
-- The initial Phase 9 transition helper used clock_timestamp() when publishing,
-- while article_is_public() compares published_at with now(). Because now() is
-- fixed at transaction start, an article published later in the same
-- transaction was temporarily treated as future-dated. Using now() for
-- published_at makes the transition and visibility predicate deterministic.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations
    WHERE version = '20260826014432'
  ) THEN
    RAISE EXCEPTION 'Phase 9 article publishing must be deployed first';
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION private.transition_content_article(
  p_article_id UUID,
  p_expected_version INTEGER,
  p_target_status TEXT,
  p_scheduled_for TIMESTAMPTZ,
  p_reason TEXT,
  p_operation_key UUID
)
RETURNS public.articles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID := private.require_active_admin();
  article_row public.articles;
  prior_history public.article_status_history;
  old_status TEXT;
  target_status TEXT := upper(btrim(p_target_status));
  normalized_reason TEXT := btrim(p_reason);
BEGIN
  SELECT * INTO prior_history FROM public.article_status_history
  WHERE operation_key = p_operation_key;
  IF prior_history.id IS NOT NULL THEN
    IF prior_history.article_id <> p_article_id
       OR prior_history.to_status <> target_status
       OR (
         target_status = 'SCHEDULED'
         AND prior_history.scheduled_for IS DISTINCT FROM p_scheduled_for
       )
       OR (
         target_status <> 'SCHEDULED'
         AND prior_history.scheduled_for IS NOT NULL
       )
       OR prior_history.reason <> normalized_reason THEN
      RAISE EXCEPTION 'Status operation key was already used with different values'
        USING ERRCODE = '23505';
    END IF;
    SELECT * INTO article_row FROM public.articles WHERE id = p_article_id;
    RETURN article_row;
  END IF;

  SELECT * INTO article_row FROM public.articles
  WHERE id = p_article_id FOR UPDATE;
  IF article_row.id IS NULL THEN RAISE EXCEPTION 'Article not found'; END IF;
  IF article_row.version <> p_expected_version THEN
    RAISE EXCEPTION 'Article was changed by another administrator';
  END IF;
  IF target_status NOT IN ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED') THEN
    RAISE EXCEPTION 'Unsupported article status';
  END IF;
  IF target_status = article_row.status THEN
    RAISE EXCEPTION 'Article is already in the requested status';
  END IF;
  IF article_row.status = 'ARCHIVED' AND target_status <> 'DRAFT' THEN
    RAISE EXCEPTION 'Restore the archived article to draft before publishing';
  END IF;
  IF target_status IN ('SCHEDULED', 'PUBLISHED') AND NOT EXISTS (
    SELECT 1 FROM public.article_categories
    WHERE id = article_row.category_id AND active
  ) THEN
    RAISE EXCEPTION 'The article category must be active before publication';
  END IF;
  IF target_status = 'SCHEDULED'
     AND (p_scheduled_for IS NULL OR p_scheduled_for <= pg_catalog.now()) THEN
    RAISE EXCEPTION 'Scheduled publication must be in the future';
  END IF;

  old_status := article_row.status;
  UPDATE public.articles
  SET status = target_status,
      scheduled_for = CASE WHEN target_status = 'SCHEDULED' THEN p_scheduled_for ELSE NULL END,
      published_at = CASE
        WHEN target_status = 'PUBLISHED' THEN pg_catalog.now()
        WHEN target_status = 'ARCHIVED' THEN public.articles.published_at
        ELSE NULL
      END,
      archived_at = CASE
        WHEN target_status = 'ARCHIVED' THEN pg_catalog.clock_timestamp()
        ELSE NULL
      END,
      updated_by = actor_id, version = version + 1,
      updated_at = pg_catalog.clock_timestamp()
  WHERE id = p_article_id
  RETURNING * INTO article_row;

  INSERT INTO public.article_status_history(
    article_id, from_status, to_status, scheduled_for,
    actor_id, reason, operation_key
  ) VALUES (
    article_row.id, old_status, target_status,
    CASE WHEN target_status = 'SCHEDULED' THEN p_scheduled_for ELSE NULL END,
    actor_id, normalized_reason, p_operation_key
  );
  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    actor_id, 'ARTICLE_STATUS_CHANGED', 'article', article_row.id::TEXT,
    jsonb_build_object(
      'from_status', old_status, 'to_status', target_status,
      'scheduled_for', article_row.scheduled_for,
      'version', article_row.version, 'reason', normalized_reason,
      'operation_key', p_operation_key
    )
  );
  RETURN article_row;
END
$$;

REVOKE ALL ON FUNCTION private.transition_content_article(
  UUID, INTEGER, TEXT, TIMESTAMPTZ, TEXT, UUID
) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION private.transition_content_article(
  UUID, INTEGER, TEXT, TIMESTAMPTZ, TEXT, UUID
) TO authenticated;

NOTIFY pgrst, 'reload schema';
