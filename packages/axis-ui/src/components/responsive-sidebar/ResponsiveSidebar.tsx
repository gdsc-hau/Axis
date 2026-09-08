"use client";

import { useEffect, useId, useState, type ReactNode } from "react";
import { cn } from "../../utils/cn";

export interface ResponsiveSidebarProps {
  brand: ReactNode;
  navigation: ReactNode;
  footer?: ReactNode;
  mobileLabel?: string;
  className?: string;
}

export function ResponsiveSidebar({
  brand,
  navigation,
  footer,
  mobileLabel = "Toggle navigation",
  className,
}: ResponsiveSidebarProps) {
  const [open, setOpen] = useState(false);
  const sidebarId = useId();

  useEffect(() => {
    if (!open) return;

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-controls={sidebarId}
        aria-expanded={open}
        aria-label={mobileLabel}
        onClick={() => setOpen((current) => !current)}
        className="fixed left-4 top-4 z-50 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 shadow-lg transition-colors hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 md:hidden dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
      >
        <span aria-hidden="true" className="text-xl leading-none">
          {open ? "×" : "☰"}
        </span>
      </button>

      {open && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        id={sidebarId}
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 -translate-x-full flex-col border-r border-zinc-200 bg-white transition-transform duration-200 ease-out md:sticky md:top-0 md:h-screen md:translate-x-0 dark:border-zinc-800 dark:bg-zinc-900",
          open && "translate-x-0",
          !open && "invisible md:visible",
          className,
        )}
      >
        <div className="flex min-h-16 items-center border-b border-zinc-200 px-5 dark:border-zinc-800">
          {brand}
        </div>
        <nav
          aria-label="Primary navigation"
          className="flex-1 overflow-y-auto px-3 py-4"
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("a")) setOpen(false);
          }}
        >
          {navigation}
        </nav>
        {footer && (
          <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
            {footer}
          </div>
        )}
      </aside>
    </>
  );
}
