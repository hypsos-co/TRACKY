"use client";

import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { chartFormatter, chartTitle } from "@/lib/trackers/analytics";
import type { TrackerWidgetData } from "@/lib/trackers/widget";
import { formatDay } from "@/lib/dates";
import { TrackerChart } from "@/components/trackers/tracker-chart";
import { count } from "@/lib/utils";

function Open({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <Link
      href={`/trackers/${id}`}
      className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-primary-text hover:underline"
    >
      {children} <ArrowRight className="size-3.5" aria-hidden />
    </Link>
  );
}

export function MissingTracker() {
  return (
    <p className="text-[14px] text-fg-muted">
      Este tracker ya no existe o no tienes acceso. Puedes quitar el widget desde «Personalizar».
    </p>
  );
}

export function TrackerChartWidget({ data }: { data: TrackerWidgetData }) {
  const fmt = chartFormatter(data.spec);
  return (
    <>
      <TrackerChart
        points={data.points}
        kind={data.spec.kind}
        title={chartTitle(data.spec)}
        format={fmt}
        compact
      />
      <Open id={data.id}>Abrir {data.name}</Open>
    </>
  );
}

export function TrackerLatestWidget({ data }: { data: TrackerWidgetData }) {
  const fmt = chartFormatter({ ...data.spec, agg: "last" });
  const { latest, lastEntry } = data;
  if (!data.entries)
    return (
      <>
        <p className="text-[14px] text-fg-muted">Aún no hay registros</p>
        <Open id={data.id}>Añadir el primero</Open>
      </>
    );

  if (latest && data.spec.y) {
    const delta = latest.previous === null ? null : latest.value - latest.previous;
    const Icon = delta && delta > 0 ? ArrowUpRight : ArrowDownRight;
    const day = (d: string) => formatDay(d, { day: "numeric", month: "short" });
    return (
      <>
        <p className="text-[13px] text-fg-muted">{data.spec.y.name}</p>
        <p className="mt-1 flex items-center gap-2 text-[28px] leading-none font-medium tabular-nums">
          {fmt(latest.value)}
          <span className="now-dot" aria-hidden />
        </p>
        <p className="mt-2 text-[13px] text-fg-muted tabular-nums">
          {day(latest.day)}
          {delta !== null && latest.previousDay ? (
            delta === 0 ? (
              <> · sin cambios desde el {day(latest.previousDay)}</>
            ) : (
              <>
                {" · "}
                <span className="inline-flex items-center gap-0.5 text-fg">
                  <Icon className="size-3.5" aria-hidden />
                  {delta > 0 ? "+" : "−"}
                  {fmt(Math.abs(delta))}
                </span>{" "}
                desde el {day(latest.previousDay)}
              </>
            )
          ) : null}
        </p>
        <Open id={data.id}>Abrir {data.name}</Open>
      </>
    );
  }

  return (
    <>
      <p className="text-[28px] leading-none font-medium tabular-nums">
        {count(data.entries, "registro")}
      </p>
      {lastEntry ? (
        <p className="mt-2 truncate text-[13px] text-fg-muted">
          Último: {lastEntry.title || "sin título"}
          {lastEntry.day
            ? ` · ${formatDay(lastEntry.day, { day: "numeric", month: "short" })}`
            : ""}
        </p>
      ) : null}
      <Open id={data.id}>Abrir {data.name}</Open>
    </>
  );
}
