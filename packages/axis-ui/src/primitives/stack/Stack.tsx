import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export type StackDirection = "row" | "column";
export type StackGap = "none" | "xs" | "sm" | "md" | "lg" | "xl";
export type StackAlign = "start" | "center" | "end" | "stretch";
export type StackJustify = "start" | "center" | "end" | "between";

export interface StackProps extends HTMLAttributes<HTMLDivElement> {
  direction?: StackDirection;
  gap?: StackGap;
  align?: StackAlign;
  justify?: StackJustify;
  wrap?: boolean;
}

const directionClasses: Record<StackDirection, string> = {
  row: "flex-row",
  column: "flex-col",
};

const gapClasses: Record<StackGap, string> = {
  none: "gap-0",
  xs: "gap-1",
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
  xl: "gap-8",
};

const alignClasses: Record<StackAlign, string> = {
  start: "items-start",
  center: "items-center",
  end: "items-end",
  stretch: "items-stretch",
};

const justifyClasses: Record<StackJustify, string> = {
  start: "justify-start",
  center: "justify-center",
  end: "justify-end",
  between: "justify-between",
};

export const Stack = forwardRef<HTMLDivElement, StackProps>(function Stack(
  {
    className,
    direction = "column",
    gap = "md",
    align = "stretch",
    justify = "start",
    wrap = false,
    ...props
  },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        "flex",
        directionClasses[direction],
        gapClasses[gap],
        alignClasses[align],
        justifyClasses[justify],
        wrap && "flex-wrap",
        className,
      )}
      {...props}
    />
  );
});
