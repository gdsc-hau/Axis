import type { HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export interface LoadingSkeletonProps extends HTMLAttributes<HTMLDivElement> {
  lines?: number;
}

export function LoadingSkeleton({
  lines = 3,
  className,
  ...props
}: LoadingSkeletonProps) {
  const safeLines = Math.min(Math.max(Math.trunc(lines), 1), 12);

  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn("animate-pulse space-y-3", className)}
      {...props}
    >
      {Array.from({ length: safeLines }, (_, index) => (
        <div
          key={index}
          className={cn(
            "h-4 rounded bg-zinc-200 dark:bg-zinc-800",
            index === safeLines - 1 && safeLines > 1 && "w-2/3",
          )}
        />
      ))}
      <span className="sr-only">Loading content</span>
    </div>
  );
}
