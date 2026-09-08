import { LoadingSkeleton } from "@hau/axis-ui";

export default function PublicLoading() {
  return (
    <div
      className="mx-auto max-w-7xl space-y-8 px-4 py-12 sm:px-6 lg:px-8"
      aria-busy="true"
    >
      <LoadingSkeleton lines={3} className="max-w-2xl" />
      <div className="grid gap-6 md:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <LoadingSkeleton
            key={index}
            lines={5}
            className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
          />
        ))}
      </div>
    </div>
  );
}
