export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Cargando">
      <div className="card h-11 rounded-xl" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-3">
          <div className="size-5 rounded-full bg-surface-strong" />
          <div
            className="h-4 flex-1 rounded bg-surface-strong"
            style={{ maxWidth: `${60 + ((i * 13) % 30)}%` }}
          />
        </div>
      ))}
    </div>
  );
}

export function GridSkeleton({ cards = 4 }: { cards?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="card h-40 rounded-[var(--radius-card)]" />
      ))}
    </div>
  );
}
