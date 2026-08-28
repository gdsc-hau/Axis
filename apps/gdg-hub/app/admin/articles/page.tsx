import Link from "next/link";
import { listAdminArticleData } from "@hau/db";
import { CategoryCreateForm, CategoryUpdateForm } from "./ArticleControls";

function date(value: string | null) {
  if (!value) return "Not set";
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

export default async function AdminArticlesPage() {
  const { categories, articles, error } = await listAdminArticleData();
  const statuses = ["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"];

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Articles</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Author, review, schedule, publish, and archive GDG HAU content.
          </p>
        </div>
        <Link
          href="/admin/articles/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
        >
          New article
        </Link>
      </header>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-300">
        Drafts and future scheduled articles are admin-only. A scheduled article
        becomes publicly readable at its configured time without a cron job.
        Every edit and status change records a revision and audit entry.
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-500">
          Article data could not be loaded. Apply and verify the Phase 9
          migration first.
        </div>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-4">
            {statuses.map((status) => (
              <div
                key={status}
                className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  {status}
                </p>
                <p className="mt-2 text-2xl font-bold">
                  {
                    articles.filter((article) => article.status === status)
                      .length
                  }
                </p>
              </div>
            ))}
          </section>

          <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div>
              <h2 className="text-lg font-semibold">Categories</h2>
              <p className="text-sm text-zinc-500">
                Create at least one active category before authoring an article.
              </p>
            </div>
            <CategoryCreateForm />
            {categories.length > 0 && (
              <div className="grid gap-3 lg:grid-cols-2">
                {categories.map((category) => (
                  <CategoryUpdateForm key={category.id} category={category} />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">Content library</h2>
            {articles.length ? (
              articles.map((article) => (
                <article
                  key={article.id}
                  className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold">{article.title}</h3>
                        <span className="rounded-full bg-blue-500/10 px-2 py-1 text-xs font-semibold text-blue-500">
                          {article.status}
                        </span>
                        <span className="text-xs text-zinc-500">
                          revision {article.version}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-zinc-500">
                        /{article.slug} · by {article.author_display_name}
                      </p>
                      <p className="mt-2 text-xs text-zinc-500">
                        Updated {date(article.updated_at)}
                        {article.scheduled_for
                          ? ` · scheduled ${date(article.scheduled_for)}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex gap-3 text-sm font-semibold">
                      <Link
                        href={`/admin/articles/${article.id}/preview`}
                        className="text-zinc-600 hover:underline dark:text-zinc-300"
                      >
                        Preview
                      </Link>
                      <Link
                        href={`/admin/articles/${article.id}/edit`}
                        className="text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Edit
                      </Link>
                    </div>
                  </div>
                </article>
              ))
            ) : (
              <p className="rounded-xl border border-dashed border-zinc-300 p-10 text-center text-sm text-zinc-500 dark:border-zinc-700">
                No articles have been authored yet.
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
