import {
  addDays,
  addMonths,
  capitalize,
  formatDay,
  type ISODate,
  isISODate,
  monthGrid,
  startOfWeek,
} from "@/lib/dates";

export const VIEWS = ["day", "week", "month", "year"] as const;
export type CalendarViewKind = (typeof VIEWS)[number];
export const VIEW_LABELS: Record<CalendarViewKind, string> = {
  day: "Día",
  week: "Semana",
  month: "Mes",
  year: "Año",
};

export function parseView(v: unknown): CalendarViewKind {
  return VIEWS.includes(v as CalendarViewKind) ? (v as CalendarViewKind) : "month";
}

export function parseAnchor(v: unknown, today: ISODate): ISODate {
  return typeof v === "string" && isISODate(v) ? v : today;
}

/** Visible [from, to] days for a view. */
export function rangeFor(view: CalendarViewKind, anchor: ISODate): { from: ISODate; to: ISODate } {
  switch (view) {
    case "day":
      return { from: anchor, to: anchor };
    case "week": {
      const from = startOfWeek(anchor);
      return { from, to: addDays(from, 6) };
    }
    case "month": {
      const grid = monthGrid(anchor);
      return { from: grid[0], to: grid[41] };
    }
    case "year":
      return { from: `${anchor.slice(0, 4)}-01-01`, to: `${anchor.slice(0, 4)}-12-31` };
  }
}

export function shift(view: CalendarViewKind, anchor: ISODate, dir: -1 | 1): ISODate {
  if (view === "day") return addDays(anchor, dir);
  if (view === "week") return addDays(anchor, 7 * dir);
  if (view === "month") return addMonths(anchor, dir);
  return addMonths(anchor, 12 * dir);
}

export function titleFor(view: CalendarViewKind, anchor: ISODate): string {
  if (view === "day")
    return capitalize(
      formatDay(anchor, { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
    );
  if (view === "year") return anchor.slice(0, 4);
  if (view === "month") return capitalize(formatDay(anchor, { month: "long", year: "numeric" }));
  const from = startOfWeek(anchor);
  const to = addDays(from, 6);
  const sameMonth = from.slice(0, 7) === to.slice(0, 7);
  return sameMonth
    ? `${formatDay(from, { day: "numeric" })} – ${formatDay(to, { day: "numeric", month: "short", year: "numeric" })}`
    : `${formatDay(from, { day: "numeric", month: "short" })} – ${formatDay(to, { day: "numeric", month: "short", year: "numeric" })}`;
}
