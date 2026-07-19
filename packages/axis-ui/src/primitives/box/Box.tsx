import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export type BoxProps = HTMLAttributes<HTMLDivElement>;

export const Box = forwardRef<HTMLDivElement, BoxProps>(function Box(
  { className, ...props },
  ref,
) {
  return <div ref={ref} className={cn(className)} {...props} />;
});
