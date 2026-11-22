import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const tones = {
  error: "border-danger/30 bg-danger-surface text-danger-text",
  success: "border-accent/30 bg-success-surface text-success-text",
  info: "border-border bg-surface text-fg-muted",
} as const;

/** Inline status message. Errors are announced assertively, others politely. */
export function Alert({
  tone = "info",
  children,
  className,
}: {
  tone?: keyof typeof tones;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-2xl border px-4 py-3 text-[13px] leading-relaxed",
        tones[tone],
        className,
      )}
    >
      {children}
    </div>
  );
}
