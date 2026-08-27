import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CreateArticleCategorySchema,
  CreateContentArticleSchema,
  TransitionContentArticleSchema,
} from "../packages/contracts/src/index.ts";

const operationKey = "a1190000-0000-4000-8000-000000000001";

test("article contracts normalize safe draft content", () => {
  const category = CreateArticleCategorySchema.parse({
    slug: "  Community-News  ",
    name: "Community News",
    description: "",
    operationKey,
  });
  assert.equal(category.slug, "community-news");
  assert.equal(category.description, null);

  const article = CreateContentArticleSchema.parse({
    slug: "phase-9-update",
    title: "Phase 9 update",
    excerpt: "A sufficiently detailed public article excerpt.",
    bodyMarkdown:
      "# Phase 9\n\nThis article body is deliberately longer than fifty characters.",
    categoryId: "a1190000-0000-4000-8000-000000000002",
    relatedEventId: "",
    featuredImageUrl: "",
    featured: true,
    seoTitle: "",
    seoDescription: "",
    operationKey,
  });
  assert.equal(article.relatedEventId, null);
  assert.equal(article.featuredImageUrl, null);
});

test("article contracts reject unsafe URLs and invalid scheduling", () => {
  const base = {
    slug: "phase-9-update",
    title: "Phase 9 update",
    excerpt: "A sufficiently detailed public article excerpt.",
    bodyMarkdown:
      "# Phase 9\n\nThis article body is deliberately longer than fifty characters.",
    categoryId: "a1190000-0000-4000-8000-000000000002",
    relatedEventId: "",
    featured: false,
    seoTitle: "",
    seoDescription: "",
    operationKey,
  };
  assert.equal(
    CreateContentArticleSchema.safeParse({
      ...base,
      featuredImageUrl: "javascript:alert(1)",
    }).success,
    false,
  );
  assert.equal(
    TransitionContentArticleSchema.safeParse({
      articleId: "a1190000-0000-4000-8000-000000000002",
      expectedVersion: 1,
      targetStatus: "SCHEDULED",
      scheduledFor: "",
      reason: "Schedule this article",
      operationKey,
    }).success,
    false,
  );
});

test("article migration keeps writes audited and public reads projected", () => {
  const migration = readFileSync(
    new URL(
      "../supabase/migrations/20260826014432_article_content_publishing.sql",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(migration, /ENABLE ROW LEVEL SECURITY/g);
  assert.match(migration, /REVOKE ALL ON TABLE public\.article_categories/);
  assert.match(migration, /private\.require_active_admin\(\)/);
  assert.match(migration, /ARTICLE_CONTENT_UPDATED/);
  assert.match(migration, /CREATE FUNCTION public\.get_public_article/);
  assert.doesNotMatch(
    migration
      .match(
        /RETURNS TABLE \([\s\S]*?\)\nLANGUAGE SQL\nSTABLE\nSECURITY DEFINER/g,
      )
      ?.at(-2) ?? "",
    /author_id|operation_key|updated_by/,
  );
});

test("article publication timestamp matches the public visibility clock", () => {
  const correction = readFileSync(
    new URL(
      "../supabase/migrations/20260826060920_article_publication_timestamp_consistency.sql",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(
    correction,
    /WHEN target_status = 'PUBLISHED' THEN pg_catalog\.now\(\)/,
  );
  assert.doesNotMatch(
    correction,
    /WHEN target_status = 'PUBLISHED' THEN pg_catalog\.clock_timestamp\(\)/,
  );
  assert.match(correction, /SECURITY DEFINER/);
  assert.match(correction, /SET search_path = ''/);
});

test("anonymous article readers can resolve their private helpers", () => {
  const correction = readFileSync(
    new URL(
      "../supabase/migrations/20260826072424_article_public_reader_schema_access.sql",
      import.meta.url,
    ),
    "utf8",
  );
  const smokeTest = readFileSync(
    new URL(
      "../supabase/preflight/article_public_reader_schema_access_smoke_test.sql",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(correction, /GRANT USAGE ON SCHEMA private TO anon/);
  assert.match(
    correction,
    /GRANT EXECUTE ON FUNCTION private\.list_public_articles\(TEXT, INTEGER\)/,
  );
  assert.match(correction, /REVOKE ALL ON FUNCTION[^;]+FROM PUBLIC/s);
  assert.match(smokeTest, /SET LOCAL ROLE anon/);
  assert.match(smokeTest, /public\.list_public_articles\(NULL, 100\)/);
  assert.match(smokeTest, /public\.list_public_article_categories\(\)/);
});

test("article renderer never enables raw HTML", () => {
  const renderer = readFileSync(
    new URL(
      "../apps/gdg-hub/app/(public)/articles/ArticleBody.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.doesNotMatch(renderer, /dangerouslySetInnerHTML/);
});

test("article mutations finish through native Server Action redirects", () => {
  const controls = readFileSync(
    new URL(
      "../apps/gdg-hub/app/admin/articles/ArticleControls.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  const actions = readFileSync(
    new URL("../apps/gdg-hub/app/admin/articles/actions.ts", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(controls, /router\.refresh\(\)/);
  assert.doesNotMatch(controls, /window\.location/);
  assert.match(actions, /import \{ redirect \} from "next\/navigation"/);
  assert.equal(
    actions.match(/redirect\(`\/admin\/articles\/\$\{data\.id\}\/edit`\)/g)
      ?.length,
    3,
  );
});
