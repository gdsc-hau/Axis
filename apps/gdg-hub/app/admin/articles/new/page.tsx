import Link from "next/link";
import { listAdminArticleData, listAdminEvents } from "@hau/db";
import { ArticleEditor } from "../ArticleControls";

export default async function NewArticlePage() {
  const [articleData, eventResult] = await Promise.all([
    listAdminArticleData(),
    listAdminEvents(),
  ]);
  const events = (eventResult.data ?? []).map((event) => ({
    id: event.id,
    label: event.title,
  }));
  return (
    <div className="space-y-6">
      <header>
        <Link
          href="/admin/articles"
          className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
        >
          ← Back to articles
        </Link>
        <h1 className="mt-3 text-2xl font-bold">Create article draft</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Creation never publishes automatically. Save the draft, review its
          preview, then choose a publication state.
        </p>
      </header>
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <ArticleEditor categories={articleData.categories} events={events} />
      </section>
    </div>
  );
}
