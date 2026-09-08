import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../utils/cn";

export interface ApplicationShellProps extends HTMLAttributes<HTMLDivElement> {
  navigation: ReactNode;
  contentClassName?: string;
  containerClassName?: string;
}

export function ApplicationShell({
  navigation,
  children,
  className,
  contentClassName,
  containerClassName,
  ...props
}: ApplicationShellProps) {
  return (
    <div
      className={cn(
        "flex min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50",
        className,
      )}
      {...props}
    >
      {navigation}
      <main className={cn("min-w-0 flex-1", contentClassName)}>
        <div className={containerClassName}>{children}</div>
      </main>
    </div>
  );
}
