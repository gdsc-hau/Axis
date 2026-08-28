import "server-only";
import type { Database } from "./database.types";
import { createServerClientInstance } from "./server";

export type ArticleCategoryRow =
  Database["public"]["Tables"]["article_categories"]["Row"];
export type ArticleRow = Database["public"]["Tables"]["articles"]["Row"];
export type ArticleRevisionRow =
  Database["public"]["Tables"]["article_revisions"]["Row"];
export type ArticleStatusHistoryRow =
  Database["public"]["Tables"]["article_status_history"]["Row"];
export type PublicArticleSummary =
  Database["public"]["Functions"]["list_public_articles"]["Returns"][number];
export type PublicArticle =
  Database["public"]["Functions"]["get_public_article"]["Returns"][number];

export async function listAdminArticleData() {
  const supabase = await createServerClientInstance();
  const [categoriesResult, articlesResult] = await Promise.all([
    supabase
      .from("article_categories")
      .select("*")
      .order("name", { ascending: true }),
    supabase
      .from("articles")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(100),
  ]);
  return {
    categories: (categoriesResult.data ?? []) as ArticleCategoryRow[],
    articles: (articlesResult.data ?? []) as ArticleRow[],
    error: categoriesResult.error ?? articlesResult.error,
  };
}

export async function getAdminArticle(articleId: string) {
  const supabase = await createServerClientInstance();
  const [articleResult, categoriesResult, revisionsResult, historyResult] =
    await Promise.all([
      supabase.from("articles").select("*").eq("id", articleId).maybeSingle(),
      supabase
        .from("article_categories")
        .select("*")
        .order("name", { ascending: true }),
      supabase
        .from("article_revisions")
        .select("*")
        .eq("article_id", articleId)
        .order("revision_number", { ascending: false })
        .limit(20),
      supabase
        .from("article_status_history")
        .select("*")
        .eq("article_id", articleId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
  return {
    article: (articleResult.data as ArticleRow | null) ?? null,
    categories: (categoriesResult.data ?? []) as ArticleCategoryRow[],
    revisions: (revisionsResult.data ?? []) as ArticleRevisionRow[],
    history: (historyResult.data ?? []) as ArticleStatusHistoryRow[],
    error:
      articleResult.error ??
      categoriesResult.error ??
      revisionsResult.error ??
      historyResult.error,
  };
}

export async function createArticleCategory(args: {
  slug: string;
  name: string;
  description: string | null;
  operationKey: string;
}) {
  const supabase = await createServerClientInstance();
  return supabase.rpc("create_article_category", {
    p_slug: args.slug,
    p_name: args.name,
    p_description: args.description,
    p_operation_key: args.operationKey,
  });
}

export async function updateArticleCategory(args: {
  categoryId: string;
  expectedVersion: number;
  name: string;
  description: string | null;
  active: boolean;
  reason: string;
  operationKey: string;
}) {
  const supabase = await createServerClientInstance();
  return supabase.rpc("update_article_category", {
    p_category_id: args.categoryId,
    p_expected_version: args.expectedVersion,
    p_name: args.name,
    p_description: args.description,
    p_active: args.active,
    p_reason: args.reason,
    p_operation_key: args.operationKey,
  });
}

export type ArticleContentInput = {
  slug: string;
  title: string;
  excerpt: string;
  bodyMarkdown: string;
  categoryId: string;
  relatedEventId: string | null;
  featuredImageUrl: string | null;
  featured: boolean;
  seoTitle: string | null;
  seoDescription: string | null;
};

export async function createContentArticle(
  args: ArticleContentInput & { operationKey: string },
) {
  const supabase = await createServerClientInstance();
  return supabase.rpc("create_content_article", articleContentArgs(args));
}

export async function updateContentArticle(
  args: ArticleContentInput & {
    articleId: string;
    expectedVersion: number;
    reason: string;
    operationKey: string;
  },
) {
  const supabase = await createServerClientInstance();
  return supabase.rpc("update_content_article", {
    p_article_id: args.articleId,
    p_expected_version: args.expectedVersion,
    ...articleContentArgs(args),
    p_reason: args.reason,
  });
}

function articleContentArgs(
  args: ArticleContentInput & { operationKey: string },
) {
  return {
    p_slug: args.slug,
    p_title: args.title,
    p_excerpt: args.excerpt,
    p_body_markdown: args.bodyMarkdown,
    p_category_id: args.categoryId,
    p_related_event_id: args.relatedEventId,
    p_featured_image_url: args.featuredImageUrl,
    p_featured: args.featured,
    p_seo_title: args.seoTitle,
    p_seo_description: args.seoDescription,
    p_operation_key: args.operationKey,
  };
}

export async function transitionContentArticle(args: {
  articleId: string;
  expectedVersion: number;
  targetStatus: "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";
  scheduledFor: string | null;
  reason: string;
  operationKey: string;
}) {
  const supabase = await createServerClientInstance();
  return supabase.rpc("transition_content_article", {
    p_article_id: args.articleId,
    p_expected_version: args.expectedVersion,
    p_target_status: args.targetStatus,
    p_scheduled_for: args.scheduledFor,
    p_reason: args.reason,
    p_operation_key: args.operationKey,
  });
}

export async function listPublicArticles(categorySlug: string | null = null) {
  const supabase = await createServerClientInstance();
  return supabase.rpc("list_public_articles", {
    p_category_slug: categorySlug,
    p_limit: 100,
  });
}

export async function getPublicArticle(slug: string) {
  const supabase = await createServerClientInstance();
  const result = await supabase.rpc("get_public_article", { p_slug: slug });
  return {
    data: (result.data?.[0] as PublicArticle | undefined) ?? null,
    error: result.error,
  };
}

export async function listPublicArticleCategories() {
  const supabase = await createServerClientInstance();
  return supabase.rpc("list_public_article_categories");
}
