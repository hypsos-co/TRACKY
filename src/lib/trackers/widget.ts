import type { ISODate } from "@/lib/dates";
import { dayOf, defaultChartSpec, series, type ChartSpec, type Point } from "./analytics";
import { computeValues, formatValue, type Property } from "./properties";

/** Serializable summary of one tracker for the dashboard widgets. */
export type TrackerWidgetData = {
  id: string;
  name: string;
  icon: string | null;
  spec: ChartSpec;
  /** Chart points (last 60 buckets). */
  points: Point[];
  /** Last recorded value per day of the main numeric property. */
  latest: { value: number; day: ISODate; previous: number | null } | null;
  lastEntry: { title: string; day: ISODate | null } | null;
  entries: number;
};

type TrackerInput = {
  id: string;
  name: string;
  icon: string | null;
  date_property_id: string | null;
  properties: Property[];
  views: { type: string; config: Record<string, unknown> }[];
  entries: { id: string; values: Record<string, unknown>; created_at: string }[];
};

export function buildTrackerWidget(tracker: TrackerInput, today: string): TrackerWidgetData {
  const spec = defaultChartSpec(tracker);
  const dateProp = tracker.properties.find((p) => p.id === tracker.date_property_id) ?? null;
  const titleProp = tracker.properties.find((p) => p.is_title) ?? tracker.properties[0];
  const rows = tracker.entries.map((e) => ({
    id: e.id,
    created_at: e.created_at,
    values: computeValues(tracker.properties, e.values, today),
  }));

  const points = series(rows, dateProp, spec.y, spec.agg, spec.bucket).slice(-60);
  const daily = spec.y ? series(rows, dateProp, spec.y, "last", "day") : [];
  const last = daily.at(-1);

  const newest = [...rows].sort((a, b) => {
    const da = dayOf(a, dateProp) ?? "";
    const db = dayOf(b, dateProp) ?? "";
    return da === db ? (a.created_at < b.created_at ? 1 : -1) : da < db ? 1 : -1;
  })[0];

  return {
    id: tracker.id,
    name: tracker.name,
    icon: tracker.icon,
    spec,
    points,
    latest: last ? { value: last.y, day: last.x, previous: daily.at(-2)?.y ?? null } : null,
    lastEntry: newest
      ? {
          title: titleProp ? formatValue(titleProp, newest.values[titleProp.id]) : "",
          day: dayOf(newest, dateProp),
        }
      : null,
    entries: rows.length,
  };
}
