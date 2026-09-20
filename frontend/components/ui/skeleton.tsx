import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl bg-muted animate-skeleton",
        className
      )}
      {...props}
    />
  );
}
export { Skeleton };
