"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileUp,
  ListPlus,
  Plus,
  Settings,
  SlidersHorizontal,
} from "lucide-react";
import { setEntryValue } from "@/lib/trackers/actions";
import {
  applyFilters,
  applySort,
  chartFormatter,
  chartSpec,
  chartTitle,
  dayOf,
  projection,
  series,
  stats,
  type Filter,
  type Row,
  type Sort,
} from "@/lib/trackers/analytics";
import {
  computeValues,
  formatValue,
  PROPERTY_TYPES,
  type Property,
} from "@/lib/trackers/properties";
import type { TrackerFull, TrackerView } from "@/lib/trackers/data";
import { addMonths, capitalize, formatDay, monthGrid } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/inputs";
import { useToast } from "@/components/ui/toast";
import { cn, count } from "@/lib/utils";
import {
  EntryDialog,
  PropertiesDialog,
  TrackerSettingsDialog,
  ViewDialog,
  type EntryDraft,
} from "./tracker-dialogs";
import { ImportDialog } from "./import-dialog";
import { TrackerChart } from "./tracker-chart";

export function TrackerWorkspace({
  tracker,
  today,
  trackers,
  relationOptions,
}: {
  tracker: TrackerFull;
  today: string;
  trackers: { id: string; name: string }[];
  relationOptions: Record<string, { id: string; label: string }[]>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const views = tracker.views.length
    ? tracker.views
    : [{ id: "default", name: "Tabla", type: "table" as const, config: {}, position: 0 }];
  const active = views.find((v) => v.id === params.get("view")) ?? views[0];
  const [entry, setEntry] = useState<EntryDraft | null>(null);
  const [propsOpen, setPropsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [viewEdit, setViewEdit] = useState<TrackerView | "new" | null>(null);

  const titleProp = tracker.properties.find((p) => p.is_title) ?? tracker.properties[0];
  const dateProp = tracker.properties.find((p) => p.id === tracker.date_property_id) ?? null;
  const rows: Row[] = useMemo(
    () =>
      tracker.entries.map((e) => ({
        id: e.id,
        created_at: e.created_at,
        values: computeValues(tracker.properties, e.values, today),
      })),
    [tracker.entries, tracker.properties, today],
  );
  const linksById = useMemo(
    () => new Map(tracker.entries.map((e) => [e.id, e.links])),
    [tracker.entries],
  );
  const open = (id: string | null) => {
    const e = tracker.entries.find((x) => x.id === id);
    setEntry({
      id,
      values: e ? { ...e.values, ...e.links } : dateProp ? { [dateProp.id]: today } : {},
    });
  };
  const pickView = (id: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("view", id);
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };
  const titleOf = (r: Row) =>
    formatValue(titleProp, r.values[titleProp.id]) ||
    formatDay(r.created_at.slice(0, 10), { day: "numeric", month: "short" });

  return (
    <div className="flex flex-col gap-5">
      <Link
        href="/trackers"
        className="inline-flex items-center gap-1.5 self-start text-[14px] text-fg-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" aria-hidden /> Trackers
      </Link>
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[30px] leading-tight font-medium tracking-[-0.03em] break-words sm:text-[36px]">
            {tracker.icon ? (
              <span className="mr-2" aria-hidden>
                {tracker.icon}
              </span>
            ) : null}
            {tracker.name}
          </h1>
          {tracker.description ? (
            <p className="mt-1 text-[15px] text-fg-muted">{tracker.description}</p>
          ) : null}
          <p className="mt-1 text-[13px] text-fg-subtle">
            {count(tracker.entries.length, "registro")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => open(null)}>
            <Plus className="size-4" aria-hidden /> Nuevo registro
          </Button>
          <Button
            variant="glass"
            size="icon"
            onClick={() => setPropsOpen(true)}
            aria-label="Propiedades"
          >
            <ListPlus className="size-4" aria-hidden />
          </Button>
          <Button
            variant="glass"
            size="icon"
            onClick={() => setImportOpen(true)}
            aria-label="Importar CSV o Excel"
          >
            <FileUp className="size-4" aria-hidden />
          </Button>
          <Button
            variant="glass"
            size="icon"
            onClick={() => setSettingsOpen(true)}
            aria-label="Ajustes del tracker"
          >
            <Settings className="size-4" aria-hidden />
          </Button>
        </div>
      </header>

      <nav
        aria-label="Vistas"
        className="flex items-center gap-1 overflow-x-auto border-b border-border pb-px"
      >
        {views.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => pickView(v.id)}
            aria-current={v.id === active.id ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-t-lg border-b-2 px-3 py-2 text-[14px] font-medium transition-colors",
              v.id === active.id
                ? "border-accent text-fg"
                : "border-transparent text-fg-muted hover:text-fg",
            )}
          >
            {v.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setViewEdit("new")}
          className="ml-1 shrink-0 rounded-lg px-2 py-2 text-[13px] text-fg-muted hover:bg-surface hover:text-fg"
        >
          + Vista
        </button>
        {active.id !== "default" ? (
          <button
            type="button"
            onClick={() => setViewEdit(active)}
            aria-label={`Configurar la vista ${active.name}`}
            className="ml-auto grid size-9 shrink-0 place-items-center rounded-lg text-fg-muted hover:bg-surface hover:text-fg"
          >
            <SlidersHorizontal className="size-4" aria-hidden />
          </button>
        ) : null}
      </nav>

      {rows.length === 0 && active.type !== "chart" ? (
        <EmptyState
          title="Aún no hay registros"
          action={<Button onClick={() => open(null)}>Añadir el primero</Button>}
        >
          También puedes importar un CSV o un Excel con tus datos.
        </EmptyState>
      ) : (
        <ViewBody
          view={active}
          tracker={tracker}
          rows={rows}
          titleOf={titleOf}
          titleProp={titleProp}
          dateProp={dateProp}
          today={today}
          onOpen={open}
          linksById={linksById}
          relationOptions={relationOptions}
        />
      )}

      <EntryDialog
        tracker={tracker}
        draft={entry}
        onClose={() => setEntry(null)}
        today={today}
        relationOptions={relationOptions}
      />
      <PropertiesDialog
        tracker={tracker}
        open={propsOpen}
        onClose={() => setPropsOpen(false)}
        trackers={trackers.filter((t) => t.id !== tracker.id)}
      />
      <ImportDialog tracker={tracker} open={importOpen} onClose={() => setImportOpen(false)} />
      <TrackerSettingsDialog
        tracker={tracker}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      <ViewDialog
        tracker={tracker}
        view={viewEdit}
        onClose={() => setViewEdit(null)}
        onSaved={pickView}
      />
    </div>
  );
}

type BodyProps = {
  view: TrackerView;
  tracker: TrackerFull;
  rows: Row[];
  titleOf: (r: Row) => string;
  titleProp: Property;
  dateProp: Property | null;
  today: string;
  onOpen: (id: string) => void;
  linksById: Map<string, Record<string, string[]>>;
  relationOptions: Record<string, { id: string; label: string }[]>;
};

function ViewBody(props: BodyProps) {
  const { view, rows } = props;
  const sorted = useMemo(
    () =>
      applySort(
        applyFilters(rows, (view.config.filters as Filter[]) ?? []),
        (view.config.sort as Sort) ?? null,
      ),
    [rows, view.config],
  );
  switch (view.type) {
    case "chart":
      return <ChartBody {...props} />;
    case "kanban":
      return <KanbanBody {...props} rows={sorted} />;
    case "calendar":
      return <CalendarBody {...props} />;
    case "list":
      return <ListBody {...props} rows={sorted} />;
    case "cards":
      return <CardsBody {...props} rows={sorted} />;
    default:
      return <TableBody {...props} rows={sorted} />;
  }
}

function cellText(p: Property, r: Row, b: BodyProps) {
  if (p.type === "relation") {
    const ids = b.linksById.get(r.id)?.[p.id] ?? [];
    const opts = b.relationOptions[p.id] ?? [];
    return ids
      .map((id) => opts.find((o) => o.id === id)?.label ?? "")
      .filter(Boolean)
      .join(", ");
  }
  return formatValue(p, r.values[p.id]);
}

function TableBody(b: BodyProps) {
  const cols = b.tracker.properties;
  const numeric = cols.filter((p) => PROPERTY_TYPES[p.type].numeric);
  const [, start] = useTransition();
  const toast = useToast();
  return (
    <div className="glass overflow-x-auto rounded-[var(--radius-card)]">
      <table className="w-full min-w-[560px] text-[14px]">
        <thead>
          <tr className="border-b border-border text-left text-[12px] text-fg-muted uppercase">
            {cols.map((p) => (
              <th
                key={p.id}
                scope="col"
                className={cn(
                  "px-4 py-3 font-medium whitespace-nowrap",
                  PROPERTY_TYPES[p.type].numeric && "text-right",
                )}
              >
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {b.rows.map((r) => (
            <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface">
              {cols.map((p) => (
                <td
                  key={p.id}
                  className={cn(
                    "px-4 py-2.5",
                    PROPERTY_TYPES[p.type].numeric && "text-right tabular-nums",
                  )}
                >
                  {p.is_title ? (
                    <button
                      type="button"
                      onClick={() => b.onOpen(r.id)}
                      className="text-left font-medium hover:text-primary-text hover:underline"
                    >
                      {b.titleOf(r)}
                    </button>
                  ) : p.type === "checkbox" ? (
                    <input
                      type="checkbox"
                      aria-label={`${p.name} de ${b.titleOf(r)}`}
                      checked={r.values[p.id] === true}
                      onChange={(e) =>
                        start(async () => {
                          const res = await setEntryValue(
                            b.tracker.id,
                            r.id,
                            p.id,
                            e.target.checked,
                          );
                          if (!res.ok) toast(res.error, "error");
                        })
                      }
                      className="size-4 accent-[var(--accent)]"
                    />
                  ) : (
                    <span
                      className={cn(
                        typeof r.values[p.id] === "object" &&
                          r.values[p.id] !== null &&
                          !Array.isArray(r.values[p.id]) &&
                          "text-danger-text",
                      )}
                    >
                      {cellText(p, r, b)}
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {numeric.length ? (
          <tfoot>
            <tr className="border-t border-border-strong text-[12px] text-fg-muted">
              {cols.map((p) => {
                if (!PROPERTY_TYPES[p.type].numeric)
                  return (
                    <td key={p.id} className="px-4 py-2">
                      {p.is_title ? "Media" : ""}
                    </td>
                  );
                const vals = b.rows
                  .map((r) => r.values[p.id])
                  .filter((v): v is number => typeof v === "number");
                return (
                  <td key={p.id} className="px-4 py-2 text-right tabular-nums">
                    {vals.length
                      ? formatValue(p, vals.reduce((x, y) => x + y, 0) / vals.length)
                      : ""}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}

function secondary(b: BodyProps, r: Row, max = 3) {
  return b.tracker.properties
    .filter((p) => !p.is_title && p.type !== "long_text")
    .map((p) => ({ p, text: cellText(p, r, b) }))
    .filter((x) => x.text)
    .slice(0, max);
}

function ListBody(b: BodyProps) {
  return (
    <ul className="glass divide-y divide-border rounded-[var(--radius-card)]">
      {b.rows.map((r) => (
        <li key={r.id}>
          <button
            type="button"
            onClick={() => b.onOpen(r.id)}
            className="flex w-full flex-col gap-0.5 px-4 py-3 text-left hover:bg-surface sm:flex-row sm:items-center sm:gap-4"
          >
            <span className="font-medium">{b.titleOf(r)}</span>
            <span className="flex flex-wrap gap-x-3 text-[13px] text-fg-muted">
              {secondary(b, r).map(({ p, text }) => (
                <span key={p.id}>
                  <span className="text-fg-subtle">{p.name}:</span> {text}
                </span>
              ))}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function CardsBody(b: BodyProps) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {b.rows.map((r) => (
        <li key={r.id}>
          <button
            type="button"
            onClick={() => b.onOpen(r.id)}
            className="glass flex h-full w-full flex-col gap-2 rounded-[var(--radius-card)] p-4 text-left transition-transform hover:-translate-y-0.5"
          >
            <span className="text-[16px] font-medium">{b.titleOf(r)}</span>
            <dl className="flex flex-col gap-1 text-[13px]">
              {secondary(b, r, 4).map(({ p, text }) => (
                <div key={p.id} className="flex justify-between gap-3">
                  <dt className="text-fg-muted">{p.name}</dt>
                  <dd className="truncate text-right">{text}</dd>
                </div>
              ))}
            </dl>
          </button>
        </li>
      ))}
    </ul>
  );
}

function KanbanBody(b: BodyProps) {
  const group = b.tracker.properties.find((p) => p.id === b.view.config.groupBy);
  const [over, setOver] = useState<string | null>(null);
  const [, start] = useTransition();
  const toast = useToast();
  if (!group)
    return (
      <EmptyState title="Configura el kanban">
        Elige una propiedad de Selección o Estado en la configuración de la vista.
      </EmptyState>
    );
  const columns = [
    ...(group.config.options ?? []).map((o) => ({ id: o.id, label: o.label })),
    { id: "", label: "Sin valor" },
  ];
  const move = (entryId: string, optionId: string) =>
    start(async () => {
      const res = await setEntryValue(b.tracker.id, entryId, group.id, optionId || null);
      if (!res.ok) toast(res.error, "error");
    });
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {columns.map((c) => {
        const items = b.rows.filter((r) => (r.values[group.id] ?? "") === c.id);
        return (
          <section
            key={c.id || "none"}
            aria-label={`${c.label}, ${items.length}`}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(c.id);
            }}
            onDragLeave={() => setOver(null)}
            onDrop={(e) => {
              setOver(null);
              const id = e.dataTransfer.getData("text/plain");
              if (id) move(id, c.id);
            }}
            className={cn(
              "glass flex w-72 shrink-0 flex-col gap-2 rounded-[var(--radius-card)] p-3",
              over === c.id && "ring-2 ring-ring",
            )}
          >
            <h3 className="flex items-center justify-between px-1 text-[13px] font-medium text-fg-muted">
              {c.label} <span className="text-fg-subtle">{items.length}</span>
            </h3>
            {items.map((r) => (
              <article
                key={r.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData("text/plain", r.id)}
                className="flex flex-col gap-2 rounded-xl border border-border bg-surface-solid/60 p-3"
              >
                <button
                  type="button"
                  onClick={() => b.onOpen(r.id)}
                  className="text-left text-[14px] font-medium hover:underline"
                >
                  {b.titleOf(r)}
                </button>
                <label className="sr-only" htmlFor={`mv-${r.id}`}>
                  Mover {b.titleOf(r)} a
                </label>
                <select
                  id={`mv-${r.id}`}
                  value={(r.values[group.id] as string) ?? ""}
                  onChange={(e) => move(r.id, e.target.value)}
                  className="h-8 rounded-lg border border-border bg-surface px-2 text-[12px] text-fg-muted [&>option]:bg-surface-solid"
                >
                  {columns.map((o) => (
                    <option key={o.id || "none"} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </article>
            ))}
          </section>
        );
      })}
    </div>
  );
}

function CalendarBody(b: BodyProps) {
  const [anchor, setAnchor] = useState(b.today);
  const days = monthGrid(anchor);
  const byDay = new Map<string, Row[]>();
  for (const r of b.rows) {
    const d = dayOf(r, b.dateProp);
    if (d) byDay.set(d, [...(byDay.get(d) ?? []), r]);
  }
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Button
          variant="glass"
          size="icon"
          onClick={() => setAnchor(addMonths(anchor, -1))}
          aria-label="Mes anterior"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </Button>
        <Button
          variant="glass"
          size="icon"
          onClick={() => setAnchor(addMonths(anchor, 1))}
          aria-label="Mes siguiente"
        >
          <ChevronRight className="size-4" aria-hidden />
        </Button>
        <h2 className="ml-2 text-[18px] font-medium" aria-live="polite">
          {capitalize(formatDay(anchor, { month: "long", year: "numeric" }))}
        </h2>
      </div>
      {!b.dateProp ? (
        <p className="text-[13px] text-fg-subtle">
          Sin propiedad de fecha como eje temporal: se usa la fecha de creación.
        </p>
      ) : null}
      <div className="glass grid grid-cols-7 overflow-hidden rounded-[var(--radius-card)]">
        {days.slice(0, 7).map((d) => (
          <div
            key={`h${d}`}
            className="border-b border-border py-2 text-center text-[12px] text-fg-subtle uppercase"
          >
            {formatDay(d, { weekday: "short" }).replace(".", "")}
          </div>
        ))}
        {days.map((d) => (
          <div
            key={d}
            className={cn(
              "min-h-20 border-r border-b border-border p-1.5",
              d.slice(0, 7) !== anchor.slice(0, 7) && "opacity-40",
            )}
          >
            <span
              className={cn(
                "grid size-6 place-items-center rounded-full text-[12px]",
                d === b.today && "bg-accent font-semibold text-accent-fg",
              )}
            >
              {Number(d.slice(8))}
            </span>
            {(byDay.get(d) ?? []).slice(0, 3).map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => b.onOpen(r.id)}
                className="mt-0.5 block w-full truncate rounded-md bg-primary/20 px-1.5 py-0.5 text-left text-[11px] hover:bg-primary/30"
              >
                {b.titleOf(r)}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartBody(b: BodyProps) {
  const spec = useMemo(
    () => chartSpec(b.view.config, b.tracker.properties),
    [b.view.config, b.tracker.properties],
  );
  const { y, agg, bucket, kind } = spec;
  const points = useMemo(
    () => series(b.rows, b.dateProp, y, agg, bucket),
    [b.rows, b.dateProp, y, agg, bucket],
  );
  const s = stats(points);
  const fmt = chartFormatter(spec);
  const proj = projection(points, bucket === "month" ? 3 : bucket === "week" ? 4 : 30);
  const title = chartTitle(spec);
  const unitPerPoint = bucket === "day" ? 7 : 1;
  const trendLabel = bucket === "day" ? "por semana" : bucket === "week" ? "por semana" : "por mes";

  return (
    <div className="flex flex-col gap-4">
      {s ? (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["Último", fmt(s.last)],
            ["Media", fmt(s.avg)],
            ["Mínimo", fmt(s.min)],
            ["Máximo", fmt(s.max)],
            ["Cambio", `${s.change > 0 ? "+" : ""}${fmt(s.change)}`],
            [
              `Tendencia ${trendLabel}`,
              s.slopePerDay === null
                ? "—"
                : `${s.slopePerDay > 0 ? "+" : ""}${fmt(s.slopePerDay * (bucket === "month" ? 30.4 : unitPerPoint))}`,
            ],
          ].map(([label, value]) => (
            <div key={label} className="glass rounded-2xl p-3">
              <dt className="text-[12px] text-fg-muted">{label}</dt>
              <dd className="text-[20px] font-medium tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <div className="glass rounded-[var(--radius-card)] p-4">
        <TrackerChart points={points} kind={kind} title={title} format={fmt} />
      </div>
      {proj ? (
        <p className="text-[13px] text-fg-muted">
          Si sigue la tendencia actual, el {formatDay(proj.x, { day: "numeric", month: "long" })}{" "}
          rondaría {fmt(proj.y)}.{" "}
          <span className="text-fg-subtle">
            Estimación lineal con {points.length} puntos, no una medición.
          </span>
        </p>
      ) : points.length > 0 && points.length < 5 ? (
        <p className="text-[13px] text-fg-subtle">
          Con 5 o más puntos verás una estimación de tendencia.
        </p>
      ) : null}
    </div>
  );
}
