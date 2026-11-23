import { cn } from "@/lib/utils";

/** Accessible progress bar computed from real task data. */
export function ProgressBar({
  done,
  total,
  className,
}: {
  done: number;
  total: number;
  className?: string;
}) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={`Progreso: ${done} de ${total} tareas`}
        className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-strong"
      >
        <div
          className="h-full origin-left rounded-full bg-primary transition-transform duration-300 ease-[var(--ease-out)]"
          style={{ transform: `scaleX(${pct / 100})` }}
        />
      </div>
      <span className="w-20 text-right text-[12px] text-fg-muted tabular-nums">
        {total ? `${done}/${total} · ${pct}%` : "Sin tareas"}
      </span>
    </div>
  );
}
