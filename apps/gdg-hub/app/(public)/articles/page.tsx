import Link from "next/link";
import { listPublicArticleCategories, listPublicArticles } from "@hau/db";

function date(value: string) {
  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "long",
    timeZone: "Asia/Manila",
  }).format(new Date(value));
}

export default async function ArticlesPage() {
  const [articleResult, categoryResult] = await Promise.all([
    listPublicArticles(),
    listPublicArticleCategories(),
  ]);
  const articles = articleResult.data ?? [];
  const categories = categoryResult.data ?? [];
  return (
    <main className="min-h-screen bg-zinc-50 px-5 py-16 dark:bg-zinc-950 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-10">
        <header className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
            GDG on Campus HAU
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">Articles</h1>
          <p className="mt-4 text-base leading-7 text-zinc-600 dark:text-zinc-400">
            Updates, guides, and stories published by the GDG HAU community.
          </p>
        </header>
        {categories.length > 0 && (
          <nav aria-label="Article categories" className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/articles/category/${category.slug}`}
                className="rounded-full border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
              >
                {category.name} ({category.article_count})
              </Link>
            ))}
          </nav>
        )}
        {articleResult.error ? (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-5 text-red-500">
            Articles are temporarily unavailable.
          </p>
        ) : articles.length ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <article
                key={article.id}
                className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
                  {article.category_name}
                </p>
                <h2 className="mt-2 text-xl font-bold">
                  <Link
                    href={`/articles/${article.slug}`}
                    className="hover:text-blue-600"
                  >
                    {article.title}
                  </Link>
                </h2>
                <p className="mt-3 flex-1 text-sm leading-6 text-zinc-500">
                  {article.excerpt}
                </p>
                <p className="mt-5 text-xs text-zinc-500">
                  By {article.author_display_name} ·{" "}
                  {date(article.publication_at)}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-zinc-300 p-10 text-center text-zinc-500 dark:border-zinc-700">
            No articles have been published yet.
          </p>
        )}
      </div>
    </main>
  );
}
