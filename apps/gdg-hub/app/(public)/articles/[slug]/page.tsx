import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicArticle } from "@hau/db";
import { ArticleBody } from "../ArticleBody";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data } = await getPublicArticle((await params).slug);
  if (!data) return { title: "Article not found" };
  return {
    title: data.seo_title ?? data.title,
    description: data.seo_description ?? data.excerpt,
  };
}

export default async function PublicArticlePage({ params }: Props) {
  const { data: article, error } = await getPublicArticle((await params).slug);
  if (error || !article) notFound();
  const publicationDate = new Intl.DateTimeFormat("en-PH", {
    dateStyle: "long",
    timeZone: "Asia/Manila",
  }).format(new Date(article.publication_at));
  return (
    <main className="min-h-screen bg-zinc-50 px-5 py-16 dark:bg-zinc-950 sm:px-8">
      <article className="mx-auto max-w-3xl">
        <Link
          href="/articles"
          className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400"
        >
          ← All articles
        </Link>
        <Link
          href={`/articles/category/${article.category_slug}`}
          className="mt-8 block text-sm font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400"
        >
          {article.category_name}
        </Link>
        <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
          {article.title}
        </h1>
        <p className="mt-5 text-xl leading-8 text-zinc-600 dark:text-zinc-400">
          {article.excerpt}
        </p>
        <p className="mt-5 text-sm text-zinc-500">
          By {article.author_display_name} · {publicationDate}
        </p>
        {article.featured_image_url && (
          // The URL is administrator-controlled and constrained to HTTPS.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={article.featured_image_url}
            alt=""
            className="mt-8 max-h-[28rem] w-full rounded-2xl object-cover"
          />
        )}
        <div className="my-10 border-t border-zinc-200 dark:border-zinc-800" />
        <ArticleBody body={article.body_markdown} />
        {article.related_event_url && (
          <aside className="mt-12 rounded-xl border border-blue-200 bg-blue-50 p-5 dark:border-blue-500/20 dark:bg-blue-500/10">
            <p className="text-sm font-semibold">Related event</p>
            <a
              href={article.related_event_url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block text-blue-600 underline dark:text-blue-400"
            >
              {article.related_event_title ?? "Open the official GDG event"}
            </a>
          </aside>
        )}
      </article>
    </main>
  );
}
