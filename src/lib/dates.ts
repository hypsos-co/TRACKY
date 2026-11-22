/**
 * Date helpers. Calendar days are handled as ISO strings (YYYY-MM-DD) so a
 * task due "on the 3rd" never shifts with time zones. Instants (events) are
 * real Dates converted to/from the user's IANA time zone with Intl only.
 */
export type ISODate = string;

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isISODate(value: unknown): value is ISODate {
  if (typeof value !== "string" || !ISO_RE.test(value)) return false;
  const d = parseISODate(value);
  return formatISODate(d) === value;
}

/** UTC midnight of a calendar day. */
export function parseISODate(day: ISODate): Date {
  const m = ISO_RE.exec(day);
  if (!m) throw new Error(`Invalid ISO date: ${day}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

export function formatISODate(date: Date): ISODate {
  return date.toISOString().slice(0, 10);
}

export function addDays(day: ISODate, n: number): ISODate {
  const d = parseISODate(day);
  d.setUTCDate(d.getUTCDate() + n);
  return formatISODate(d);
}

export function addMonths(day: ISODate, n: number): ISODate {
  const d = parseISODate(day);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  target.setUTCDate(Math.min(d.getUTCDate(), lastDay));
  return formatISODate(target);
}

export function dayDiff(from: ISODate, to: ISODate): number {
  return Math.round((parseISODate(to).getTime() - parseISODate(from).getTime()) / 86_400_000);
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(day: ISODate): number {
  return (parseISODate(day).getUTCDay() + 6) % 7;
}

export function startOfWeek(day: ISODate): ISODate {
  return addDays(day, -weekdayIndex(day));
}

export function startOfMonth(day: ISODate): ISODate {
  return `${day.slice(0, 7)}-01`;
}

/** 6×7 grid of days for the month containing `day`, weeks starting on Monday. */
export function monthGrid(day: ISODate): ISODate[] {
  const first = startOfWeek(startOfMonth(day));
  return Array.from({ length: 42 }, (_, i) => addDays(first, i));
}

/** Today's calendar day in an IANA time zone. */
export function todayIn(timeZone: string, now: Date = new Date()): ISODate {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return {
    y: get("year"),
    m: get("month"),
    d: get("day"),
    h: get("hour"),
    min: get("minute"),
    s: get("second"),
  };
}

/** Offset (ms) of a time zone at a given instant: local wall time − UTC. */
function tzOffset(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  return Date.UTC(p.y, p.m - 1, p.d, p.h, p.min, p.s) - date.getTime();
}

/** Wall-clock day + "HH:MM" in `timeZone` → UTC instant (DST-safe). */
export function zonedToUtc(day: ISODate, time: string, timeZone: string): Date {
  const [h, min] = time.split(":").map(Number);
  const d = parseISODate(day);
  const guess = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), h, min);
  let ts = guess - tzOffset(new Date(guess), timeZone);
  ts = guess - tzOffset(new Date(ts), timeZone);
  return new Date(ts);
}

/** UTC instant → wall-clock day and "HH:MM" in `timeZone`. */
export function utcToZoned(
  date: Date,
  timeZone: string,
): { day: ISODate; time: string; minutes: number } {
  const p = zonedParts(date, timeZone);
  const day = `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
  return {
    day,
    time: `${String(p.h).padStart(2, "0")}:${String(p.min).padStart(2, "0")}`,
    minutes: p.h * 60 + p.min,
  };
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
/** Format a calendar day in Spanish (computed in UTC, so the day never shifts). */
export function formatDay(day: ISODate, options: Intl.DateTimeFormatOptions): string {
  const key = JSON.stringify(options);
  let fmt = fmtCache.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("es-ES", { timeZone: "UTC", ...options });
    fmtCache.set(key, fmt);
  }
  return fmt.format(parseISODate(day));
}

export function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Human label for a due day relative to today: Hoy, Mañana, Ayer, "lun 24 nov"… */
export function dueLabel(due: ISODate, today: ISODate): string {
  const diff = dayDiff(today, due);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  if (diff === -1) return "Ayer";
  if (diff > 1 && diff < 7) return capitalize(formatDay(due, { weekday: "long" }));
  const sameYear = due.slice(0, 4) === today.slice(0, 4);
  return formatDay(
    due,
    sameYear
      ? { day: "numeric", month: "short" }
      : { day: "numeric", month: "short", year: "numeric" },
  );
}
