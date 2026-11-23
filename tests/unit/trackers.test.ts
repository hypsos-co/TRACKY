import { describe, expect, it } from "vitest";
import {
  coerceValue,
  computeValues,
  formatValue,
  validateEntry,
  type Property,
} from "@/lib/trackers/properties";
import {
  applyFilters,
  applySort,
  autoMap,
  parseCSV,
  projection,
  series,
  stats,
} from "@/lib/trackers/analytics";
import { TRACKER_TEMPLATES } from "@/lib/trackers/templates";
import { checkFormula } from "@/lib/trackers/formula";

const prop = (over: Partial<Property> & Pick<Property, "id" | "type">): Property => ({
  name: over.id,
  config: {},
  position: 0,
  is_title: false,
  required: false,
  ...over,
});

describe("coerceValue", () => {
  it("parses numbers in Spanish format and validates integers", () => {
    expect(coerceValue(prop({ id: "w", type: "decimal" }), "81,5")).toEqual({
      ok: true,
      value: 81.5,
    });
    expect(coerceValue(prop({ id: "n", type: "integer" }), "3.5").ok).toBe(false);
    expect(coerceValue(prop({ id: "p", type: "percent" }), "23%")).toEqual({ ok: true, value: 23 });
  });
  it("understands durations and dates", () => {
    const d = prop({ id: "d", type: "duration" });
    expect(coerceValue(d, "1:30")).toEqual({ ok: true, value: 90 });
    expect(coerceValue(d, "1h 15m")).toEqual({ ok: true, value: 75 });
    expect(coerceValue(d, "45")).toEqual({ ok: true, value: 45 });
    expect(coerceValue(prop({ id: "f", type: "date" }), "5/1/2026")).toEqual({
      ok: true,
      value: "2026-01-05",
    });
    expect(coerceValue(prop({ id: "f", type: "date" }), "2026-02-30").ok).toBe(false);
  });
  it("maps select labels to option ids and rejects unknown options", () => {
    const s = prop({ id: "s", type: "select", config: { options: [{ id: "o1", label: "Casa" }] } });
    expect(coerceValue(s, "casa")).toEqual({ ok: true, value: "o1" });
    expect(coerceValue(s, "Coche").ok).toBe(false);
    const m = prop({
      id: "m",
      type: "multi_select",
      config: {
        options: [
          { id: "a", label: "A" },
          { id: "b", label: "B" },
        ],
      },
    });
    expect(coerceValue(m, "A, B, a")).toEqual({ ok: true, value: ["a", "b"] });
  });
  it("enforces required, rating and scale ranges, and safe URLs", () => {
    expect(coerceValue(prop({ id: "r", type: "text", required: true }), " ").ok).toBe(false);
    expect(coerceValue(prop({ id: "r", type: "rating" }), "6").ok).toBe(false);
    expect(
      coerceValue(prop({ id: "s", type: "scale", config: { min: 1, max: 10 } }), "11").ok,
    ).toBe(false);
    expect(coerceValue(prop({ id: "u", type: "url" }), "javascript:alert(1)").ok).toBe(false);
    expect(coerceValue(prop({ id: "u", type: "url" }), "https://tracky.app").ok).toBe(true);
  });
});

describe("entries and formulas", () => {
  const props = [
    prop({ id: "dur", name: "Duración", type: "duration" }),
    prop({
      id: "h",
      name: "Horas",
      type: "formula",
      position: 1,
      config: { formula: "round({Duración} / 60, 1)" },
    }),
    prop({
      id: "ok",
      name: "Bien",
      type: "formula",
      position: 2,
      config: { formula: "{Horas} >= 7" },
    }),
  ];
  it("validates a whole entry and evaluates chained formulas", () => {
    const { values, ok } = validateEntry(props, { dur: "7:30" });
    expect(ok).toBe(true);
    const computed = computeValues(props, values, "2026-11-23");
    expect(computed.h).toBe(7.5);
    expect(computed.ok).toBe(true);
    expect(formatValue(props[0], 450)).toBe("7 h 30 min");
  });
  it("every template formula is valid", () => {
    for (const t of TRACKER_TEMPLATES) {
      const names = t.properties.map((p) => p.name);
      for (const p of t.properties)
        if (p.type === "formula")
          expect(checkFormula(p.config!.formula!, names), `${t.key}/${p.name}`).toBeNull();
    }
  });
});

describe("analytics", () => {
  const date = prop({ id: "d", type: "date" });
  const w = prop({ id: "w", type: "decimal" });
  const rows = [
    ["2026-11-01", 82],
    ["2026-11-02", 81.6],
    ["2026-11-02", 81.4],
    ["2026-11-05", 81],
    ["2026-11-09", 80.4],
    ["2026-11-12", 80],
  ].map(([d, v], i) => ({
    id: String(i),
    created_at: "2026-11-20T00:00:00Z",
    values: { d, w: v },
  }));

  it("aggregates per bucket", () => {
    const pts = series(rows, date, w, "avg", "day");
    expect(pts).toHaveLength(5);
    expect(pts[1]).toEqual({ x: "2026-11-02", y: 81.5, n: 2 });
    expect(series(rows, date, w, "count", "week").map((p) => p.y)).toEqual([1, 3, 2]);
  });

  it("computes stats, a downward trend and a projection", () => {
    const pts = series(rows, date, w, "avg", "day");
    const s = stats(pts)!;
    expect(s.min).toBe(80);
    expect(s.change).toBeCloseTo(-2);
    expect(s.slopePerDay!).toBeLessThan(0);
    expect(projection(pts, 7)!.y).toBeLessThan(80);
    expect(projection(pts.slice(0, 3), 7)).toBeNull();
  });

  it("filters and sorts", () => {
    expect(applyFilters(rows, [{ propertyId: "w", op: "lt", value: 81 }])).toHaveLength(2);
    expect(applySort(rows, { propertyId: "w", dir: "asc" })[0].values.w).toBe(80);
  });
});

describe("CSV", () => {
  it("parses quotes, semicolons and CRLF", () => {
    expect(parseCSV('Fecha;Peso;Nota\r\n2026-11-01;"81,5";"dijo ""hola"""\r\n')).toEqual([
      ["Fecha", "Peso", "Nota"],
      ["2026-11-01", "81,5", 'dijo "hola"'],
    ]);
  });
  it("auto-maps headers by name ignoring accents", () => {
    const props = [
      prop({ id: "a", name: "Categoría", type: "select" }),
      prop({ id: "b", name: "Importe", type: "currency" }),
    ];
    expect(autoMap(["categoria", "IMPORTE", "Otro"], props)).toEqual({ 0: "a", 1: "b", 2: null });
  });
});
