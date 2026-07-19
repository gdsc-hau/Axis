import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import type { TextareaProps } from "./Textarea.types";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-shadow placeholder:text-zinc-400 focus:border-[var(--axis-color-focus)] focus:ring-2 focus:ring-[var(--axis-color-focus-soft)] disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white",
          className,
        )}
        {...props}
      />
    );
  },
);
