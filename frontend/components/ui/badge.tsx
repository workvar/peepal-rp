import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

type BadgeVariant =
  | "default" | "secondary" | "destructive" | "outline"
  | "success"  | "warning"   | "purple"      | "cyan" | "pink"
  | "green"    | "red"       | "yellow"      | "blue" | "gray";

const variantClasses: Record<BadgeVariant, string> = {
  default:     "bg-primary/12 text-primary",
  secondary:   "bg-muted text-muted-foreground",
  destructive: "bg-destructive/12 text-destructive",
  outline:     "text-foreground border border-border",
  success:     "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  warning:     "bg-amber-500/12 text-amber-700 dark:text-amber-400",
  purple:      "bg-violet-500/12 text-violet-700 dark:text-violet-400",
  cyan:        "bg-cyan-500/12 text-cyan-700 dark:text-cyan-400",
  pink:        "bg-pink-500/12 text-pink-700 dark:text-pink-400",
  green:       "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  red:         "bg-destructive/12 text-destructive",
  yellow:      "bg-amber-500/12 text-amber-700 dark:text-amber-400",
  blue:        "bg-blue-500/12 text-blue-600 dark:text-blue-400",
  gray:        "bg-muted text-muted-foreground",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
  label?: string;
}

function Badge({ className, variant = "default", dot = false, label, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5",
        "text-xs font-semibold tracking-wide transition-all duration-150",
        variantClasses[variant] ?? variantClasses.default,
        className
      )}
      {...props}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" aria-hidden="true" />}
      {children ?? label}
    </span>
  );
}

export { Badge };
export type { BadgeVariant };
