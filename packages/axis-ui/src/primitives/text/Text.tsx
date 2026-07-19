import type { ElementType, HTMLAttributes } from "react";
import { cn } from "../../utils/cn";

export type TextElement = "p" | "span" | "div";
export type TextVariant = "heading" | "body" | "small" | "caption" | "label";
export type TextTone = "default" | "muted" | "danger" | "success";

export interface TextProps extends HTMLAttributes<HTMLElement> {
  as?: TextElement;
  variant?: TextVariant;
  tone?: TextTone;
}

const variantClasses: Record<TextVariant, string> = {
  heading: "text-2xl font-bold tracking-tight",
  body: "text-base",
  small: "text-sm",
  caption: "text-xs",
  label: "text-sm font-medium",
};

const toneClasses: Record<TextTone, string> = {
  default: "text-zinc-900 dark:text-white",
  muted: "text-zinc-500 dark:text-zinc-400",
  danger: "text-red-600 dark:text-red-400",
  success: "text-emerald-600 dark:text-emerald-400",
};

export function Text({
  as = "p",
  className,
  variant = "body",
  tone = "default",
  ...props
}: TextProps) {
  const Component = as as ElementType;
  return (
    <Component
      className={cn(variantClasses[variant], toneClasses[tone], className)}
      {...props}
    />
  );
}
