import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleIdSchema } from "@hau/contracts";
import { getAdminArticle } from "@hau/db";
import { ArticleBody } from "../../../../(public)/articles/ArticleBody";

export default async function ArticlePreviewPage({
  params,
}: {
  params: Promise<{ articleId: string }>;
}) {
  const articleId = (await params).articleId;
  if (!ArticleIdSchema.safeParse(articleId).success) notFound();
  const { article } = await getAdminArticle(articleId);
  if (!article) notFound();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
        <span>
          Administrative preview · {article.status} · revision {article.version}
        </span>
        <Link
          href={`/admin/articles/${article.id}/edit`}
          className="font-semibold underline"
        >
          Return to editor
        </Link>
      </div>
      <article className="mx-auto max-w-3xl rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900 sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400">
          Preview
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">
          {article.title}
        </h1>
        <p className="mt-4 text-lg text-zinc-500">{article.excerpt}</p>
        <p className="mt-4 text-sm text-zinc-500">
          By {article.author_display_name}
        </p>
        <div className="my-8 border-t border-zinc-200 dark:border-zinc-800" />
        <ArticleBody body={article.body_markdown} />
      </article>
    </div>
  );
}
