import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/** Card surface: solid fill + hairline. */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("card rounded-[var(--radius-card)]", className)} {...props} />;
}
