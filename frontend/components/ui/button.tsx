import { cn } from "@/lib/utils";
import { type ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
type Size    = "default" | "sm" | "lg" | "icon" | "xs";

const variantClasses: Record<Variant, string> = {
  default:     "btn-primary",
  secondary:   "btn-secondary",
  destructive: "btn-error",
  outline:     "btn-outline",
  ghost:       "btn-ghost",
  link:        "btn bg-transparent text-primary hover:underline underline-offset-4 px-0",
};

const sizeClasses: Record<Size, string> = {
  default: "",
  sm:      "btn-sm",
  lg:      "btn-lg",
  xs:      "btn-xs",
  icon:    "h-9 w-9 !p-0 rounded-xl",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(
          "btn",
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {loading && (
          <span
            className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin shrink-0"
            aria-hidden="true"
          />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";
export { Button };
