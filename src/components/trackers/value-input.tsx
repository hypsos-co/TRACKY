"use client";

import { Star } from "lucide-react";
import { Field } from "@/components/ui/field";
import { Select, Textarea } from "@/components/ui/inputs";
import { ratingMax, scaleRange, type Property } from "@/lib/trackers/properties";
import { cn } from "@/lib/utils";

/** Form control for one tracker property, adapted to its type. */
export function ValueInput({
  property: p,
  value,
  onChange,
  error,
  relationOptions = [],
}: {
  property: Property;
  value: unknown;
  onChange: (v: unknown) => void;
  error?: string;
  relationOptions?: { id: string; label: string }[];
}) {
  const label = p.required ? `${p.name} *` : p.name;
  const errors = error ? [error] : undefined;
  const str = value === null || value === undefined ? "" : String(value);

  switch (p.type) {
    case "long_text":
      return (
        <Textarea
          label={label}
          value={str}
          onChange={(e) => onChange(e.target.value)}
          error={error}
          rows={3}
          maxLength={10000}
        />
      );
    case "integer":
    case "decimal":
    case "percent":
    case "currency":
      return (
        <Field
          label={`${label}${p.type === "percent" ? " (%)" : p.type === "currency" ? ` (${p.config.currency ?? "EUR"})` : p.config.unit ? ` (${p.config.unit})` : ""}`}
          inputMode="decimal"
          value={str}
          onChange={(e) => onChange(e.target.value)}
          errors={errors}
          className="h-11"
        />
      );
    case "duration":
      return (
        <Field
          label={`${label} (min o 1:30)`}
          value={str}
          onChange={(e) => onChange(e.target.value)}
          errors={errors}
          className="h-11"
        />
      );
    case "date":
      return (
        <Field
          label={label}
          type="date"
          value={str.slice(0, 10)}
          onChange={(e) => onChange(e.target.value)}
          errors={errors}
          className="h-11"
        />
      );
    case "datetime":
      return (
        <Field
          label={label}
          type="datetime-local"
          value={str ? new Date(str).toLocaleString("sv-SE").slice(0, 16).replace(" ", "T") : ""}
          onChange={(e) => onChange(e.target.value ? new Date(e.target.value).toISOString() : "")}
          errors={errors}
          className="h-11"
        />
      );
    case "checkbox":
      return (
        <label className="flex items-center gap-3 py-2 text-[14px]">
          <input
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
            className="size-4 accent-[var(--accent)]"
          />
          {label}
        </label>
      );
    case "select":
    case "status":
      return (
        <Select label={label} value={str} onChange={(e) => onChange(e.target.value)} error={error}>
          <option value="">—</option>
          {(p.config.options ?? []).map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </Select>
      );
    case "multi_select": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-[13px] font-medium text-fg-muted">{label}</legend>
          <div className="flex flex-wrap gap-2">
            {(p.config.options ?? []).map((o) => {
              const on = selected.includes(o.id);
              return (
                <button
                  key={o.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    onChange(on ? selected.filter((s) => s !== o.id) : [...selected, o.id])
                  }
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-[13px]",
                    on
                      ? "border-primary bg-primary text-primary-fg"
                      : "border-border text-fg-muted hover:text-fg",
                  )}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
          {error ? <p className="text-[12px] font-medium text-danger-text">{error}</p> : null}
        </fieldset>
      );
    }
    case "rating": {
      const n = typeof value === "number" ? value : Number(value) || 0;
      return (
        <fieldset>
          <legend className="mb-1.5 text-[13px] font-medium text-fg-muted">{label}</legend>
          <div className="flex gap-1" role="radiogroup" aria-label={p.name}>
            {Array.from({ length: ratingMax(p) }, (_, i) => i + 1).map((i) => (
              <button
                key={i}
                type="button"
                role="radio"
                aria-checked={n === i}
                aria-label={`${i} de ${ratingMax(p)}`}
                onClick={() => onChange(n === i ? 0 : i)}
                className="grid size-9 place-items-center rounded-lg hover:bg-surface-strong"
              >
                <Star
                  className={cn("size-5", i <= n ? "fill-primary text-primary" : "text-fg-subtle")}
                  aria-hidden
                />
              </button>
            ))}
          </div>
          {error ? <p className="text-[12px] font-medium text-danger-text">{error}</p> : null}
        </fieldset>
      );
    }
    case "scale": {
      const { min, max } = scaleRange(p);
      const n =
        typeof value === "number" ? value : value === "" || value == null ? null : Number(value);
      return (
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-fg-muted" htmlFor={`scale-${p.id}`}>
            {label}: <span className="text-fg">{n ?? "—"}</span>
          </label>
          <input
            id={`scale-${p.id}`}
            type="range"
            min={min}
            max={max}
            value={n ?? min}
            onChange={(e) => onChange(Number(e.target.value))}
            className="accent-[var(--accent)]"
          />
          {error ? <p className="text-[12px] font-medium text-danger-text">{error}</p> : null}
        </div>
      );
    }
    case "url":
      return (
        <Field
          label={label}
          type="url"
          inputMode="url"
          placeholder="https://"
          value={str}
          onChange={(e) => onChange(e.target.value)}
          errors={errors}
          className="h-11"
        />
      );
    case "relation": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-fg-muted" htmlFor={`rel-${p.id}`}>
            {p.name}
          </label>
          <select
            id={`rel-${p.id}`}
            multiple
            value={selected}
            onChange={(e) => onChange(Array.from(e.target.selectedOptions).map((o) => o.value))}
            className="min-h-24 rounded-[var(--radius-field)] border border-border bg-surface p-2 text-[14px] [&>option]:bg-surface-solid"
          >
            {relationOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="text-[12px] text-fg-subtle">Mantén pulsado Ctrl/⌘ para elegir varios</p>
        </div>
      );
    }
    case "formula":
      return null;
    default:
      return (
        <Field
          label={label}
          value={str}
          onChange={(e) => onChange(e.target.value)}
          errors={errors}
          maxLength={500}
          className="h-11"
        />
      );
  }
}
