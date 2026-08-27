-- Phase 9: administrator-owned article authoring and public publishing.
-- Article content is stored as Markdown text and rendered without raw HTML.

BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '2min';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM supabase_migrations.schema_migrations
    WHERE version = '20260826004121'
  ) THEN
    RAISE EXCEPTION 'Phase 8 communications policy cleanup must be deployed first';
  END IF;

  IF to_regclass('public.article_categories') IS NOT NULL
     OR to_regclass('public.article_category_revisions') IS NOT NULL
     OR to_regclass('public.articles') IS NOT NULL
     OR to_regclass('public.article_revisions') IS NOT NULL
     OR to_regclass('public.article_status_history') IS NOT NULL THEN
    RAISE EXCEPTION 'Phase 9 article objects already exist outside migration history';
  END IF;
END
$$;

CREATE TABLE public.article_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL DEFAULT 1,
  create_operation_key UUID NOT NULL UNIQUE,
  created_by UUID NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
  updated_by UUID NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT article_categories_slug_check CHECK (
    slug = lower(btrim(slug))
    AND char_length(slug) BETWEEN 2 AND 80
    AND slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  CONSTRAINT article_categories_name_check CHECK (
    name = btrim(name) AND char_length(name) BETWEEN 2 AND 100
  ),
  CONSTRAINT article_categories_description_check CHECK (
    description IS NULL OR (
      description = btrim(description)
      AND char_length(description) BETWEEN 1 AND 500
    )
  ),
  CONSTRAINT article_categories_version_check CHECK (version >= 1),
  CONSTRAINT article_categories_timestamp_check CHECK (updated_at >= created_at)
);

CREATE TABLE public.article_category_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL
    REFERENCES public.article_categories(id) ON DELETE RESTRICT,
  revision_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL,
  actor_id UUID NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  operation_key UUID NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT article_category_revisions_identity_key
    UNIQUE (category_id, revision_number),
  CONSTRAINT article_category_revisions_number_check CHECK (revision_number >= 1),
  CONSTRAINT article_category_revisions_name_check CHECK (
    name = btrim(name) AND char_length(name) BETWEEN 2 AND 100
  ),
  CONSTRAINT article_category_revisions_description_check CHECK (
    description IS NULL OR (
      description = btrim(description)
      AND char_length(description) BETWEEN 1 AND 500
    )
  ),
  CONSTRAINT article_category_revisions_reason_check CHECK (
    reason = btrim(reason) AND char_length(reason) BETWEEN 5 AND 500
  )
);

CREATE TABLE public.articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  body_markdown TEXT NOT NULL,
  category_id UUID NOT NULL
    REFERENCES public.article_categories(id) ON DELETE RESTRICT,
  related_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  featured_image_url TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  seo_title TEXT,
  seo_description TEXT,
  author_id UUID NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
  author_display_name TEXT NOT NULL,
  updated_by UUID NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
  version INTEGER NOT NULL DEFAULT 1,
  create_operation_key UUID NOT NULL UNIQUE,
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT articles_slug_check CHECK (
    slug = lower(btrim(slug))
    AND char_length(slug) BETWEEN 2 AND 120
    AND slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'
  ),
  CONSTRAINT articles_title_check CHECK (
    title = btrim(title) AND char_length(title) BETWEEN 3 AND 160
  ),
  CONSTRAINT articles_excerpt_check CHECK (
    excerpt = btrim(excerpt) AND char_length(excerpt) BETWEEN 20 AND 500
  ),
  CONSTRAINT articles_body_check CHECK (
    body_markdown = btrim(body_markdown)
    AND char_length(body_markdown) BETWEEN 50 AND 50000
  ),
  CONSTRAINT articles_image_url_check CHECK (
    featured_image_url IS NULL OR (
      featured_image_url = btrim(featured_image_url)
      AND char_length(featured_image_url) BETWEEN 12 AND 1000
      AND featured_image_url ~ '^https://[^[:space:]]+$'
    )
  ),
  CONSTRAINT articles_status_check CHECK (
    status IN ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED')
  ),
  CONSTRAINT articles_seo_title_check CHECK (
    seo_title IS NULL OR (
      seo_title = btrim(seo_title) AND char_length(seo_title) BETWEEN 3 AND 160
    )
  ),
  CONSTRAINT articles_seo_description_check CHECK (
    seo_description IS NULL OR (
      seo_description = btrim(seo_description)
      AND char_length(seo_description) BETWEEN 20 AND 320
    )
  ),
  CONSTRAINT articles_author_name_check CHECK (
    author_display_name = btrim(author_display_name)
    AND char_length(author_display_name) BETWEEN 2 AND 200
  ),
  CONSTRAINT articles_version_check CHECK (version >= 1),
  CONSTRAINT articles_status_timestamps_check CHECK (
    (status = 'DRAFT'
      AND scheduled_for IS NULL AND published_at IS NULL AND archived_at IS NULL)
    OR (status = 'SCHEDULED'
      AND scheduled_for IS NOT NULL AND published_at IS NULL AND archived_at IS NULL)
    OR (status = 'PUBLISHED'
      AND scheduled_for IS NULL AND published_at IS NOT NULL AND archived_at IS NULL)
    OR (status = 'ARCHIVED'
      AND scheduled_for IS NULL AND archived_at IS NOT NULL)
  ),
  CONSTRAINT articles_timestamp_check CHECK (
    updated_at >= created_at
    AND (published_at IS NULL OR published_at >= created_at)
    AND (archived_at IS NULL OR archived_at >= created_at)
  )
);

CREATE TABLE public.article_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE RESTRICT,
  revision_number INTEGER NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  body_markdown TEXT NOT NULL,
  category_id UUID NOT NULL
    REFERENCES public.article_categories(id) ON DELETE RESTRICT,
  related_event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  featured_image_url TEXT,
  featured BOOLEAN NOT NULL,
  seo_title TEXT,
  seo_description TEXT,
  actor_id UUID NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  operation_key UUID NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT article_revisions_identity_key UNIQUE (article_id, revision_number),
  CONSTRAINT article_revisions_number_check CHECK (revision_number >= 1),
  CONSTRAINT article_revisions_reason_check CHECK (
    reason = btrim(reason) AND char_length(reason) BETWEEN 5 AND 500
  )
);

CREATE TABLE public.article_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.articles(id) ON DELETE RESTRICT,
  from_status TEXT,
  to_status TEXT NOT NULL,
  scheduled_for TIMESTAMPTZ,
  actor_id UUID NOT NULL REFERENCES public.members(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  operation_key UUID NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  CONSTRAINT article_status_history_from_check CHECK (
    from_status IS NULL OR from_status IN ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED')
  ),
  CONSTRAINT article_status_history_to_check CHECK (
    to_status IN ('DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED')
  ),
  CONSTRAINT article_status_history_reason_check CHECK (
    reason = btrim(reason) AND char_length(reason) BETWEEN 5 AND 500
  ),
  CONSTRAINT article_status_history_schedule_check CHECK (
    (to_status = 'SCHEDULED' AND scheduled_for IS NOT NULL)
    OR (to_status <> 'SCHEDULED' AND scheduled_for IS NULL)
  )
);

CREATE INDEX article_categories_active_name_idx
  ON public.article_categories(active, name, id);
CREATE INDEX article_category_revisions_category_idx
  ON public.article_category_revisions(category_id, revision_number DESC);
CREATE INDEX articles_admin_status_updated_idx
  ON public.articles(status, updated_at DESC, id DESC);
CREATE INDEX articles_category_status_publication_idx
  ON public.articles(category_id, status, published_at DESC, scheduled_for DESC, id DESC);
CREATE INDEX articles_public_published_idx
  ON public.articles(published_at DESC, id DESC)
  WHERE status = 'PUBLISHED';
CREATE INDEX articles_public_scheduled_idx
  ON public.articles(scheduled_for DESC, id DESC)
  WHERE status = 'SCHEDULED';
CREATE INDEX articles_related_event_idx
  ON public.articles(related_event_id)
  WHERE related_event_id IS NOT NULL;
CREATE INDEX articles_author_idx ON public.articles(author_id, created_at DESC);
CREATE INDEX articles_updated_by_idx ON public.articles(updated_by);
CREATE INDEX article_revisions_article_idx
  ON public.article_revisions(article_id, revision_number DESC);
CREATE INDEX article_revisions_category_idx ON public.article_revisions(category_id);
CREATE INDEX article_revisions_event_idx
  ON public.article_revisions(related_event_id)
  WHERE related_event_id IS NOT NULL;
CREATE INDEX article_revisions_actor_idx
  ON public.article_revisions(actor_id, created_at DESC);
CREATE INDEX article_status_history_article_idx
  ON public.article_status_history(article_id, created_at DESC, id DESC);
CREATE INDEX article_status_history_actor_idx
  ON public.article_status_history(actor_id, created_at DESC);

ALTER TABLE public.article_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_category_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.article_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY article_categories_admin_read ON public.article_categories
  FOR SELECT TO authenticated USING ((SELECT public.is_admin()));
CREATE POLICY article_category_revisions_admin_read
  ON public.article_category_revisions
  FOR SELECT TO authenticated USING ((SELECT public.is_admin()));
CREATE POLICY articles_admin_read ON public.articles
  FOR SELECT TO authenticated USING ((SELECT public.is_admin()));
CREATE POLICY article_revisions_admin_read ON public.article_revisions
  FOR SELECT TO authenticated USING ((SELECT public.is_admin()));
CREATE POLICY article_status_history_admin_read ON public.article_status_history
  FOR SELECT TO authenticated USING ((SELECT public.is_admin()));

REVOKE ALL ON TABLE public.article_categories,
  public.article_category_revisions, public.articles,
  public.article_revisions, public.article_status_history
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.article_categories,
  public.article_category_revisions, public.articles,
  public.article_revisions, public.article_status_history
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.article_is_public(
  p_status TEXT,
  p_scheduled_for TIMESTAMPTZ,
  p_published_at TIMESTAMPTZ,
  p_archived_at TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT p_archived_at IS NULL AND (
    (p_status = 'PUBLISHED' AND p_published_at <= pg_catalog.now())
    OR (p_status = 'SCHEDULED' AND p_scheduled_for <= pg_catalog.now())
  )
$$;

CREATE OR REPLACE FUNCTION private.create_article_category(
  p_slug TEXT,
  p_name TEXT,
  p_description TEXT,
  p_operation_key UUID
)
RETURNS public.article_categories
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID := private.require_active_admin();
  existing public.article_categories;
  created public.article_categories;
BEGIN
  SELECT * INTO existing
  FROM public.article_categories
  WHERE create_operation_key = p_operation_key;
  IF existing.id IS NOT NULL THEN
    IF existing.slug = lower(btrim(p_slug))
       AND existing.name = btrim(p_name)
       AND existing.description IS NOT DISTINCT FROM NULLIF(btrim(p_description), '') THEN
      RETURN existing;
    END IF;
    RAISE EXCEPTION 'Category operation key was already used with different values'
      USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.article_categories(
    slug, name, description, create_operation_key, created_by, updated_by
  ) VALUES (
    lower(btrim(p_slug)), btrim(p_name), NULLIF(btrim(p_description), ''),
    p_operation_key, actor_id, actor_id
  ) RETURNING * INTO created;

  INSERT INTO public.article_category_revisions(
    category_id, revision_number, name, description, active,
    actor_id, reason, operation_key
  ) VALUES (
    created.id, 1, created.name, created.description, created.active,
    actor_id, 'Initial category creation', p_operation_key
  );

  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    actor_id, 'ARTICLE_CATEGORY_CREATED', 'article_category', created.id::TEXT,
    jsonb_build_object('slug', created.slug, 'operation_key', p_operation_key)
  );
  RETURN created;
END
$$;

CREATE OR REPLACE FUNCTION private.update_article_category(
  p_category_id UUID,
  p_expected_version INTEGER,
  p_name TEXT,
  p_description TEXT,
  p_active BOOLEAN,
  p_reason TEXT,
  p_operation_key UUID
)
RETURNS public.article_categories
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID := private.require_active_admin();
  category_row public.article_categories;
  prior_revision public.article_category_revisions;
  normalized_reason TEXT := btrim(p_reason);
BEGIN
  SELECT * INTO prior_revision
  FROM public.article_category_revisions
  WHERE operation_key = p_operation_key;
  IF prior_revision.id IS NOT NULL THEN
    IF prior_revision.category_id <> p_category_id
       OR prior_revision.name <> btrim(p_name)
       OR prior_revision.description IS DISTINCT FROM NULLIF(btrim(p_description), '')
       OR prior_revision.active <> p_active
       OR prior_revision.reason <> normalized_reason THEN
      RAISE EXCEPTION 'Category operation key was already used with different values'
        USING ERRCODE = '23505';
    END IF;
    SELECT * INTO category_row FROM public.article_categories WHERE id = p_category_id;
    RETURN category_row;
  END IF;

  SELECT * INTO category_row
  FROM public.article_categories
  WHERE id = p_category_id
  FOR UPDATE;
  IF category_row.id IS NULL THEN RAISE EXCEPTION 'Article category not found'; END IF;
  IF category_row.version <> p_expected_version THEN
    RAISE EXCEPTION 'Article category was changed by another administrator';
  END IF;
  IF NOT p_active AND category_row.active AND EXISTS (
    SELECT 1 FROM public.articles AS article
    WHERE article.category_id = p_category_id
      AND private.article_is_public(
        article.status, article.scheduled_for,
        article.published_at, article.archived_at
      )
  ) THEN
    RAISE EXCEPTION 'Archive public articles before disabling their category';
  END IF;

  UPDATE public.article_categories
  SET name = btrim(p_name), description = NULLIF(btrim(p_description), ''),
      active = p_active, version = version + 1, updated_by = actor_id,
      updated_at = pg_catalog.clock_timestamp()
  WHERE id = p_category_id
  RETURNING * INTO category_row;

  INSERT INTO public.article_category_revisions(
    category_id, revision_number, name, description, active,
    actor_id, reason, operation_key
  ) VALUES (
    category_row.id, category_row.version, category_row.name,
    category_row.description, category_row.active, actor_id,
    normalized_reason, p_operation_key
  );

  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    actor_id, 'ARTICLE_CATEGORY_UPDATED', 'article_category', category_row.id::TEXT,
    jsonb_build_object(
      'slug', category_row.slug, 'version', category_row.version,
      'active', category_row.active, 'reason', normalized_reason,
      'operation_key', p_operation_key
    )
  );
  RETURN category_row;
END
$$;

CREATE OR REPLACE FUNCTION private.create_content_article(
  p_slug TEXT,
  p_title TEXT,
  p_excerpt TEXT,
  p_body_markdown TEXT,
  p_category_id UUID,
  p_related_event_id UUID,
  p_featured_image_url TEXT,
  p_featured BOOLEAN,
  p_seo_title TEXT,
  p_seo_description TEXT,
  p_operation_key UUID
)
RETURNS public.articles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  actor_id UUID := private.require_active_admin();
  actor_name TEXT;
  existing public.articles;
  created public.articles;
BEGIN
  SELECT * INTO existing FROM public.articles
  WHERE create_operation_key = p_operation_key;
  IF existing.id IS NOT NULL THEN
    IF existing.slug = lower(btrim(p_slug))
       AND existing.title = btrim(p_title)
       AND existing.excerpt = btrim(p_excerpt)
       AND existing.body_markdown = btrim(p_body_markdown)
       AND existing.category_id = p_category_id
       AND existing.related_event_id IS NOT DISTINCT FROM p_related_event_id
       AND existing.featured_image_url IS NOT DISTINCT FROM NULLIF(btrim(p_featured_image_url), '')
       AND existing.featured = p_featured
       AND existing.seo_title IS NOT DISTINCT FROM NULLIF(btrim(p_seo_title), '')
       AND existing.seo_description IS NOT DISTINCT FROM NULLIF(btrim(p_seo_description), '') THEN
      RETURN existing;
    END IF;
    RAISE EXCEPTION 'Article operation key was already used with different values'
      USING ERRCODE = '23505';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.article_categories
    WHERE id = p_category_id AND active
  ) THEN
    RAISE EXCEPTION 'Select an active article category';
  END IF;
  IF p_related_event_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.events WHERE id = p_related_event_id
  ) THEN
    RAISE EXCEPTION 'Related event not found';
  END IF;

  SELECT full_name INTO actor_name FROM public.members WHERE id = actor_id;
  INSERT INTO public.articles(
    slug, title, excerpt, body_markdown, category_id, related_event_id,
    featured_image_url, featured, seo_title, seo_description,
    author_id, author_display_name, updated_by, create_operation_key
  ) VALUES (
    lower(btrim(p_slug)), btrim(p_title), btrim(p_excerpt), btrim(p_body_markdown),
    p_category_id, p_related_event_id, NULLIF(btrim(p_featured_image_url), ''),
    p_featured, NULLIF(btrim(p_seo_title), ''),
    NULLIF(btrim(p_seo_description), ''), actor_id, actor_name, actor_id,
    p_operation_key
  ) RETURNING * INTO created;

  INSERT INTO public.article_revisions(
    article_id, revision_number, slug, title, excerpt, body_markdown,
    category_id, related_event_id, featured_image_url, featured,
    seo_title, seo_description, actor_id, reason, operation_key
  ) VALUES (
    created.id, created.version, created.slug, created.title, created.excerpt,
    created.body_markdown, created.category_id, created.related_event_id,
    created.featured_image_url, created.featured, created.seo_title,
    created.seo_description, actor_id, 'Initial article draft', p_operation_key
  );
  INSERT INTO public.article_status_history(
    article_id, from_status, to_status, scheduled_for,
    actor_id, reason, operation_key
  ) VALUES (
    created.id, NULL, 'DRAFT', NULL, actor_id,
    'Initial article draft', p_operation_key
  );
  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    actor_id, 'ARTICLE_CREATED', 'article', created.id::TEXT,
    jsonb_build_object('slug', created.slug, 'operation_key', p_operation_key)
  );
  RETURN created;
END
$$;

CREATE OR REPLACE FUNCTION private.update_content_article(
  p_article_id UUID,
  p_expected_version INTEGER,
  p_slug TEXT,
  p_title TEXT,
  p_excerpt TEXT,
  p_body_markdown TEXT,
  p_category_id UUID,
  p_related_event_id UUID,
  p_featured_image_url TEXT,
  p_featured BOOLEAN,
  p_seo_title TEXT,
  p_seo_description TEXT,
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
  prior_revision public.article_revisions;
  normalized_slug TEXT := lower(btrim(p_slug));
  normalized_reason TEXT := btrim(p_reason);
BEGIN
  SELECT * INTO prior_revision FROM public.article_revisions
  WHERE operation_key = p_operation_key;
  IF prior_revision.id IS NOT NULL THEN
    IF prior_revision.article_id <> p_article_id
       OR prior_revision.slug <> normalized_slug
       OR prior_revision.title <> btrim(p_title)
       OR prior_revision.excerpt <> btrim(p_excerpt)
       OR prior_revision.body_markdown <> btrim(p_body_markdown)
       OR prior_revision.category_id <> p_category_id
       OR prior_revision.related_event_id IS DISTINCT FROM p_related_event_id
       OR prior_revision.featured_image_url IS DISTINCT FROM NULLIF(btrim(p_featured_image_url), '')
       OR prior_revision.featured <> p_featured
       OR prior_revision.seo_title IS DISTINCT FROM NULLIF(btrim(p_seo_title), '')
       OR prior_revision.seo_description IS DISTINCT FROM NULLIF(btrim(p_seo_description), '')
       OR prior_revision.reason <> normalized_reason THEN
      RAISE EXCEPTION 'Article operation key was already used with different values'
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
  IF article_row.status = 'ARCHIVED' THEN
    RAISE EXCEPTION 'Restore the archived article to draft before editing';
  END IF;
  IF normalized_slug <> article_row.slug AND article_row.status <> 'DRAFT' THEN
    RAISE EXCEPTION 'Only draft article slugs may be changed';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.article_categories
    WHERE id = p_category_id AND active
  ) THEN
    RAISE EXCEPTION 'Select an active article category';
  END IF;
  IF p_related_event_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.events WHERE id = p_related_event_id
  ) THEN
    RAISE EXCEPTION 'Related event not found';
  END IF;

  UPDATE public.articles
  SET slug = normalized_slug, title = btrim(p_title), excerpt = btrim(p_excerpt),
      body_markdown = btrim(p_body_markdown), category_id = p_category_id,
      related_event_id = p_related_event_id,
      featured_image_url = NULLIF(btrim(p_featured_image_url), ''),
      featured = p_featured, seo_title = NULLIF(btrim(p_seo_title), ''),
      seo_description = NULLIF(btrim(p_seo_description), ''),
      updated_by = actor_id, version = version + 1,
      updated_at = pg_catalog.clock_timestamp()
  WHERE id = p_article_id
  RETURNING * INTO article_row;

  INSERT INTO public.article_revisions(
    article_id, revision_number, slug, title, excerpt, body_markdown,
    category_id, related_event_id, featured_image_url, featured,
    seo_title, seo_description, actor_id, reason, operation_key
  ) VALUES (
    article_row.id, article_row.version, article_row.slug, article_row.title,
    article_row.excerpt, article_row.body_markdown, article_row.category_id,
    article_row.related_event_id, article_row.featured_image_url,
    article_row.featured, article_row.seo_title, article_row.seo_description,
    actor_id, normalized_reason, p_operation_key
  );
  INSERT INTO public.audit_logs(actor_id, action, entity_type, entity_id, metadata)
  VALUES (
    actor_id, 'ARTICLE_CONTENT_UPDATED', 'article', article_row.id::TEXT,
    jsonb_build_object(
      'slug', article_row.slug, 'version', article_row.version,
      'reason', normalized_reason, 'operation_key', p_operation_key
    )
  );
  RETURN article_row;
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
        WHEN target_status = 'PUBLISHED' THEN pg_catalog.clock_timestamp()
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

CREATE OR REPLACE FUNCTION private.list_public_articles(
  p_category_slug TEXT,
  p_limit INTEGER
)
RETURNS TABLE (
  id UUID, slug TEXT, title TEXT, excerpt TEXT, category_slug TEXT,
  category_name TEXT, featured_image_url TEXT, featured BOOLEAN,
  author_display_name TEXT, publication_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT article.id, article.slug, article.title, article.excerpt,
    category.slug, category.name, article.featured_image_url, article.featured,
    article.author_display_name,
    CASE WHEN article.status = 'PUBLISHED'
      THEN article.published_at ELSE article.scheduled_for END,
    article.updated_at
  FROM public.articles AS article
  JOIN public.article_categories AS category ON category.id = article.category_id
  WHERE category.active
    AND private.article_is_public(
      article.status, article.scheduled_for,
      article.published_at, article.archived_at
    )
    AND (NULLIF(lower(btrim(p_category_slug)), '') IS NULL
      OR category.slug = lower(btrim(p_category_slug)))
  ORDER BY article.featured DESC,
    CASE WHEN article.status = 'PUBLISHED'
      THEN article.published_at ELSE article.scheduled_for END DESC,
    article.id DESC
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 30), 1), 100)
$$;

CREATE OR REPLACE FUNCTION private.get_public_article(p_slug TEXT)
RETURNS TABLE (
  id UUID, slug TEXT, title TEXT, excerpt TEXT, body_markdown TEXT,
  category_slug TEXT, category_name TEXT, featured_image_url TEXT,
  author_display_name TEXT, publication_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  seo_title TEXT, seo_description TEXT, related_event_id UUID,
  related_event_title TEXT, related_event_url TEXT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT article.id, article.slug, article.title, article.excerpt,
    article.body_markdown, category.slug, category.name,
    article.featured_image_url, article.author_display_name,
    CASE WHEN article.status = 'PUBLISHED'
      THEN article.published_at ELSE article.scheduled_for END,
    article.updated_at, article.seo_title, article.seo_description,
    event.id, event.title, event.source_url
  FROM public.articles AS article
  JOIN public.article_categories AS category ON category.id = article.category_id
  LEFT JOIN public.events AS event ON event.id = article.related_event_id
  WHERE article.slug = lower(btrim(p_slug))
    AND category.active
    AND private.article_is_public(
      article.status, article.scheduled_for,
      article.published_at, article.archived_at
    )
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION private.list_public_article_categories()
RETURNS TABLE (
  id UUID, slug TEXT, name TEXT, description TEXT, article_count BIGINT
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT category.id, category.slug, category.name, category.description,
    count(article.id) AS article_count
  FROM public.article_categories AS category
  JOIN public.articles AS article ON article.category_id = category.id
  WHERE category.active
    AND private.article_is_public(
      article.status, article.scheduled_for,
      article.published_at, article.archived_at
    )
  GROUP BY category.id, category.slug, category.name, category.description
  ORDER BY category.name, category.id
$$;

CREATE FUNCTION public.create_article_category(
  p_slug TEXT, p_name TEXT, p_description TEXT, p_operation_key UUID
)
RETURNS public.article_categories LANGUAGE SQL SECURITY INVOKER SET search_path = ''
AS $$ SELECT private.create_article_category(p_slug, p_name, p_description, p_operation_key) $$;

CREATE FUNCTION public.update_article_category(
  p_category_id UUID, p_expected_version INTEGER, p_name TEXT,
  p_description TEXT, p_active BOOLEAN, p_reason TEXT, p_operation_key UUID
)
RETURNS public.article_categories LANGUAGE SQL SECURITY INVOKER SET search_path = ''
AS $$ SELECT private.update_article_category(
  p_category_id, p_expected_version, p_name, p_description,
  p_active, p_reason, p_operation_key
) $$;

CREATE FUNCTION public.create_content_article(
  p_slug TEXT, p_title TEXT, p_excerpt TEXT, p_body_markdown TEXT,
  p_category_id UUID, p_related_event_id UUID, p_featured_image_url TEXT,
  p_featured BOOLEAN, p_seo_title TEXT, p_seo_description TEXT,
  p_operation_key UUID
)
RETURNS public.articles LANGUAGE SQL SECURITY INVOKER SET search_path = ''
AS $$ SELECT private.create_content_article(
  p_slug, p_title, p_excerpt, p_body_markdown, p_category_id,
  p_related_event_id, p_featured_image_url, p_featured,
  p_seo_title, p_seo_description, p_operation_key
) $$;

CREATE FUNCTION public.update_content_article(
  p_article_id UUID, p_expected_version INTEGER, p_slug TEXT, p_title TEXT,
  p_excerpt TEXT, p_body_markdown TEXT, p_category_id UUID,
  p_related_event_id UUID, p_featured_image_url TEXT, p_featured BOOLEAN,
  p_seo_title TEXT, p_seo_description TEXT, p_reason TEXT, p_operation_key UUID
)
RETURNS public.articles LANGUAGE SQL SECURITY INVOKER SET search_path = ''
AS $$ SELECT private.update_content_article(
  p_article_id, p_expected_version, p_slug, p_title, p_excerpt,
  p_body_markdown, p_category_id, p_related_event_id,
  p_featured_image_url, p_featured, p_seo_title, p_seo_description,
  p_reason, p_operation_key
) $$;

CREATE FUNCTION public.transition_content_article(
  p_article_id UUID, p_expected_version INTEGER, p_target_status TEXT,
  p_scheduled_for TIMESTAMPTZ, p_reason TEXT, p_operation_key UUID
)
RETURNS public.articles LANGUAGE SQL SECURITY INVOKER SET search_path = ''
AS $$ SELECT private.transition_content_article(
  p_article_id, p_expected_version, p_target_status,
  p_scheduled_for, p_reason, p_operation_key
) $$;

CREATE FUNCTION public.list_public_articles(
  p_category_slug TEXT DEFAULT NULL, p_limit INTEGER DEFAULT 30
)
RETURNS TABLE (
  id UUID, slug TEXT, title TEXT, excerpt TEXT, category_slug TEXT,
  category_name TEXT, featured_image_url TEXT, featured BOOLEAN,
  author_display_name TEXT, publication_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
)
LANGUAGE SQL STABLE SECURITY INVOKER SET search_path = ''
AS $$ SELECT * FROM private.list_public_articles(p_category_slug, p_limit) $$;

CREATE FUNCTION public.get_public_article(p_slug TEXT)
RETURNS TABLE (
  id UUID, slug TEXT, title TEXT, excerpt TEXT, body_markdown TEXT,
  category_slug TEXT, category_name TEXT, featured_image_url TEXT,
  author_display_name TEXT, publication_at TIMESTAMPTZ, updated_at TIMESTAMPTZ,
  seo_title TEXT, seo_description TEXT, related_event_id UUID,
  related_event_title TEXT, related_event_url TEXT
)
LANGUAGE SQL STABLE SECURITY INVOKER SET search_path = ''
AS $$ SELECT * FROM private.get_public_article(p_slug) $$;

CREATE FUNCTION public.list_public_article_categories()
RETURNS TABLE (
  id UUID, slug TEXT, name TEXT, description TEXT, article_count BIGINT
)
LANGUAGE SQL STABLE SECURITY INVOKER SET search_path = ''
AS $$ SELECT * FROM private.list_public_article_categories() $$;

REVOKE ALL ON FUNCTION private.article_is_public(TEXT, TIMESTAMPTZ, TIMESTAMPTZ, TIMESTAMPTZ)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.create_article_category(TEXT, TEXT, TEXT, UUID)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.update_article_category(UUID, INTEGER, TEXT, TEXT, BOOLEAN, TEXT, UUID)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.create_content_article(TEXT, TEXT, TEXT, TEXT, UUID, UUID, TEXT, BOOLEAN, TEXT, TEXT, UUID)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.update_content_article(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, UUID, UUID, TEXT, BOOLEAN, TEXT, TEXT, TEXT, UUID)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.transition_content_article(UUID, INTEGER, TEXT, TIMESTAMPTZ, TEXT, UUID)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.list_public_articles(TEXT, INTEGER)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.get_public_article(TEXT)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION private.list_public_article_categories()
  FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION private.create_article_category(TEXT, TEXT, TEXT, UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION private.update_article_category(UUID, INTEGER, TEXT, TEXT, BOOLEAN, TEXT, UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION private.create_content_article(TEXT, TEXT, TEXT, TEXT, UUID, UUID, TEXT, BOOLEAN, TEXT, TEXT, UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION private.update_content_article(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, UUID, UUID, TEXT, BOOLEAN, TEXT, TEXT, TEXT, UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION private.transition_content_article(UUID, INTEGER, TEXT, TIMESTAMPTZ, TEXT, UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION private.list_public_articles(TEXT, INTEGER)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.get_public_article(TEXT)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.list_public_article_categories()
  TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.create_article_category(TEXT, TEXT, TEXT, UUID)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.update_article_category(UUID, INTEGER, TEXT, TEXT, BOOLEAN, TEXT, UUID)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.create_content_article(TEXT, TEXT, TEXT, TEXT, UUID, UUID, TEXT, BOOLEAN, TEXT, TEXT, UUID)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.update_content_article(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, UUID, UUID, TEXT, BOOLEAN, TEXT, TEXT, TEXT, UUID)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.transition_content_article(UUID, INTEGER, TEXT, TIMESTAMPTZ, TEXT, UUID)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.list_public_articles(TEXT, INTEGER)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_public_article(TEXT)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.list_public_article_categories()
  FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.create_article_category(TEXT, TEXT, TEXT, UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_article_category(UUID, INTEGER, TEXT, TEXT, BOOLEAN, TEXT, UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_content_article(TEXT, TEXT, TEXT, TEXT, UUID, UUID, TEXT, BOOLEAN, TEXT, TEXT, UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_content_article(UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, UUID, UUID, TEXT, BOOLEAN, TEXT, TEXT, TEXT, UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.transition_content_article(UUID, INTEGER, TEXT, TIMESTAMPTZ, TEXT, UUID)
  TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_public_articles(TEXT, INTEGER)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_article(TEXT)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.list_public_article_categories()
  TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
