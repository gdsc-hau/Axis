import Link from "next/link";
import { notFound } from "next/navigation";
import { listPublicArticleCategories, listPublicArticles } from "@hau/db";

export default async function ArticleCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const slug = (await params).slug;
  const [articleResult, categoryResult] = await Promise.all([
    listPublicArticles(slug),
    listPublicArticleCategories(),
  ]);
  const category = (categoryResult.data ?? []).find(
    (item) => item.slug === slug,
  );
  if (!category) notFound();
  const articles = articleResult.data ?? [];
  return (
    <main className="min-h-screen bg-zinc-50 px-5 py-16 dark:bg-zinc-950 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <header>
          <Link
            href="/articles"
            className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
          >
            ← All articles
          </Link>
          <h1 className="mt-4 text-4xl font-bold">{category.name}</h1>
          {category.description && (
            <p className="mt-3 text-zinc-500">{category.description}</p>
          )}
        </header>
        <div className="space-y-4">
          {articles.map((article) => (
            <article
              key={article.id}
              className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <h2 className="text-xl font-bold">
                <Link
                  href={`/articles/${article.slug}`}
                  className="hover:text-blue-600"
                >
                  {article.title}
                </Link>
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                {article.excerpt}
              </p>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
