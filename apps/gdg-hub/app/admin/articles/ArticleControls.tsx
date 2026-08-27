"use client";

import { useRef, useState, useTransition } from "react";
import type { ArticleCategoryRow, ArticleRow } from "@hau/db";
import {
  changeCategory,
  createArticle,
  createCategory,
  transitionArticle,
  updateArticle,
} from "./actions";

type Option = { id: string; label: string };
type ActionResult = Record<string, unknown>;
type Message = { kind: "success" | "error"; text: string } | undefined;

const inputClass =
  "mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950";

function useArticleAction() {
  const [message, setMessage] = useState<Message>();
  const [isPending, startTransition] = useTransition();
  function run(
    action: (formData: FormData) => Promise<ActionResult>,
    formData: FormData,
    onSuccess?: (result: ActionResult) => void,
  ) {
    setMessage(undefined);
    startTransition(async () => {
      const result = await action(formData);
      if ("error" in result) {
        setMessage({ kind: "error", text: String(result.error) });
        return;
      }
      setMessage({ kind: "success", text: "Saved." });
      onSuccess?.(result);
    });
  }
  return { message, isPending, run };
}

function Result({ message }: { message: Message }) {
  return (
    <p
      aria-live="polite"
      className={`min-h-4 text-xs ${
        message?.kind === "error" ? "text-red-500" : "text-emerald-600"
      }`}
    >
      {message?.text}
    </p>
  );
}

export function CategoryCreateForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [operationKey, setOperationKey] = useState(() => crypto.randomUUID());
  const action = useArticleAction();
  return (
    <form
      ref={formRef}
      action={(data) =>
        action.run(createCategory, data, () => {
          formRef.current?.reset();
          setOperationKey(crypto.randomUUID());
        })
      }
      className="grid gap-3 md:grid-cols-[1fr_1fr_2fr_auto] md:items-end"
    >
      <input type="hidden" name="operationKey" value={operationKey} />
      <label className="text-xs font-medium">
        Name
        <input
          name="name"
          required
          minLength={2}
          maxLength={100}
          className={inputClass}
        />
      </label>
      <label className="text-xs font-medium">
        Slug
        <input
          name="slug"
          required
          maxLength={80}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          className={inputClass}
        />
      </label>
      <label className="text-xs font-medium">
        Description
        <input name="description" maxLength={500} className={inputClass} />
      </label>
      <button
        disabled={action.isPending}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {action.isPending ? "Creating..." : "Add category"}
      </button>
      <div className="md:col-span-4">
        <Result message={action.message} />
      </div>
    </form>
  );
}

export function CategoryUpdateForm({
  category,
}: {
  category: ArticleCategoryRow;
}) {
  const [operationKey, setOperationKey] = useState(() => crypto.randomUUID());
  const action = useArticleAction();
  return (
    <form
      action={(data) =>
        action.run(changeCategory, data, () =>
          setOperationKey(crypto.randomUUID()),
        )
      }
      className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800"
    >
      <input type="hidden" name="categoryId" value={category.id} />
      <input type="hidden" name="expectedVersion" value={category.version} />
      <input type="hidden" name="operationKey" value={operationKey} />
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs font-medium">
          Name
          <input
            name="name"
            defaultValue={category.name}
            required
            className={inputClass}
          />
        </label>
        <label className="text-xs font-medium">
          Description
          <input
            name="description"
            defaultValue={category.description ?? ""}
            className={inputClass}
          />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            name="active"
            type="checkbox"
            defaultChecked={category.active}
          />{" "}
          Active
        </label>
        <label className="min-w-64 flex-1 text-xs font-medium">
          Change reason
          <input
            name="reason"
            required
            minLength={5}
            maxLength={500}
            className={inputClass}
          />
        </label>
        <button
          disabled={action.isPending}
          className="rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold disabled:opacity-60 dark:border-zinc-700"
        >
          Update
        </button>
      </div>
      <Result message={action.message} />
    </form>
  );
}

export function ArticleEditor({
  article,
  categories,
  events,
}: {
  article?: ArticleRow;
  categories: ArticleCategoryRow[];
  events: Option[];
}) {
  const [operationKey] = useState(() => crypto.randomUUID());
  const action = useArticleAction();
  const editing = Boolean(article);
  return (
    <form
      action={(data) =>
        action.run(editing ? updateArticle : createArticle, data)
      }
      className="space-y-5"
    >
      {article && <input type="hidden" name="articleId" value={article.id} />}
      {article && (
        <input type="hidden" name="expectedVersion" value={article.version} />
      )}
      <input type="hidden" name="operationKey" value={operationKey} />
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="text-sm font-medium">
          Title
          <input
            name="title"
            defaultValue={article?.title}
            required
            maxLength={160}
            className={inputClass}
          />
        </label>
        <label className="text-sm font-medium">
          Slug
          <input
            name="slug"
            defaultValue={article?.slug}
            required
            maxLength={120}
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            className={inputClass}
          />
        </label>
      </div>
      <label className="block text-sm font-medium">
        Excerpt
        <textarea
          name="excerpt"
          defaultValue={article?.excerpt}
          required
          minLength={20}
          maxLength={500}
          rows={3}
          className={inputClass}
        />
      </label>
      <label className="block text-sm font-medium">
        Article body (Markdown text)
        <textarea
          name="bodyMarkdown"
          defaultValue={article?.body_markdown}
          required
          minLength={50}
          maxLength={50000}
          rows={18}
          className={`${inputClass} font-mono`}
        />
        <span className="mt-1 block text-xs font-normal text-zinc-500">
          Raw HTML is displayed as text. Use headings beginning with #, lists
          beginning with - or *, links, and plain paragraphs.
        </span>
      </label>
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="text-sm font-medium">
          Category
          <select
            name="categoryId"
            defaultValue={article?.category_id}
            required
            className={inputClass}
          >
            <option value="">Select category</option>
            {categories
              .filter((item) => item.active || item.id === article?.category_id)
              .map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
          </select>
        </label>
        <label className="text-sm font-medium">
          Related event (optional)
          <select
            name="relatedEventId"
            defaultValue={article?.related_event_id ?? ""}
            className={inputClass}
          >
            <option value="">No related event</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block text-sm font-medium">
        Featured image HTTPS URL (optional)
        <input
          name="featuredImageUrl"
          type="url"
          defaultValue={article?.featured_image_url ?? ""}
          maxLength={1000}
          className={inputClass}
        />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input
          name="featured"
          type="checkbox"
          defaultChecked={article?.featured ?? false}
        />{" "}
        Feature this article in public listings
      </label>
      <div className="grid gap-4 lg:grid-cols-2">
        <label className="text-sm font-medium">
          SEO title (optional)
          <input
            name="seoTitle"
            defaultValue={article?.seo_title ?? ""}
            maxLength={160}
            className={inputClass}
          />
        </label>
        <label className="text-sm font-medium">
          SEO description (optional)
          <textarea
            name="seoDescription"
            defaultValue={article?.seo_description ?? ""}
            maxLength={320}
            rows={2}
            className={inputClass}
          />
        </label>
      </div>
      {editing && (
        <label className="block text-sm font-medium">
          Edit reason
          <input
            name="reason"
            required
            minLength={5}
            maxLength={500}
            className={inputClass}
          />
        </label>
      )}
      <div className="flex items-center gap-4">
        <button
          disabled={
            action.isPending ||
            !categories.some((item) => item.active) ||
            article?.status === "ARCHIVED"
          }
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {action.isPending
            ? "Saving..."
            : article?.status === "ARCHIVED"
              ? "Restore to draft before editing"
              : editing
                ? "Save revision"
                : "Create draft"}
        </button>
        <Result message={action.message} />
      </div>
    </form>
  );
}

export function ArticleStatusControl({ article }: { article: ArticleRow }) {
  const statusOptions: Array<{ value: ArticleRow["status"]; label: string }> =
    article.status === "ARCHIVED"
      ? [{ value: "DRAFT", label: "Restore to draft" }]
      : [
          ...(article.status === "DRAFT"
            ? []
            : [{ value: "DRAFT" as const, label: "Return to draft" }]),
          ...(article.status === "SCHEDULED"
            ? []
            : [{ value: "SCHEDULED" as const, label: "Schedule" }]),
          ...(article.status === "PUBLISHED"
            ? []
            : [{ value: "PUBLISHED" as const, label: "Publish now" }]),
          { value: "ARCHIVED", label: "Archive" },
        ];
  const [targetStatus, setTargetStatus] = useState<ArticleRow["status"]>(
    statusOptions[0]?.value ?? "DRAFT",
  );
  const [operationKey] = useState(() => crypto.randomUUID());
  const action = useArticleAction();
  return (
    <form
      action={(data) => action.run(transitionArticle, data)}
      className="space-y-3"
    >
      <input type="hidden" name="articleId" value={article.id} />
      <input type="hidden" name="expectedVersion" value={article.version} />
      <input type="hidden" name="operationKey" value={operationKey} />
      <label className="block text-sm font-medium">
        Next state
        <select
          name="targetStatus"
          value={targetStatus}
          onChange={(event) =>
            setTargetStatus(event.target.value as ArticleRow["status"])
          }
          className={inputClass}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {targetStatus === "SCHEDULED" && (
        <label className="block text-sm font-medium">
          Publication time
          <input
            name="scheduledFor"
            type="datetime-local"
            required
            className={inputClass}
          />
        </label>
      )}
      <label className="block text-sm font-medium">
        Status-change reason
        <input
          name="reason"
          required
          minLength={5}
          maxLength={500}
          className={inputClass}
        />
      </label>
      <button
        disabled={action.isPending}
        className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
      >
        {action.isPending ? "Applying..." : "Apply status"}
      </button>
      <Result message={action.message} />
    </form>
  );
}
