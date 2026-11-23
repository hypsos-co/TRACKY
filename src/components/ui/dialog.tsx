"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Accessible modal built on the native <dialog> (focus trap, Esc, inert page).
 * `variant="sheet"`: bottom sheet on phones, right-side panel from md up.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  variant = "center",
  className,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  variant?: "center" | "sheet";
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cn(
        "m-0 overflow-visible",
        variant === "center" && "fixed inset-0 m-auto w-[min(560px,calc(100vw-24px))]",
        variant === "sheet" &&
          "fixed inset-x-0 top-auto bottom-0 w-full md:inset-y-0 md:right-0 md:left-auto md:h-dvh md:w-[min(520px,100vw)]",
      )}
    >
      <div
        className={cn(
          "glass-strong flex max-h-[min(88dvh,880px)] flex-col overflow-hidden bg-[var(--surface-solid)]",
          variant === "center" && "rounded-[var(--radius-card)]",
          variant === "sheet" &&
            "rounded-t-[var(--radius-card)] md:h-dvh md:max-h-none md:rounded-none md:rounded-l-[var(--radius-card)]",
          className,
        )}
      >
        <div className="flex items-start justify-between gap-4 px-5 pt-5 pb-3 sm:px-6">
          <div className="min-w-0">
            <h2 id={titleId} className="text-[18px] font-medium tracking-[-0.015em]">
              {title}
            </h2>
            {description ? <p className="mt-0.5 text-[13px] text-fg-muted">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid size-9 shrink-0 place-items-center rounded-full text-fg-muted transition-colors hover:bg-surface-strong hover:text-fg"
          >
            <X className="size-[18px]" aria-hidden />
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:px-6">
          {children}
        </div>
      </div>
    </dialog>
  );
}
