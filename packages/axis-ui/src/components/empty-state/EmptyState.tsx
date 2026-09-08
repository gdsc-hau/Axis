import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn";

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-xl border border-dashed border-zinc-300 px-6 py-10 text-center dark:border-zinc-700",
        className,
      )}
      {...props}
    >
      {icon && <div className="mb-4 text-zinc-400">{icon}</div>}
      <h2 className="text-base font-semibold text-zinc-900 dark:text-white">
        {title}
      </h2>
      {description && (
        <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
