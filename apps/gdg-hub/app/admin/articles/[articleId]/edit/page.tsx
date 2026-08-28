import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleIdSchema } from "@hau/contracts";
import { getAdminArticle, listAdminEvents } from "@hau/db";
import { ArticleEditor, ArticleStatusControl } from "../../ArticleControls";

export default async function EditArticlePage({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  const articleId = (await params).articleId;
  if (!ArticleIdSchema.safeParse(articleId).success) notFound();
  const [data, eventResult] = await Promise.all([
    getAdminArticle(articleId),
    listAdminEvents(),
  ]);
  if (!data.article) notFound();
  const events = (eventResult.data ?? []).map((event) => ({
    id: event.id,
    label: event.title,
  }));
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/articles"
            className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
          >
            ← Back to articles
          </Link>
          <h1 className="mt-3 text-2xl font-bold">Edit {data.article.title}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Current state: {data.article.status} · revision{" "}
            {data.article.version}
          </p>
        </div>
        <Link
          href={`/admin/articles/${data.article.id}/preview`}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold dark:border-zinc-700"
        >
          Preview
        </Link>
      </header>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
        <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <ArticleEditor
            article={data.article}
            categories={data.categories}
            events={events}
          />
        </section>
        <aside className="space-y-5">
          <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="mb-3 text-lg font-semibold">Publication controls</h2>
            <ArticleStatusControl article={data.article} />
          </section>
          <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h2 className="text-lg font-semibold">Status history</h2>
            <div className="mt-3 space-y-3 text-xs text-zinc-500">
              {data.history.map((entry) => (
                <div
                  key={entry.id}
                  className="border-l-2 border-zinc-300 pl-3 dark:border-zinc-700"
                >
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {entry.from_status ?? "NEW"} → {entry.to_status}
                  </p>
                  <p>{entry.reason}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
