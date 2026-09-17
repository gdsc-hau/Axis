import Link from "next/link";
import type { EventPeriod } from "@hau/contracts";

const filters: Array<{ value: EventPeriod; label: string }> = [
  { value: "all", label: "All events" },
  { value: "upcoming", label: "Upcoming" },
  { value: "past", label: "Past" },
];

export function EventPeriodFilter({
  basePath,
  period,
}: {
  basePath: string;
  period: EventPeriod;
}) {
  return (
    <nav aria-label="Filter events by date" className="flex flex-wrap gap-2">
      {filters.map((filter) => {
        const active = filter.value === period;
        const href =
          filter.value === "all"
            ? basePath
            : `${basePath}?period=${filter.value}`;
        return (
          <Link
            key={filter.value}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "border-blue-600 bg-blue-600 text-white"
                : "border-zinc-300 text-zinc-600 hover:border-blue-500 hover:text-blue-600 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-blue-400 dark:hover:text-blue-400"
            }`}
          >
            {filter.label}
          </Link>
        );
      })}
    </nav>
  );
}
