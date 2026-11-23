"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDay } from "@/lib/dates";
import type { Point } from "@/lib/trackers/analytics";
import { cn } from "@/lib/utils";

const H = 240;
const M = { top: 14, right: 14, bottom: 28, left: 52 };

function niceTicks(min: number, max: number, count = 4) {
  if (min === max) {
    const pad = Math.abs(min) * 0.1 || 1;
    min -= pad;
    max += pad;
  }
  const step0 = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((s) => s >= step0) ?? step0;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Number(v.toFixed(10)));
  return ticks;
}

/**
 * Single-series time chart (line or bar). No legend: the title names the series.
 * Hover / keyboard crosshair with tooltip; a table view is always available.
 */
export function TrackerChart({
  points,
  kind,
  title,
  format,
  compact = false,
}: {
  points: Point[];
  kind: "line" | "bar";
  title: string;
  format: (v: number) => string;
  compact?: boolean;
}) {
  // Callback ref: the plot mounts later than the component (empty state, table toggle).
  const [wrap, setWrap] = useState<HTMLDivElement | null>(null);
  const [measured, setMeasured] = useState<number | null>(null);
  const width = measured ?? 600;
  const [active, setActive] = useState<number | null>(null);
  const [asTable, setAsTable] = useState(false);
  const height = compact ? 160 : H;

  useEffect(() => {
    if (!wrap) return;
    const ro = new ResizeObserver(([e]) => setMeasured(Math.max(240, e.contentRect.width)));
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [wrap]);

  const geo = useMemo(() => {
    const iw = width - M.left - M.right;
    const ih = height - M.top - M.bottom;
    const ys = points.map((p) => p.y);
    const allPositive = ys.every((y) => y >= 0);
    const ticks = niceTicks(kind === "bar" && allPositive ? 0 : Math.min(...ys), Math.max(...ys));
    const y0 = ticks[0];
    const y1 = ticks[ticks.length - 1];
    const sy = (v: number) => M.top + ih - ((v - y0) / (y1 - y0 || 1)) * ih;
    const n = points.length;
    const band = iw / Math.max(n, 1);
    const sx = (i: number) =>
      kind === "bar"
        ? M.left + band * i + band / 2
        : M.left + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
    return { iw, ih, ticks, sy, sx, band };
  }, [points, width, height, kind]);

  if (!points.length)
    return (
      <p className="rounded-2xl border border-dashed border-border-strong p-6 text-center text-[14px] text-fg-muted">
        Aún no hay datos numéricos para dibujar este gráfico.
      </p>
    );

  const { ticks, sy, sx, band } = geo;
  const fmtX = (x: string) => formatDay(x, { day: "numeric", month: "short" });
  const xLabelEvery = Math.max(1, Math.ceil(points.length / Math.max(2, Math.floor(geo.iw / 70))));
  const last = points.length - 1;
  const baseline = sy(Math.max(ticks[0], Math.min(0, ticks[ticks.length - 1])));

  const nearest = (clientX: number) => {
    const rect = wrap!.getBoundingClientRect();
    const x = clientX - rect.left;
    let best = 0;
    for (let i = 1; i < points.length; i++)
      if (Math.abs(sx(i) - x) < Math.abs(sx(best) - x)) best = i;
    return best;
  };

  const linePath = points
    .map((p, i) => `${i ? "L" : "M"}${sx(i).toFixed(1)},${sy(p.y).toFixed(1)}`)
    .join(" ");
  const barW = Math.max(2, Math.min(28, band - 2));
  const barPath = (i: number) => {
    const x = sx(i) - barW / 2;
    const top = sy(points[i].y);
    const h = Math.max(1, baseline - top);
    const r = Math.min(4, barW / 2, h);
    // rounded data-end, flat on the baseline
    return `M${x},${baseline} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${baseline} Z`;
  };
  const a = active ?? null;

  return (
    <figure className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <figcaption className="text-[13px] font-medium text-fg-muted">{title}</figcaption>
        {!compact ? (
          <button
            type="button"
            onClick={() => setAsTable((t) => !t)}
            aria-pressed={asTable}
            className="text-[12px] font-medium text-primary-text hover:underline"
          >
            {asTable ? "Ver gráfico" : "Ver como tabla"}
          </button>
        ) : null}
      </div>

      {asTable ? (
        <div className="max-h-72 overflow-auto rounded-xl border border-border">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 bg-surface-solid text-left text-fg-muted">
              <tr>
                <th className="px-3 py-2 font-medium">Fecha</th>
                <th className="px-3 py-2 text-right font-medium">{title}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.x} className="border-t border-border">
                  <td className="px-3 py-1.5">{fmtX(p.x)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{format(p.y)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={setWrap} className="relative w-full min-w-0" style={{ minHeight: height }}>
          {measured === null ? null : (
            <svg
              width={width}
              height={height}
              role="img"
              tabIndex={0}
              aria-label={`${title}: ${points.length} puntos, último ${format(points[last].y)} el ${fmtX(points[last].x)}. Usa las flechas para recorrer los valores.`}
              className="block touch-pan-y outline-none focus-visible:rounded-lg focus-visible:outline-2 focus-visible:outline-ring"
              onPointerMove={(e) => setActive(nearest(e.clientX))}
              onPointerLeave={() => setActive(null)}
              onBlur={() => setActive(null)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") setActive((i) => Math.min(last, (i ?? -1) + 1));
                else if (e.key === "ArrowLeft")
                  setActive((i) => Math.max(0, (i ?? points.length) - 1));
                else if (e.key === "Home") setActive(0);
                else if (e.key === "End") setActive(last);
                else return;
                e.preventDefault();
              }}
            >
              {ticks.map((t) => (
                <g key={t}>
                  <line
                    x1={M.left}
                    x2={width - M.right}
                    y1={sy(t)}
                    y2={sy(t)}
                    stroke="var(--chart-grid)"
                    strokeWidth={1}
                  />
                  <text
                    x={M.left - 8}
                    y={sy(t)}
                    dy="0.32em"
                    textAnchor="end"
                    className="fill-fg-subtle text-[11px] tabular-nums"
                  >
                    {format(t)}
                  </text>
                </g>
              ))}
              {points.map((p, i) =>
                i % xLabelEvery === 0 || i === last ? (
                  <text
                    key={p.x}
                    x={sx(i)}
                    y={height - 8}
                    // keep the last date inside the plot (the line ends at the right edge)
                    textAnchor={kind === "line" && i === last && last > 0 ? "end" : "middle"}
                    className="fill-fg-subtle text-[11px]"
                  >
                    {fmtX(p.x)}
                  </text>
                ) : null,
              )}

              {kind === "bar" ? (
                points.map((p, i) => (
                  <path
                    key={p.x}
                    d={barPath(i)}
                    fill="var(--chart-1)"
                    opacity={a === null || a === i ? 1 : 0.55}
                  />
                ))
              ) : (
                <>
                  <path
                    d={linePath}
                    fill="none"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                  <circle
                    cx={sx(last)}
                    cy={sy(points[last].y)}
                    r={4}
                    fill="var(--chart-1)"
                    stroke="var(--surface-solid)"
                    strokeWidth={2}
                  />
                </>
              )}

              {a !== null ? (
                <g pointerEvents="none">
                  <line
                    x1={sx(a)}
                    x2={sx(a)}
                    y1={M.top}
                    y2={height - M.bottom}
                    stroke="var(--fg-subtle)"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                  />
                  {kind === "line" ? (
                    <circle
                      cx={sx(a)}
                      cy={sy(points[a].y)}
                      r={5}
                      fill="var(--chart-1)"
                      stroke="var(--surface-solid)"
                      strokeWidth={2}
                    />
                  ) : null}
                </g>
              ) : null}
            </svg>
          )}

          {a !== null ? (
            <div
              role="status"
              className="glass-strong pointer-events-none absolute top-1 z-10 rounded-xl bg-[var(--surface-solid)] px-3 py-2 text-[12px] whitespace-nowrap"
              style={{ left: Math.min(Math.max(sx(a) - 60, 0), width - 140) }}
            >
              <span className="block text-[15px] font-semibold tabular-nums">
                {format(points[a].y)}
              </span>
              <span className="text-fg-muted">
                {fmtX(points[a].x)}
                {points[a].n > 1 ? ` · ${points[a].n} registros` : ""}
              </span>
            </div>
          ) : null}
        </div>
      )}
      <p className={cn("text-[12px] text-fg-subtle", compact && "sr-only")}>
        Último valor: {format(points[last].y)} ({fmtX(points[last].x)})
      </p>
    </figure>
  );
}
