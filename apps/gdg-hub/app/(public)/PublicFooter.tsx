import Link from "next/link";
import { SUPPORT_EMAIL_HREF } from "@/lib/site";

export function PublicFooter() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-zinc-600 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8 dark:text-zinc-400">
        <p>GDG on Campus Holy Angel University</p>
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          <Link
            href="/events"
            className="hover:text-zinc-950 dark:hover:text-white"
          >
            Events
          </Link>
          <Link
            href="/articles"
            className="hover:text-zinc-950 dark:hover:text-white"
          >
            Articles
          </Link>
          <a
            href={SUPPORT_EMAIL_HREF}
            className="hover:text-zinc-950 dark:hover:text-white"
          >
            Contact support
          </a>
        </div>
      </div>
    </footer>
  );
}
