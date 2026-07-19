import { forwardRef } from "react";
import { cn } from "../../utils/cn";
import { alertBaseClass, alertVariantClasses } from "./Alert.styles";
import type { AlertProps } from "./Alert.types";

export const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  { className, variant = "info", role, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      role={role ?? (variant === "error" ? "alert" : "status")}
      className={cn(alertBaseClass, alertVariantClasses[variant], className)}
      {...props}
    />
  );
});
