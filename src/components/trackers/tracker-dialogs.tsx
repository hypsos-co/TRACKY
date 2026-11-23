"use client";

import { useMemo, useState, useTransition } from "react";
import { count } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X } from "lucide-react";
import {
  deleteEntry,
  deleteProperty,
  deleteTracker,
  deleteView,
  saveEntry,
  saveProperty,
  saveView,
  updateTracker,
} from "@/lib/trackers/actions";
import { checkFormula, FORMULA_FUNCTIONS } from "@/lib/trackers/formula";
import {
  computeValues,
  formatValue,
  newOptionId,
  PROPERTY_TYPE_LIST,
  PROPERTY_TYPES,
  type Property,
  type PropertyConfig,
  type PropertyType,
} from "@/lib/trackers/properties";
import { AGG_LABELS, BUCKET_LABELS, type Aggregation, type Bucket } from "@/lib/trackers/analytics";
import type { TrackerFull, TrackerView } from "@/lib/trackers/data";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Select, Textarea } from "@/components/ui/inputs";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { ValueInput } from "./value-input";

export type EntryDraft = { id: string | null; values: Record<string, unknown> };

/** Create / edit one record. */
export function EntryDialog({
  tracker,
  draft,
  onClose,
  today,
  relationOptions,
}: {
  tracker: TrackerFull;
  draft: EntryDraft | null;
  onClose: () => void;
  today: string;
  relationOptions: Record<string, { id: string; label: string }[]>;
}) {
  return (
    <Dialog
      open={Boolean(draft)}
      onClose={onClose}
      title={draft?.id ? "Editar registro" : "Nuevo registro"}
      variant="sheet"
    >
      {draft ? (
        <EntryForm
          key={draft.id ?? "new"}
          tracker={tracker}
          draft={draft}
          onDone={onClose}
          today={today}
          relationOptions={relationOptions}
        />
      ) : null}
    </Dialog>
  );
}

function EntryForm({
  tracker,
  draft,
  onDone,
  today,
  relationOptions,
}: {
  tracker: TrackerFull;
  draft: EntryDraft;
  onDone: () => void;
  today: string;
  relationOptions: Record<string, { id: string; label: string }[]>;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(draft.values);
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [message, setMessage] = useState<string>();
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  const formulas = tracker.properties.filter((p) => p.type === "formula");
  const preview = useMemo(
    () => computeValues(tracker.properties, values, today),
    [tracker.properties, values, today],
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await saveEntry(tracker.id, draft.id, values);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setMessage(res.error);
        return;
      }
      toast(draft.id ? "Registro guardado" : "Registro añadido");
      onDone();
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 pb-2">
      {message ? <Alert tone="error">{message}</Alert> : null}
      {tracker.properties
        .filter((p) => p.type !== "formula")
        .map((p) => (
          <ValueInput
            key={p.id}
            property={p}
            value={values[p.id]}
            onChange={(v) => setValues((s) => ({ ...s, [p.id]: v }))}
            error={errors[p.id]?.[0]}
            relationOptions={relationOptions[p.id]}
          />
        ))}
      {formulas.length ? (
        <dl className="grid grid-cols-2 gap-2 rounded-2xl bg-surface p-3 text-[13px]">
          {formulas.map((p) => (
            <div key={p.id}>
              <dt className="text-fg-muted">{p.name}</dt>
              <dd className="font-medium">{formatValue(p, preview[p.id]) || "—"}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {draft.id ? "Guardar" : "Añadir registro"}
        </Button>
        {draft.id ? (
          confirm ? (
            <>
              <Button
                variant="danger"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await deleteEntry(tracker.id, draft.id!);
                    if (!res.ok) return setMessage(res.error);
                    toast("Registro eliminado");
                    onDone();
                  })
                }
              >
                Sí, eliminar
              </Button>
              <Button variant="ghost" onClick={() => setConfirm(false)}>
                Cancelar
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              onClick={() => setConfirm(true)}
              className="text-danger-text hover:text-danger-text"
            >
              <Trash2 className="size-4" aria-hidden /> Eliminar
            </Button>
          )
        ) : null}
      </div>
    </form>
  );
}

/** Manage the tracker's properties. */
export function PropertiesDialog({
  tracker,
  open,
  onClose,
  trackers,
}: {
  tracker: TrackerFull;
  open: boolean;
  onClose: () => void;
  trackers: { id: string; name: string }[];
}) {
  const [editing, setEditing] = useState<Property | "new" | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Propiedades"
      description="Define qué guardas en cada registro."
      variant="sheet"
    >
      {editing ? (
        <PropertyForm
          key={editing === "new" ? "new" : editing.id}
          tracker={tracker}
          property={editing === "new" ? null : editing}
          trackers={trackers}
          onDone={() => setEditing(null)}
        />
      ) : (
        <div className="flex flex-col gap-3 pb-2">
          <ul className="flex flex-col gap-1">
            {tracker.properties.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-surface"
              >
                <button
                  type="button"
                  onClick={() => setEditing(p)}
                  className="flex min-w-0 flex-1 flex-col text-left"
                >
                  <span className="truncate text-[15px] font-medium">
                    {p.name}
                    {p.is_title ? (
                      <span className="ml-2 text-[12px] font-normal text-fg-subtle">principal</span>
                    ) : null}
                    {tracker.date_property_id === p.id ? (
                      <span className="ml-2 text-[12px] font-normal text-fg-subtle">
                        eje temporal
                      </span>
                    ) : null}
                  </span>
                  <span className="text-[12px] text-fg-muted">{PROPERTY_TYPES[p.type].label}</span>
                </button>
                {!p.is_title ? (
                  <button
                    type="button"
                    aria-label={`Eliminar propiedad ${p.name}`}
                    disabled={pending}
                    onClick={() => {
                      if (
                        !window.confirm(
                          `¿Eliminar «${p.name}» y sus valores en todos los registros? No se puede deshacer.`,
                        )
                      )
                        return;
                      start(async () => {
                        const res = await deleteProperty(tracker.id, p.id);
                        toast(
                          res.ok ? "Propiedad eliminada" : res.error,
                          res.ok ? "success" : "error",
                        );
                      });
                    }}
                    className="grid size-9 place-items-center rounded-lg text-fg-subtle hover:bg-danger-surface hover:text-danger-text"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
          <Button variant="glass" onClick={() => setEditing("new")}>
            <Plus className="size-4" aria-hidden /> Nueva propiedad
          </Button>
        </div>
      )}
    </Dialog>
  );
}

function PropertyForm({
  tracker,
  property,
  trackers,
  onDone,
}: {
  tracker: TrackerFull;
  property: Property | null;
  trackers: { id: string; name: string }[];
  onDone: () => void;
}) {
  const [name, setName] = useState(property?.name ?? "");
  const [type, setType] = useState<PropertyType>(property?.type ?? "decimal");
  const [config, setConfig] = useState<PropertyConfig>(property?.config ?? {});
  const [required, setRequired] = useState(property?.required ?? false);
  const [isAxis, setIsAxis] = useState(property ? tracker.date_property_id === property.id : false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const toast = useToast();
  const others = tracker.properties.filter((p) => p.id !== property?.id).map((p) => p.name);
  const formulaError =
    type === "formula" && config.formula ? checkFormula(config.formula, others) : null;
  const set = (patch: Partial<PropertyConfig>) => setConfig((c) => ({ ...c, ...patch }));
  const hasOptions = type === "select" || type === "multi_select" || type === "status";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    start(async () => {
      const clean: PropertyConfig = { ...config };
      for (const k of Object.keys(clean) as (keyof PropertyConfig)[])
        if (clean[k] === undefined || (clean[k] as unknown) === "") delete clean[k];
      const res = await saveProperty(tracker.id, {
        id: property?.id,
        name,
        type,
        config: clean,
        required,
      });
      if (!res.ok) return setError(res.error);
      if (
        (type === "date" || type === "datetime") &&
        isAxis !== (tracker.date_property_id === res.data.id)
      ) {
        await updateTracker(tracker.id, {
          name: tracker.name,
          icon: tracker.icon,
          description: tracker.description,
          datePropertyId: isAxis ? res.data.id : null,
        });
      }
      toast("Propiedad guardada");
      onDone();
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 pb-2">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Field
        label="Nombre"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={60}
        autoFocus
      />
      <Select
        label="Tipo"
        value={type}
        onChange={(e) => setType(e.target.value as PropertyType)}
        disabled={Boolean(property)}
      >
        {PROPERTY_TYPE_LIST.map((t) => (
          <option key={t} value={t}>
            {PROPERTY_TYPES[t].label}
          </option>
        ))}
      </Select>
      {property ? (
        <p className="-mt-2 text-[12px] text-fg-subtle">
          El tipo no se puede cambiar una vez creada.
        </p>
      ) : null}

      {type === "decimal" || type === "integer" ? (
        <Field
          label="Unidad (opcional)"
          value={config.unit ?? ""}
          onChange={(e) => set({ unit: e.target.value })}
          placeholder="kg, km, páginas…"
          maxLength={16}
        />
      ) : null}
      {type === "decimal" || type === "percent" || type === "formula" ? (
        <Field
          label="Decimales"
          type="number"
          min={0}
          max={6}
          value={config.decimals ?? ""}
          onChange={(e) =>
            set({ decimals: e.target.value === "" ? undefined : Number(e.target.value) })
          }
          className="h-11"
        />
      ) : null}
      {type === "currency" ? (
        <Field
          label="Moneda (código)"
          value={config.currency ?? "EUR"}
          onChange={(e) => set({ currency: e.target.value.toUpperCase() })}
          maxLength={3}
        />
      ) : null}
      {type === "rating" ? (
        <Field
          label="Máximo de estrellas"
          type="number"
          min={3}
          max={10}
          value={config.max ?? 5}
          onChange={(e) => set({ max: Number(e.target.value) })}
          className="h-11"
        />
      ) : null}
      {type === "scale" ? (
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Mínimo"
            type="number"
            value={config.min ?? 1}
            onChange={(e) => set({ min: Number(e.target.value) })}
            className="h-11"
          />
          <Field
            label="Máximo"
            type="number"
            value={config.max ?? 10}
            onChange={(e) => set({ max: Number(e.target.value) })}
            className="h-11"
          />
        </div>
      ) : null}
      {hasOptions ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[13px] font-medium text-fg-muted">Opciones</legend>
          {(config.options ?? []).map((o, i) => (
            <div key={o.id} className="flex gap-2">
              <label className="sr-only" htmlFor={`opt-${o.id}`}>
                Opción {i + 1}
              </label>
              <input
                id={`opt-${o.id}`}
                value={o.label}
                maxLength={60}
                onChange={(e) =>
                  set({
                    options: config.options!.map((x) =>
                      x.id === o.id ? { ...x, label: e.target.value } : x,
                    ),
                  })
                }
                className="h-10 min-w-0 flex-1 rounded-[var(--radius-field)] border border-border bg-surface px-3 text-[14px] outline-none focus:border-ring"
              />
              <button
                type="button"
                aria-label={`Quitar opción ${o.label}`}
                onClick={() => set({ options: config.options!.filter((x) => x.id !== o.id) })}
                className="grid size-10 place-items-center rounded-lg text-fg-subtle hover:bg-surface-strong"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          ))}
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              set({
                options: [
                  ...(config.options ?? []),
                  { id: newOptionId(), label: `Opción ${(config.options?.length ?? 0) + 1}` },
                ],
              })
            }
          >
            <Plus className="size-4" aria-hidden /> Añadir opción
          </Button>
        </fieldset>
      ) : null}
      {type === "formula" ? (
        <div className="flex flex-col gap-2">
          <Textarea
            label="Fórmula"
            value={config.formula ?? ""}
            onChange={(e) => set({ formula: e.target.value })}
            error={formulaError ?? undefined}
            rows={3}
            placeholder="round({Peso} / ({Altura} ^ 2), 1)"
          />
          <p className="text-[12px] leading-relaxed text-fg-subtle">
            Usa propiedades entre llaves:{" "}
            {others
              .slice(0, 4)
              .map((n) => `{${n}}`)
              .join(", ")}
            . Funciones: {FORMULA_FUNCTIONS.join(", ")}. Operadores: + − * / % ^, comparaciones,
            and/or.
          </p>
        </div>
      ) : null}
      {type === "relation" ? (
        <Select
          label="Tracker relacionado"
          value={config.targetTrackerId ?? ""}
          onChange={(e) => set({ targetTrackerId: e.target.value || undefined })}
        >
          <option value="">Elige un tracker</option>
          {trackers.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </Select>
      ) : null}
      {type !== "formula" && type !== "relation" ? (
        <label className="flex items-center gap-3 text-[14px]">
          <input
            type="checkbox"
            checked={required}
            onChange={(e) => setRequired(e.target.checked)}
            className="size-4 accent-[var(--accent)]"
          />
          Obligatoria
        </label>
      ) : null}
      {type === "date" || type === "datetime" ? (
        <label className="flex items-center gap-3 text-[14px]">
          <input
            type="checkbox"
            checked={isAxis}
            onChange={(e) => setIsAxis(e.target.checked)}
            className="size-4 accent-[var(--accent)]"
          />
          Usar como eje temporal (gráficos y calendario)
        </label>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending || Boolean(formulaError)}>
          Guardar propiedad
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Volver
        </Button>
      </div>
    </form>
  );
}

const VIEW_LABELS: Record<TrackerView["type"], string> = {
  table: "Tabla",
  list: "Lista",
  cards: "Tarjetas",
  kanban: "Kanban",
  calendar: "Calendario",
  chart: "Gráfico",
};

/** Create / edit a view (type + type-specific options). */
export function ViewDialog({
  tracker,
  view,
  onClose,
  onSaved,
}: {
  tracker: TrackerFull;
  view: TrackerView | "new" | null;
  onClose: () => void;
  onSaved: (id: string) => void;
}) {
  return (
    <Dialog
      open={Boolean(view)}
      onClose={onClose}
      title={view === "new" ? "Nueva vista" : "Configurar vista"}
    >
      {view ? (
        <ViewForm
          key={view === "new" ? "new" : view.id}
          tracker={tracker}
          view={view === "new" ? null : view}
          onDone={onClose}
          onSaved={onSaved}
        />
      ) : null}
    </Dialog>
  );
}

function ViewForm({
  tracker,
  view,
  onDone,
  onSaved,
}: {
  tracker: TrackerFull;
  view: TrackerView | null;
  onDone: () => void;
  onSaved: (id: string) => void;
}) {
  const [name, setName] = useState(view?.name ?? "");
  const [type, setType] = useState<TrackerView["type"]>(view?.type ?? "table");
  const [config, setConfig] = useState<Record<string, unknown>>(view?.config ?? {});
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const toast = useToast();
  const set = (k: string, v: unknown) =>
    setConfig((c) => ({ ...c, [k]: v === "" ? undefined : v }));
  const numeric = tracker.properties.filter((p) => PROPERTY_TYPES[p.type].numeric);
  const groupable = tracker.properties.filter((p) => p.type === "select" || p.type === "status");
  const sortable = tracker.properties.filter(
    (p) => p.type !== "relation" && p.type !== "multi_select",
  );
  const sort = config.sort as { propertyId: string; dir: "asc" | "desc" } | undefined;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await saveView(tracker.id, {
        id: view?.id,
        name: name || VIEW_LABELS[type],
        type,
        config,
      });
      if (!res.ok) return setError(res.error);
      toast("Vista guardada");
      onSaved(res.data.id);
      onDone();
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 pb-2">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Field
        label="Nombre"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={VIEW_LABELS[type]}
        maxLength={60}
      />
      <Select
        label="Tipo de vista"
        value={type}
        onChange={(e) => setType(e.target.value as TrackerView["type"])}
      >
        {(Object.keys(VIEW_LABELS) as TrackerView["type"][]).map((t) => (
          <option key={t} value={t}>
            {VIEW_LABELS[t]}
          </option>
        ))}
      </Select>

      {type === "chart" ? (
        <>
          <Select
            label="Valor"
            value={(config.y as string) ?? ""}
            onChange={(e) => set("y", e.target.value)}
          >
            <option value="">Número de registros</option>
            {numeric.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <div className="grid grid-cols-3 gap-3">
            <Select
              label="Forma"
              value={(config.kind as string) ?? "line"}
              onChange={(e) => set("kind", e.target.value)}
            >
              <option value="line">Línea</option>
              <option value="bar">Barras</option>
            </Select>
            <Select
              label="Cálculo"
              value={(config.agg as string) ?? "avg"}
              onChange={(e) => set("agg", e.target.value)}
            >
              {(Object.keys(AGG_LABELS) as Aggregation[]).map((a) => (
                <option key={a} value={a}>
                  {AGG_LABELS[a]}
                </option>
              ))}
            </Select>
            <Select
              label="Agrupar por"
              value={(config.bucket as string) ?? "day"}
              onChange={(e) => set("bucket", e.target.value)}
            >
              {(Object.keys(BUCKET_LABELS) as Bucket[]).map((b) => (
                <option key={b} value={b}>
                  {BUCKET_LABELS[b]}
                </option>
              ))}
            </Select>
          </div>
          {!tracker.date_property_id ? (
            <p className="text-[12px] text-fg-subtle">
              Sin propiedad de fecha como eje temporal se usa la fecha de creación de cada registro.
            </p>
          ) : null}
        </>
      ) : null}
      {type === "kanban" ? (
        groupable.length ? (
          <Select
            label="Agrupar por"
            value={(config.groupBy as string) ?? ""}
            onChange={(e) => set("groupBy", e.target.value)}
          >
            <option value="">Elige una propiedad</option>
            {groupable.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        ) : (
          <Alert tone="info">Para un kanban añade una propiedad de tipo Selección o Estado.</Alert>
        )
      ) : null}
      {type === "table" || type === "list" || type === "cards" ? (
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Ordenar por"
            value={sort?.propertyId ?? ""}
            onChange={(e) =>
              set(
                "sort",
                e.target.value
                  ? { propertyId: e.target.value, dir: sort?.dir ?? "desc" }
                  : undefined,
              )
            }
          >
            <option value="">Más recientes primero</option>
            {sortable.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <Select
            label="Dirección"
            value={sort?.dir ?? "desc"}
            disabled={!sort}
            onChange={(e) => sort && set("sort", { ...sort, dir: e.target.value })}
          >
            <option value="asc">Ascendente</option>
            <option value="desc">Descendente</option>
          </Select>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          Guardar vista
        </Button>
        {view ? (
          <Button
            variant="ghost"
            className="text-danger-text hover:text-danger-text"
            disabled={pending}
            onClick={() => {
              if (!window.confirm(`¿Eliminar la vista «${view.name}»? Los registros no se borran.`))
                return;
              start(async () => {
                const res = await deleteView(tracker.id, view.id);
                if (!res.ok) return setError(res.error);
                toast("Vista eliminada");
                onDone();
              });
            }}
          >
            <Trash2 className="size-4" aria-hidden /> Eliminar vista
          </Button>
        ) : null}
      </div>
    </form>
  );
}

/** Rename / describe / delete the tracker. */
export function TrackerSettingsDialog({
  tracker,
  open,
  onClose,
}: {
  tracker: TrackerFull;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={open} onClose={onClose} title="Ajustes del tracker">
      {open ? <TrackerSettingsForm tracker={tracker} onClose={onClose} /> : null}
    </Dialog>
  );
}

function TrackerSettingsForm({ tracker, onClose }: { tracker: TrackerFull; onClose: () => void }) {
  const [name, setName] = useState(tracker.name);
  const [icon, setIcon] = useState(tracker.icon ?? "");
  const [description, setDescription] = useState(tracker.description ?? "");
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  return (
    <form
      noValidate
      className="flex flex-col gap-4 pb-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await updateTracker(tracker.id, {
            name,
            icon: icon || null,
            description: description || null,
            datePropertyId: tracker.date_property_id,
          });
          if (!res.ok) return setError(res.error);
          toast("Tracker guardado");
          onClose();
        });
      }}
    >
      {error ? <Alert tone="error">{error}</Alert> : null}
      <div className="grid grid-cols-[5rem_1fr] gap-3">
        <Field
          label="Icono"
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          maxLength={4}
          placeholder="📈"
        />
        <Field
          label="Nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
        />
      </div>
      <Textarea
        label="Descripción"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={2000}
        rows={2}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          Guardar
        </Button>
        {confirm ? (
          <Button
            variant="danger"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await deleteTracker(tracker.id);
                if (!res.ok) return setError(res.error);
                toast("Tracker eliminado");
                router.push("/trackers");
              })
            }
          >
            Sí, eliminar tracker y {count(tracker.entries.length, "registro")}
          </Button>
        ) : (
          <Button
            variant="ghost"
            className="text-danger-text hover:text-danger-text"
            onClick={() => setConfirm(true)}
          >
            <Trash2 className="size-4" aria-hidden /> Eliminar tracker
          </Button>
        )}
      </div>
    </form>
  );
}
