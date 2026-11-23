import { describe, expect, it } from "vitest";
import type { Property } from "@/lib/trackers/properties";
import { chartFormatter, chartSpec, chartTitle, defaultChartSpec } from "@/lib/trackers/analytics";
import { buildTrackerWidget } from "@/lib/trackers/widget";
import { needsTracker, widgetTrackerId, WIDGET_TYPES } from "@/lib/dashboard/widgets";

const prop = (over: Partial<Property> & Pick<Property, "id" | "type">): Property => ({
  name: over.id,
  config: {},
  position: 0,
  is_title: false,
  required: false,
  ...over,
});

const title = prop({ id: "t", name: "Nota", type: "text", is_title: true, position: 0 });
const date = prop({ id: "d", name: "Fecha", type: "date", position: 1 });
const weight = prop({
  id: "w",
  name: "Peso",
  type: "decimal",
  position: 2,
  config: { unit: "kg" },
});

describe("chart spec", () => {
  it("reads a view config defensively", () => {
    expect(chartSpec({ y: "w", agg: "max", bucket: "week", kind: "bar" }, [weight])).toEqual({
      y: weight,
      agg: "max",
      bucket: "week",
      kind: "bar",
    });
    // unknown values fall back; a non-numeric y becomes a count
    expect(chartSpec({ y: "t", agg: "nope", bucket: "year" }, [title, weight])).toEqual({
      y: null,
      agg: "count",
      bucket: "day",
      kind: "bar",
    });
  });
  it("defaults to the first chart view, else the first numeric property", () => {
    const views = [{ type: "chart", config: { y: "w", agg: "last", bucket: "month" } }];
    expect(defaultChartSpec({ properties: [title, weight], views }).agg).toBe("last");
    const spec = defaultChartSpec({ properties: [title, date, weight], views: [] });
    expect(spec).toMatchObject({ y: weight, agg: "avg", bucket: "day", kind: "line" });
    expect(chartTitle(spec)).toBe("Peso · Media por día");
    expect(defaultChartSpec({ properties: [title], views: [] })).toMatchObject({
      y: null,
      agg: "count",
    });
  });
  it("formats with the property's unit, counts as plain numbers", () => {
    const spec = defaultChartSpec({ properties: [weight], views: [] });
    expect(chartFormatter(spec)(80.456)).toContain("80,46");
    expect(chartFormatter({ ...spec, agg: "count" })(3)).toBe("3");
  });
});

describe("tracker widget data", () => {
  const tracker = {
    id: "x",
    name: "Peso",
    icon: null,
    date_property_id: "d",
    properties: [title, date, weight],
    views: [],
    entries: [
      { id: "1", values: { t: "a", d: "2026-11-01", w: 82 }, created_at: "2026-11-01T08:00:00Z" },
      { id: "3", values: { t: "c", d: "2026-11-10", w: 80.5 }, created_at: "2026-11-02T08:00:00Z" },
      { id: "2", values: { t: "b", d: "2026-11-05", w: 81 }, created_at: "2026-11-05T08:00:00Z" },
    ],
  };
  it("summarises the latest value, its change and the newest entry by date", () => {
    const data = buildTrackerWidget(tracker, "2026-11-23");
    expect(data.points.map((p) => p.x)).toEqual(["2026-11-01", "2026-11-05", "2026-11-10"]);
    expect(data.latest).toEqual({ value: 80.5, day: "2026-11-10", previous: 81 });
    expect(data.lastEntry).toEqual({ title: "c", day: "2026-11-10" });
    expect(data.entries).toBe(3);
  });
  it("handles an empty tracker", () => {
    const data = buildTrackerWidget({ ...tracker, entries: [] }, "2026-11-23");
    expect(data).toMatchObject({ points: [], latest: null, lastEntry: null, entries: 0 });
  });
});

describe("widget catalogue", () => {
  it("marks tracker widgets and reads their config", () => {
    expect(needsTracker("tracker_chart")).toBe(true);
    expect(needsTracker("tasks_today")).toBe(false);
    expect(Object.keys(WIDGET_TYPES)).toContain("tracker_latest");
    expect(widgetTrackerId({ trackerId: "abc" })).toBe("abc");
    expect(widgetTrackerId({ trackerId: 3 })).toBeNull();
  });
});
