import { z } from "zod";
import { isISODate } from "@/lib/dates";
import { evaluateFormula, FormulaError, type Value } from "./formula";

export const PROPERTY_TYPES = {
  text: { label: "Texto", numeric: false },
  long_text: { label: "Texto largo", numeric: false },
  integer: { label: "Número entero", numeric: true },
  decimal: { label: "Número decimal", numeric: true },
  percent: { label: "Porcentaje", numeric: true },
  currency: { label: "Moneda", numeric: true },
  duration: { label: "Duración (min)", numeric: true },
  rating: { label: "Valoración", numeric: true },
  scale: { label: "Escala", numeric: true },
  date: { label: "Fecha", numeric: false },
  datetime: { label: "Fecha y hora", numeric: false },
  checkbox: { label: "Casilla", numeric: false },
  select: { label: "Selección", numeric: false },
  multi_select: { label: "Selección múltiple", numeric: false },
  status: { label: "Estado", numeric: false },
  url: { label: "Enlace", numeric: false },
  formula: { label: "Fórmula", numeric: true },
  relation: { label: "Relación", numeric: false },
} as const;

export type PropertyType = keyof typeof PROPERTY_TYPES;
export const PROPERTY_TYPE_LIST = Object.keys(PROPERTY_TYPES) as PropertyType[];

export type SelectOption = { id: string; label: string };
export type PropertyConfig = {
  options?: SelectOption[];
  decimals?: number;
  currency?: string;
  unit?: string;
  min?: number;
  max?: number;
  formula?: string;
  targetTrackerId?: string;
};

export type Property = {
  id: string;
  name: string;
  type: PropertyType;
  config: PropertyConfig;
  position: number;
  is_title: boolean;
  required: boolean;
};

export type EntryValues = Record<string, unknown>;

const optionSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().trim().min(1).max(60),
});

/** Validate a property's configuration for its type. */
export const configSchema = z
  .object({
    options: z.array(optionSchema).max(100).optional(),
    decimals: z.number().int().min(0).max(6).optional(),
    currency: z
      .string()
      .regex(/^[A-Z]{3}$/, "Código de moneda de 3 letras (EUR, USD…).")
      .optional(),
    unit: z.string().trim().max(16).optional(),
    min: z.number().optional(),
    max: z.number().optional(),
    formula: z.string().max(1000).optional(),
    targetTrackerId: z.uuid().optional(),
  })
  .refine((c) => c.min === undefined || c.max === undefined || c.max > c.min, {
    path: ["max"],
    error: "El máximo debe ser mayor que el mínimo.",
  });

export function ratingMax(p: Pick<Property, "config">) {
  return Math.min(Math.max(p.config.max ?? 5, 3), 10);
}
export function scaleRange(p: Pick<Property, "config">) {
  const min = p.config.min ?? 1;
  const max = p.config.max ?? 10;
  return { min, max: max > min ? max : min + 1 };
}

type Coerced = { ok: true; value: unknown } | { ok: false; error: string };
const fail = (error: string): Coerced => ({ ok: false, error });

/**
 * Normalise a raw input (form string, CSV cell or JSON) to the stored value for
 * a property. Empty → null. Errors are user-facing Spanish messages.
 */
export function coerceValue(p: Property, raw: unknown): Coerced {
  if (p.type === "formula" || p.type === "relation") return { ok: true, value: null };
  if (
    raw === undefined ||
    raw === null ||
    (typeof raw === "string" && raw.trim() === "") ||
    (Array.isArray(raw) && !raw.length)
  ) {
    return p.required ? fail(`«${p.name}» es obligatorio.`) : { ok: true, value: null };
  }
  const str = typeof raw === "string" ? raw.trim() : raw;
  const toNumber = (v: unknown) =>
    typeof v === "number"
      ? v
      : Number(String(v).replace(/\s/g, "").replace(/%$/, "").replace(",", "."));

  switch (p.type) {
    case "text":
      return String(str).length > 500
        ? fail(`«${p.name}»: máximo 500 caracteres.`)
        : { ok: true, value: String(str) };
    case "long_text":
      return String(str).length > 10000
        ? fail(`«${p.name}»: máximo 10 000 caracteres.`)
        : { ok: true, value: String(str) };
    case "integer": {
      const n = toNumber(str);
      if (!Number.isInteger(n)) return fail(`«${p.name}» debe ser un número entero.`);
      return Math.abs(n) > 1e12 ? fail(`«${p.name}» es demasiado grande.`) : { ok: true, value: n };
    }
    case "decimal":
    case "currency":
    case "percent": {
      const n = toNumber(str);
      if (!Number.isFinite(n)) return fail(`«${p.name}» debe ser un número.`);
      if (Math.abs(n) > 1e12) return fail(`«${p.name}» es demasiado grande.`);
      const d = p.type === "currency" ? 2 : (p.config.decimals ?? 6);
      return { ok: true, value: Number(n.toFixed(d)) };
    }
    case "duration": {
      // minutes; accepts 90, "1:30", "1h 30m", "45m"
      const s = String(str).toLowerCase();
      let minutes: number;
      const hm = /^(\d+):([0-5]\d)$/.exec(s);
      const words = /^(?:(\d+(?:[.,]\d+)?)\s*h)?\s*(?:(\d+)\s*m(?:in)?)?$/.exec(s);
      if (hm) minutes = Number(hm[1]) * 60 + Number(hm[2]);
      else if (words && (words[1] || words[2]))
        minutes = Number((words[1] ?? "0").replace(",", ".")) * 60 + Number(words[2] ?? 0);
      else minutes = toNumber(s);
      if (!Number.isFinite(minutes) || minutes < 0 || minutes > 60 * 24 * 366)
        return fail(`«${p.name}»: duración no válida (minutos o 1:30).`);
      return { ok: true, value: Math.round(minutes) };
    }
    case "rating": {
      const n = toNumber(str);
      const max = ratingMax(p);
      return Number.isInteger(n) && n >= 0 && n <= max
        ? { ok: true, value: n }
        : fail(`«${p.name}»: valoración entre 0 y ${max}.`);
    }
    case "scale": {
      const n = toNumber(str);
      const { min, max } = scaleRange(p);
      return Number.isFinite(n) && n >= min && n <= max
        ? { ok: true, value: n }
        : fail(`«${p.name}»: valor entre ${min} y ${max}.`);
    }
    case "date": {
      const s = String(str);
      const iso = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(s);
      const v = iso
        ? `${iso[3]}-${iso[2].padStart(2, "0")}-${iso[1].padStart(2, "0")}`
        : s.slice(0, 10);
      return isISODate(v)
        ? { ok: true, value: v }
        : fail(`«${p.name}»: fecha no válida (AAAA-MM-DD o DD/MM/AAAA).`);
    }
    case "datetime": {
      const d = new Date(String(str));
      return Number.isNaN(d.getTime())
        ? fail(`«${p.name}»: fecha y hora no válidas.`)
        : { ok: true, value: d.toISOString() };
    }
    case "checkbox": {
      if (typeof str === "boolean") return { ok: true, value: str };
      const s = String(str).toLowerCase();
      if (["true", "1", "sí", "si", "yes", "x", "✓"].includes(s)) return { ok: true, value: true };
      if (["false", "0", "no"].includes(s)) return { ok: true, value: false };
      return fail(`«${p.name}»: usa sí/no.`);
    }
    case "select":
    case "status": {
      const opts = p.config.options ?? [];
      const s = String(str);
      const match =
        opts.find((o) => o.id === s) ?? opts.find((o) => o.label.toLowerCase() === s.toLowerCase());
      return match ? { ok: true, value: match.id } : fail(`«${p.name}»: «${s}» no es una opción.`);
    }
    case "multi_select": {
      const opts = p.config.options ?? [];
      const items = Array.isArray(str)
        ? str.map(String)
        : String(str)
            .split(/[,;]/)
            .map((s) => s.trim())
            .filter(Boolean);
      const ids: string[] = [];
      for (const it of items) {
        const match =
          opts.find((o) => o.id === it) ??
          opts.find((o) => o.label.toLowerCase() === it.toLowerCase());
        if (!match) return fail(`«${p.name}»: «${it}» no es una opción.`);
        if (!ids.includes(match.id)) ids.push(match.id);
      }
      return { ok: true, value: ids };
    }
    case "url": {
      const s = String(str);
      try {
        const u = new URL(s);
        return u.protocol === "https:" || u.protocol === "http:"
          ? { ok: true, value: u.toString() }
          : fail(`«${p.name}»: solo enlaces http(s).`);
      } catch {
        return fail(`«${p.name}»: enlace no válido.`);
      }
    }
  }
}

/** Validate a full set of values; returns clean values or field errors keyed by property id. */
export function validateEntry(properties: Property[], raw: EntryValues) {
  const values: EntryValues = {};
  const errors: Record<string, string> = {};
  for (const p of properties) {
    if (p.type === "formula" || p.type === "relation") continue;
    const res = coerceValue(p, raw[p.id]);
    if (!res.ok) errors[p.id] = res.error;
    else if (res.value !== null) values[p.id] = res.value;
  }
  return { values, errors, ok: Object.keys(errors).length === 0 };
}

/** Numeric view of a value (charts, aggregates, formulas). */
export function numericValue(p: Property, v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (
    p.type === "formula" &&
    typeof v === "string" &&
    v.trim() !== "" &&
    Number.isFinite(Number(v))
  )
    return Number(v);
  return null;
}

/** Resolve formula columns for one entry (formulas may reference earlier formulas by position). */
export function computeValues(
  properties: Property[],
  values: EntryValues,
  today: string,
): EntryValues {
  const out: EntryValues = { ...values };
  const props: Record<string, Value> = {};
  const toFormulaValue = (p: Property, v: unknown): Value => {
    if (v === undefined || v === null) return null;
    if (p.type === "select" || p.type === "status")
      return p.config.options?.find((o) => o.id === v)?.label ?? null;
    if (p.type === "multi_select")
      return (v as string[])
        .map((id) => p.config.options?.find((o) => o.id === id)?.label ?? "")
        .join(", ");
    return typeof v === "number" || typeof v === "string" || typeof v === "boolean" ? v : null;
  };
  for (const p of properties)
    if (p.type !== "formula") props[p.name] = toFormulaValue(p, values[p.id]);
  for (const p of [...properties].sort((a, b) => a.position - b.position)) {
    if (p.type !== "formula" || !p.config.formula) continue;
    try {
      const v = evaluateFormula(p.config.formula, { props, today });
      out[p.id] = v;
      props[p.name] = v;
    } catch (e) {
      out[p.id] = { error: e instanceof FormulaError ? e.message : "Error" };
      props[p.name] = null;
    }
  }
  return out;
}

const numberFmt = (decimals?: number) =>
  new Intl.NumberFormat("es-ES", { maximumFractionDigits: decimals ?? 2 });

export function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? (m ? `${h} h ${m} min` : `${h} h`) : `${m} min`;
}

/** Human-readable value for tables, cards and tooltips. */
export function formatValue(p: Property, v: unknown): string {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "object" && v !== null && "error" in v) return "⚠︎";
  switch (p.type) {
    case "integer":
    case "decimal":
      return `${numberFmt(p.config.decimals).format(v as number)}${p.config.unit ? ` ${p.config.unit}` : ""}`;
    case "percent":
      return `${numberFmt(p.config.decimals ?? 1).format(v as number)} %`;
    case "currency":
      return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: p.config.currency ?? "EUR",
      }).format(v as number);
    case "duration":
      return formatDuration(v as number);
    case "rating":
      return `${"★".repeat(v as number)}${"☆".repeat(Math.max(0, ratingMax(p) - (v as number)))}`;
    case "checkbox":
      return v ? "Sí" : "No";
    case "date":
      return new Intl.DateTimeFormat("es-ES", {
        timeZone: "UTC",
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(`${v}T00:00:00Z`));
    case "datetime":
      return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(v as string),
      );
    case "select":
    case "status":
      return p.config.options?.find((o) => o.id === v)?.label ?? "";
    case "multi_select":
      return (v as string[])
        .map((id) => p.config.options?.find((o) => o.id === id)?.label)
        .filter(Boolean)
        .join(", ");
    case "formula":
      return typeof v === "number"
        ? numberFmt(p.config.decimals ?? 2).format(v)
        : typeof v === "boolean"
          ? v
            ? "Sí"
            : "No"
          : String(v);
    default:
      return String(v);
  }
}

export function newOptionId() {
  return Math.random().toString(36).slice(2, 10);
}
