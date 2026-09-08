import { LoadingSkeleton } from "@hau/axis-ui";

export default function MemberLoading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6" aria-busy="true">
      <LoadingSkeleton lines={2} className="max-w-xl" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <LoadingSkeleton
            key={index}
            lines={2}
            className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
          />
        ))}
      </div>
      <LoadingSkeleton
        lines={6}
        className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
      />
    </div>
  );
}
