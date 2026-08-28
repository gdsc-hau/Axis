import type { ReactNode } from "react";

function inline(text: string): ReactNode[] {
  const result: ReactNode[] = [];
  const pattern = /\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    result.push(text.slice(cursor, index));
    result.push(
      <a
        key={`${index}-${match[2]}`}
        href={match[2]}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-blue-600 underline dark:text-blue-400"
      >
        {match[1]}
      </a>,
    );
    cursor = index + match[0].length;
  }
  result.push(text.slice(cursor));
  return result;
}

export function ArticleBody({ body }: { body: string }) {
  const lines = body.split(/\r?\n/);
  return (
    <div className="space-y-4 text-base leading-8 text-zinc-700 dark:text-zinc-300">
      {lines.map((line, index) => {
        const value = line.trim();
        if (!value) return <div key={index} className="h-2" aria-hidden />;
        if (value.startsWith("### ")) {
          return (
            <h3
              key={index}
              className="pt-3 text-xl font-bold text-zinc-900 dark:text-white"
            >
              {inline(value.slice(4))}
            </h3>
          );
        }
        if (value.startsWith("## ")) {
          return (
            <h2
              key={index}
              className="pt-5 text-2xl font-bold text-zinc-900 dark:text-white"
            >
              {inline(value.slice(3))}
            </h2>
          );
        }
        if (value.startsWith("# ")) {
          return (
            <h2
              key={index}
              className="pt-5 text-3xl font-bold text-zinc-900 dark:text-white"
            >
              {inline(value.slice(2))}
            </h2>
          );
        }
        if (/^[-*] /.test(value)) {
          return (
            <div key={index} className="flex gap-3">
              <span aria-hidden>•</span>
              <p>{inline(value.slice(2))}</p>
            </div>
          );
        }
        if (value.startsWith("> ")) {
          return (
            <blockquote
              key={index}
              className="border-l-4 border-blue-500 pl-4 italic text-zinc-600 dark:text-zinc-400"
            >
              {inline(value.slice(2))}
            </blockquote>
          );
        }
        return <p key={index}>{inline(value)}</p>;
      })}
    </div>
  );
}
