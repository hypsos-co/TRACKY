import { describe, expect, it } from "vitest";
import {
  addDays,
  addMonths,
  dayDiff,
  dueLabel,
  isISODate,
  monthGrid,
  startOfWeek,
  todayIn,
  utcToZoned,
  weekdayIndex,
  zonedToUtc,
} from "@/lib/dates";
import { parseQuickAdd } from "@/lib/tasks/quick-add";
import { groupTasks, progressOf, sectionOf } from "@/lib/tasks/grouping";

const MONDAY = "2026-11-23";

describe("dates", () => {
  it("validates and shifts calendar days", () => {
    expect(isISODate("2026-02-29")).toBe(false);
    expect(isISODate("2028-02-29")).toBe(true);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(dayDiff("2026-11-23", "2026-12-01")).toBe(8);
  });

  it("builds Monday-first weeks and a 42-day month grid", () => {
    expect(weekdayIndex(MONDAY)).toBe(0);
    expect(startOfWeek("2026-11-29")).toBe(MONDAY);
    const grid = monthGrid("2026-11-15");
    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe("2026-10-26");
    expect(grid).toContain("2026-11-30");
  });

  it("computes today in the user's time zone", () => {
    const instant = new Date("2026-11-23T23:30:00Z");
    expect(todayIn("UTC", instant)).toBe("2026-11-23");
    expect(todayIn("Europe/Madrid", instant)).toBe("2026-11-24");
    expect(todayIn("America/Mexico_City", instant)).toBe("2026-11-23");
  });

  it("converts wall time ↔ UTC across DST", () => {
    expect(zonedToUtc("2026-07-01", "10:00", "Europe/Madrid").toISOString()).toBe(
      "2026-07-01T08:00:00.000Z",
    );
    expect(zonedToUtc("2026-12-01", "10:00", "Europe/Madrid").toISOString()).toBe(
      "2026-12-01T09:00:00.000Z",
    );
    expect(utcToZoned(new Date("2026-12-01T09:00:00Z"), "Europe/Madrid")).toEqual({
      day: "2026-12-01",
      time: "10:00",
      minutes: 600,
    });
  });

  it("labels due days relative to today", () => {
    expect(dueLabel(MONDAY, MONDAY)).toBe("Hoy");
    expect(dueLabel("2026-11-24", MONDAY)).toBe("Mañana");
    expect(dueLabel("2026-11-22", MONDAY)).toBe("Ayer");
    expect(dueLabel("2026-11-26", MONDAY)).toBe("Jueves");
  });
});

describe("parseQuickAdd", () => {
  it("extracts date, time, priority and tags", () => {
    expect(parseQuickAdd("Llamar a Ana mañana 17:00 !alta #casa", MONDAY)).toEqual({
      title: "Llamar a Ana",
      dueDate: "2026-11-24",
      dueTime: "17:00",
      priority: 3,
      tags: ["casa"],
    });
  });

  it("understands weekdays (today included), pasado mañana and dd/mm", () => {
    expect(parseQuickAdd("Gimnasio lunes", MONDAY).dueDate).toBe(MONDAY);
    expect(parseQuickAdd("Revisión el viernes", MONDAY).dueDate).toBe("2026-11-27");
    expect(parseQuickAdd("Viaje pasado mañana", MONDAY).dueDate).toBe("2026-11-25");
    expect(parseQuickAdd("Renovar DNI 5/1", MONDAY).dueDate).toBe("2027-01-05");
    expect(parseQuickAdd("Factura 31/12/2026", MONDAY).dueDate).toBe("2026-12-31");
  });

  it("time alone means today; numbers in the title are kept", () => {
    const r = parseQuickAdd("Comprar 3 libros 9h !2", MONDAY);
    expect(r).toMatchObject({
      title: "Comprar 3 libros",
      dueDate: MONDAY,
      dueTime: "09:00",
      priority: 2,
    });
  });

  it("leaves plain titles untouched", () => {
    expect(parseQuickAdd("  Leer   el informe ", MONDAY)).toEqual({
      title: "Leer el informe",
      tags: [],
    });
    expect(parseQuickAdd("Precio 40/50 euros", MONDAY).dueDate).toBeUndefined();
  });
});

describe("task grouping", () => {
  const t = (
    due: string | null,
    extra: Partial<{ completed_at: string; priority: number }> = {},
  ) => ({
    due_date: due,
    completed_at: extra.completed_at ?? null,
    priority: extra.priority ?? 0,
    position: 0,
    created_at: "2026-11-01",
  });

  it("assigns sections by due date", () => {
    expect(sectionOf(t("2026-11-20"), MONDAY)).toBe("overdue");
    expect(sectionOf(t(MONDAY), MONDAY)).toBe("today");
    expect(sectionOf(t("2026-11-30"), MONDAY)).toBe("upcoming");
    expect(sectionOf(t("2026-12-15"), MONDAY)).toBe("later");
    expect(sectionOf(t(null), MONDAY)).toBe("someday");
    expect(sectionOf(t(MONDAY, { completed_at: "2026-11-23T10:00:00Z" }), MONDAY)).toBe("done");
  });

  it("orders by date then priority and drops empty sections", () => {
    const groups = groupTasks([t(MONDAY), t(MONDAY, { priority: 4 }), t(null)], MONDAY);
    expect(groups.map((g) => g.key)).toEqual(["today", "someday"]);
    expect(groups[0].tasks[0].priority).toBe(4);
  });

  it("progress ignores canceled tasks", () => {
    expect(
      progressOf([{ category: "done" }, { category: "todo" }, { category: "canceled" }]),
    ).toEqual({ done: 1, total: 2, ratio: 0.5 });
    expect(progressOf([])).toEqual({ done: 0, total: 0, ratio: 0 });
  });
});
