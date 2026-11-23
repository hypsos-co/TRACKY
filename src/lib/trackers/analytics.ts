import { addDays, type ISODate, isISODate, startOfWeek } from "@/lib/dates";
import {
  formatValue,
  numericValue,
  PROPERTY_TYPES,
  type EntryValues,
  type Property,
} from "./properties";

export type Aggregation = "avg" | "sum" | "min" | "max" | "last" | "count";
export type Bucket = "day" | "week" | "month";
export const AGG_LABELS: Record<Aggregation, string> = {
  avg: "Media",
  sum: "Suma",
  min: "Mínimo",
  max: "Máximo",
  last: "Último",
  count: "Recuento",
};
export const BUCKET_LABELS: Record<Bucket, string> = { day: "Día", week: "Semana", month: "Mes" };

export type Row = { id: string; values: EntryValues; created_at: string };

export function bucketOf(day: ISODate, bucket: Bucket): ISODate {
  if (bucket === "week") return startOfWeek(day);
  if (bucket === "month") return `${day.slice(0, 7)}-01`;
  return day;
}

/** Day of an entry on the time axis: the date property, else its creation day. */
export function dayOf(row: Row, dateProp: Property | null): ISODate | null {
  if (dateProp) {
    const v = row.values[dateProp.id];
    if (typeof v === "string") return v.slice(0, 10);
    return null;
  }
  return row.created_at.slice(0, 10);
}

export function aggregate(values: number[], agg: Aggregation): number | null {
  if (agg === "count") return values.length;
  if (!values.length) return null;
  switch (agg) {
    case "sum":
      return values.reduce((a, b) => a + b, 0);
    case "avg":
      return values.reduce((a, b) => a + b, 0) / values.length;
    case "min":
      return Math.min(...values);
    case "max":
      return Math.max(...values);
    case "last":
      return values[values.length - 1];
  }
}

export type Point = { x: ISODate; y: number; n: number };

/** Time series of `y` aggregated per bucket, ascending by date. */
export function series(
  rows: Row[],
  dateProp: Property | null,
  y: Property | null,
  agg: Aggregation,
  bucket: Bucket,
): Point[] {
  const groups = new Map<ISODate, number[]>();
  const ordered = [...rows].sort((a, b) =>
    (dayOf(a, dateProp) ?? "") < (dayOf(b, dateProp) ?? "") ? -1 : 1,
  );
  for (const r of ordered) {
    const day = dayOf(r, dateProp);
    if (!day || !isISODate(day)) continue;
    const key = bucketOf(day, bucket);
    const list = groups.get(key) ?? [];
    if (agg === "count") list.push(1);
    else {
      const n = y ? numericValue(y, r.values[y.id]) : null;
      if (n === null) continue;
      list.push(n);
    }
    groups.set(key, list);
  }
  return [...groups.entries()]
    .map(([x, list]) => ({ x, y: aggregate(list, agg) ?? 0, n: list.length }))
    .filter((p) => p.n > 0)
    .sort((a, b) => (a.x < b.x ? -1 : 1));
}

export type Stats = {
  count: number;
  avg: number;
  min: number;
  max: number;
  first: number;
  last: number;
  change: number;
  slopePerDay: number | null;
};

/** Summary of a numeric column over time + least-squares trend (per day). */
export function stats(points: Point[]): Stats | null {
  if (!points.length) return null;
  const ys = points.map((p) => p.y);
  const base = Date.parse(points[0].x);
  const xs = points.map((p) => (Date.parse(p.x) - base) / 86_400_000);
  let slope: number | null = null;
  if (points.length >= 3) {
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const my = ys.reduce((a, b) => a + b, 0) / ys.length;
    const num = xs.reduce((s, x, i) => s + (x - mx) * (ys[i] - my), 0);
    const den = xs.reduce((s, x) => s + (x - mx) ** 2, 0);
    slope = den ? num / den : null;
  }
  return {
    count: points.length,
    avg: ys.reduce((a, b) => a + b, 0) / ys.length,
    min: Math.min(...ys),
    max: Math.max(...ys),
    first: ys[0],
    last: ys[ys.length - 1],
    change: ys[ys.length - 1] - ys[0],
    slopePerDay: slope,
  };
}

/** Linear projection `days` ahead of the last point (only with ≥ 5 points). */
export function projection(points: Point[], days: number): { x: ISODate; y: number } | null {
  const s = stats(points);
  if (!s || s.slopePerDay === null || points.length < 5) return null;
  const last = points[points.length - 1];
  return { x: addDays(last.x, days), y: last.y + s.slopePerDay * days };
}

// ── Chart specification (tracker chart views and dashboard widgets) ─────────
export type ChartSpec = {
  y: Property | null;
  agg: Aggregation;
  bucket: Bucket;
  kind: "line" | "bar";
};

const AGGS = Object.keys(AGG_LABELS) as Aggregation[];
const BUCKETS = Object.keys(BUCKET_LABELS) as Bucket[];

/** Read a chart view's config defensively (unknown keys/values fall back to defaults). */
export function chartSpec(config: Record<string, unknown>, properties: Property[]): ChartSpec {
  const y = properties.find((p) => p.id === config.y && PROPERTY_TYPES[p.type].numeric) ?? null;
  const agg = AGGS.includes(config.agg as Aggregation) ? (config.agg as Aggregation) : "avg";
  const bucket = BUCKETS.includes(config.bucket as Bucket) ? (config.bucket as Bucket) : "day";
  const kind = config.kind === "bar" || config.kind === "line" ? config.kind : y ? "line" : "bar";
  return { y, agg: y ? agg : "count", bucket, kind };
}

/** Best chart for a tracker: its first chart view, else its first numeric property. */
export function defaultChartSpec(tracker: {
  properties: Property[];
  views: { type: string; config: Record<string, unknown> }[];
}): ChartSpec {
  const view = tracker.views.find((v) => v.type === "chart");
  if (view) return chartSpec(view.config, tracker.properties);
  const y =
    [...tracker.properties]
      .sort((a, b) => a.position - b.position)
      .find((p) => PROPERTY_TYPES[p.type].numeric) ?? null;
  return { y, agg: y ? "avg" : "count", bucket: "day", kind: y ? "line" : "bar" };
}

export function chartTitle(spec: ChartSpec) {
  return `${spec.y ? spec.y.name : "Registros"} · ${AGG_LABELS[spec.agg]} por ${BUCKET_LABELS[spec.bucket].toLowerCase()}`;
}

/** Formatter for axis ticks, tooltips and stats of a chart. */
export function chartFormatter(spec: ChartSpec): (v: number) => string {
  const plain = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 });
  const y = spec.y;
  if (!y || spec.agg === "count") return (v) => plain.format(v);
  return (v) => formatValue(y, Math.round(v * 100) / 100) || plain.format(v);
}

// ── Filtering & sorting for table/list/cards views ──────────────────────────
export type Filter = {
  propertyId: string;
  op: "eq" | "neq" | "gt" | "lt" | "contains" | "empty" | "notEmpty";
  value?: string | number | boolean;
};
export type Sort = { propertyId: string; dir: "asc" | "desc" };

export function applyFilters(rows: Row[], filters: Filter[] = []): Row[] {
  return rows.filter((r) =>
    filters.every((f) => {
      const v = r.values[f.propertyId];
      const empty = v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length);
      switch (f.op) {
        case "empty":
          return empty;
        case "notEmpty":
          return !empty;
        case "eq":
          return Array.isArray(v) ? v.includes(f.value) : String(v ?? "") === String(f.value ?? "");
        case "neq":
          return Array.isArray(v)
            ? !v.includes(f.value)
            : String(v ?? "") !== String(f.value ?? "");
        case "gt":
          return typeof v === "number"
            ? v > Number(f.value)
            : String(v ?? "") > String(f.value ?? "");
        case "lt":
          return typeof v === "number"
            ? v < Number(f.value)
            : String(v ?? "") < String(f.value ?? "");
        case "contains":
          return String(v ?? "")
            .toLowerCase()
            .includes(String(f.value ?? "").toLowerCase());
      }
    }),
  );
}

export function applySort(rows: Row[], sort?: Sort | null): Row[] {
  if (!sort) return [...rows].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  const dir = sort.dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = a.values[sort.propertyId];
    const y = b.values[sort.propertyId];
    if (x === y) return 0;
    if (x === undefined || x === null) return 1;
    if (y === undefined || y === null) return -1;
    if (typeof x === "number" && typeof y === "number") return (x - y) * dir;
    return String(x).localeCompare(String(y), "es") * dir;
  });
}

// ── CSV ─────────────────────────────────────────────────────────────────────
/** RFC 4180 CSV parser (quotes, escaped quotes, CRLF); auto-detects , or ; delimiter. */
export function parseCSV(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const delimiter =
    (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"' && cell === "") quoted = true;
    else if (c === delimiter) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Map CSV headers to properties by (accent-insensitive) name. */
export function autoMap(headers: string[], properties: Property[]): Record<number, string | null> {
  const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
  const map: Record<number, string | null> = {};
  headers.forEach((h, i) => {
    const p = properties.find(
      (pp) => pp.type !== "formula" && pp.type !== "relation" && norm(pp.name) === norm(h),
    );
    map[i] = p?.id ?? null;
  });
  return map;
}

/** Fingerprint for duplicate detection (same values on every mapped property). */
export function fingerprint(values: Record<string, unknown>, propertyIds: string[]) {
  return propertyIds.map((id) => JSON.stringify(values[id] ?? null)).join("|");
}
