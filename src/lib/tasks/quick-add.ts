import { addDays, type ISODate, isISODate, weekdayIndex } from "@/lib/dates";

export type QuickAdd = {
  title: string;
  dueDate?: ISODate;
  dueTime?: string;
  priority?: number;
  tags: string[];
};

const WEEKDAYS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];
const PRIORITY_WORDS: Record<string, number> = { baja: 1, media: 2, alta: 3, urgente: 4 };

const strip = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Parse natural Spanish shorthand from a task title.
 *   "Llamar a Ana mañana 17:00 !alta #casa" →
 *   { title: "Llamar a Ana", dueDate: tomorrow, dueTime: "17:00", priority: 3, tags: ["casa"] }
 * Supports: hoy, mañana, pasado mañana, weekday names (next occurrence, today
 * included), dd/mm[/yyyy], HH:MM or 17h, !1-!4 or !baja/!media/!alta/!urgente, #tags.
 */
export function parseQuickAdd(input: string, today: ISODate): QuickAdd {
  let text = ` ${input.trim()} `;
  const result: QuickAdd = { title: "", tags: [] };

  text = text.replace(/\s#([\p{L}\p{N}_-]{1,40})(?=\s)/gu, (_, tag: string) => {
    if (!result.tags.includes(tag)) result.tags.push(tag);
    return " ";
  });

  text = text.replace(/\s!([1-4]|[a-záéíóú]+)(?=\s)/giu, (match, value: string) => {
    const n = /^[1-4]$/.test(value) ? Number(value) : PRIORITY_WORDS[strip(value)];
    if (!n) return match;
    result.priority = n;
    return " ";
  });

  text = text.replace(
    /\s(?:a las\s)?([01]?\d|2[0-3])(?::([0-5]\d)|h)(?=\s)/giu,
    (_, h: string, m?: string) => {
      result.dueTime = `${h.padStart(2, "0")}:${m ?? "00"}`;
      return " ";
    },
  );

  const setDay = (day: ISODate) => {
    if (!result.dueDate) result.dueDate = day;
  };

  text = text.replace(/\s(pasado\s+mañana|pasado\s+manana)(?=\s)/giu, () => {
    setDay(addDays(today, 2));
    return " ";
  });
  text = text.replace(/\s(hoy|mañana|manana)(?=\s)/giu, (_, word: string) => {
    setDay(strip(word) === "hoy" ? today : addDays(today, 1));
    return " ";
  });
  text = text.replace(
    /\s(?:el\s)?(lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)(?=\s)/giu,
    (_, word: string) => {
      const target = WEEKDAYS.indexOf(strip(word));
      const delta = (target - weekdayIndex(today) + 7) % 7;
      setDay(addDays(today, delta));
      return " ";
    },
  );
  text = text.replace(
    /\s(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?(?=\s)/gu,
    (match, d: string, m: string, y?: string) => {
      let year = y ?? today.slice(0, 4);
      let candidate = `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      if (!isISODate(candidate)) return match;
      if (!y && candidate < today) {
        year = String(Number(year) + 1);
        candidate = `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
      }
      setDay(candidate);
      return " ";
    },
  );

  if (result.dueTime && !result.dueDate) result.dueDate = today;
  result.title = text.replace(/\s+/g, " ").trim();
  return result;
}
