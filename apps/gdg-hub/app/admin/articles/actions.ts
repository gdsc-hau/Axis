"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActiveAdmin } from "@hau/auth";
import {
  CreateArticleCategorySchema,
  CreateContentArticleSchema,
  TransitionContentArticleSchema,
  UpdateArticleCategorySchema,
  UpdateContentArticleSchema,
} from "@hau/contracts";
import {
  createArticleCategory,
  createContentArticle,
  transitionContentArticle,
  updateArticleCategory,
  updateContentArticle,
} from "@hau/db";

function firstIssue(error: { issues: Array<{ message: string }> }) {
  return error.issues[0]?.message ?? "Invalid article request.";
}

function articleFields(formData: FormData) {
  return {
    slug: formData.get("slug"),
    title: formData.get("title"),
    excerpt: formData.get("excerpt"),
    bodyMarkdown: formData.get("bodyMarkdown"),
    categoryId: formData.get("categoryId"),
    relatedEventId: formData.get("relatedEventId") ?? "",
    featuredImageUrl: formData.get("featuredImageUrl") ?? "",
    featured: formData.get("featured") === "on",
    seoTitle: formData.get("seoTitle") ?? "",
    seoDescription: formData.get("seoDescription") ?? "",
  };
}

function databaseMessage(message: string) {
  if (message.includes("articles_slug_key")) {
    return "Another article already uses this slug.";
  }
  if (message.includes("article_categories_slug_key")) {
    return "Another category already uses this slug.";
  }
  if (message.includes("changed by another administrator")) {
    return "This record changed in another session. Refresh before trying again.";
  }
  if (message.includes("future")) return message;
  if (message.includes("active article category")) return message;
  if (message.includes("Archive public articles")) return message;
  if (message.includes("archived article")) return message;
  if (message.includes("Only draft article slugs")) return message;
  return "The article operation could not be completed.";
}

function refreshArticles(slug?: string) {
  revalidatePath("/admin/articles");
  revalidatePath("/articles");
  if (slug) revalidatePath(`/articles/${slug}`);
}

async function requireAdmin() {
  return Boolean(await getActiveAdmin());
}

export async function createCategory(formData: FormData) {
  const parsed = CreateArticleCategorySchema.safeParse({
    slug: formData.get("slug"),
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    operationKey: formData.get("operationKey"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  if (!(await requireAdmin())) {
    return { error: "Active administrator access required." };
  }
  const { data, error } = await createArticleCategory(parsed.data);
  if (error || !data) return { error: databaseMessage(error?.message ?? "") };
  refreshArticles();
  return { success: true, categoryId: data.id };
}

export async function changeCategory(formData: FormData) {
  const parsed = UpdateArticleCategorySchema.safeParse({
    categoryId: formData.get("categoryId"),
    expectedVersion: formData.get("expectedVersion"),
    name: formData.get("name"),
    description: formData.get("description") ?? "",
    active: formData.get("active") === "on",
    reason: formData.get("reason"),
    operationKey: formData.get("operationKey"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  if (!(await requireAdmin())) {
    return { error: "Active administrator access required." };
  }
  const { data, error } = await updateArticleCategory(parsed.data);
  if (error || !data) return { error: databaseMessage(error?.message ?? "") };
  refreshArticles();
  return { success: true, categoryId: data.id };
}

export async function createArticle(formData: FormData) {
  const parsed = CreateContentArticleSchema.safeParse({
    ...articleFields(formData),
    operationKey: formData.get("operationKey"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  if (!(await requireAdmin())) {
    return { error: "Active administrator access required." };
  }
  const { data, error } = await createContentArticle(parsed.data);
  if (error || !data) return { error: databaseMessage(error?.message ?? "") };
  refreshArticles(data.slug);
  redirect(`/admin/articles/${data.id}/edit`);
}

export async function updateArticle(formData: FormData) {
  const parsed = UpdateContentArticleSchema.safeParse({
    ...articleFields(formData),
    articleId: formData.get("articleId"),
    expectedVersion: formData.get("expectedVersion"),
    reason: formData.get("reason"),
    operationKey: formData.get("operationKey"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  if (!(await requireAdmin())) {
    return { error: "Active administrator access required." };
  }
  const { data, error } = await updateContentArticle(parsed.data);
  if (error || !data) return { error: databaseMessage(error?.message ?? "") };
  refreshArticles(data.slug);
  revalidatePath(`/admin/articles/${data.id}/edit`);
  revalidatePath(`/admin/articles/${data.id}/preview`);
  redirect(`/admin/articles/${data.id}/edit`);
}

export async function transitionArticle(formData: FormData) {
  const scheduledLocal = String(formData.get("scheduledFor") ?? "").trim();
  const scheduledDate = scheduledLocal ? new Date(scheduledLocal) : null;
  const scheduledFor =
    scheduledDate && !Number.isNaN(scheduledDate.getTime())
      ? scheduledDate.toISOString()
      : scheduledLocal;
  const parsed = TransitionContentArticleSchema.safeParse({
    articleId: formData.get("articleId"),
    expectedVersion: formData.get("expectedVersion"),
    targetStatus: formData.get("targetStatus"),
    scheduledFor,
    reason: formData.get("reason"),
    operationKey: formData.get("operationKey"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  if (!(await requireAdmin())) {
    return { error: "Active administrator access required." };
  }
  const { data, error } = await transitionContentArticle(parsed.data);
  if (error || !data) return { error: databaseMessage(error?.message ?? "") };
  refreshArticles(data.slug);
  revalidatePath(`/admin/articles/${data.id}/edit`);
  revalidatePath(`/admin/articles/${data.id}/preview`);
  redirect(`/admin/articles/${data.id}/edit`);
}
