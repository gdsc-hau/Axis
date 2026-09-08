"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useState } from "react";
import { cn } from "@hau/axis-ui";

const publicNavigation = [
  ["Home", "/"],
  ["Events", "/events"],
  ["Articles", "/articles"],
  ["About", "/about"],
  ["Community", "/community"],
  ["FAQ", "/faq"],
  ["Contact", "/contact"],
] as const;

export function PublicHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuId = useId();

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/95">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="rounded-sm font-bold text-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-white"
        >
          <span className="block text-sm">GDG on Campus HAU</span>
          <span className="block text-xs font-normal text-zinc-500">Axis</span>
        </Link>

        <nav aria-label="Public navigation" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {publicNavigation.map(([label, href]) => {
              const active =
                pathname === href ||
                (href !== "/" && pathname.startsWith(`${href}/`));
              return (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                      active
                        ? "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300"
                        : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white",
                    )}
                  >
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-zinc-950"
          >
            Member login
          </Link>
          <button
            type="button"
            aria-controls={menuId}
            aria-expanded={open}
            aria-label="Toggle public navigation"
            onClick={() => setOpen((current) => !current)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-300 text-xl lg:hidden dark:border-zinc-700"
          >
            <span aria-hidden="true">{open ? "×" : "☰"}</span>
          </button>
        </div>
      </div>

      <nav
        id={menuId}
        aria-label="Mobile public navigation"
        hidden={!open}
        className="border-t border-zinc-200 px-4 py-3 lg:hidden dark:border-zinc-800"
      >
        <ul className="mx-auto max-w-7xl space-y-1">
          {publicNavigation.map(([label, href]) => (
            <li key={href}>
              <Link
                href={href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
