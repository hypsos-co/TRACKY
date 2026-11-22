import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Liquid-glass surface. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("glass rounded-[var(--radius-card)]", className)} {...props} />;
}
