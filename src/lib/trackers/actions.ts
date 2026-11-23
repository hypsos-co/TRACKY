"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { getContext } from "@/lib/workspace";
import type { Json } from "@/lib/supabase/database.types";

/** JSON object column (never null). */
type JsonObject = { [key: string]: Json | undefined };
import { checkFormula } from "./formula";
import {
  configSchema,
  PROPERTY_TYPE_LIST,
  validateEntry,
  type Property,
  type PropertyType,
} from "./properties";
import { getTemplate } from "./templates";

const uuid = z.uuid();
const VIEW_TYPES = ["table", "list", "cards", "kanban", "calendar", "chart"] as const;
const refresh = (id?: string) => {
  revalidatePath("/trackers");
  if (id) revalidatePath(`/trackers/${id}`);
  revalidatePath("/dashboard");
};

async function loadProperties(trackerId: string): Promise<Property[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tracker_properties")
    .select("id, name, type, config, position, is_title, required")
    .eq("tracker_id", trackerId)
    .order("position");
  return (data ?? []).map((p) => ({
    ...p,
    type: p.type as PropertyType,
    config: (p.config ?? {}) as Property["config"],
  }));
}

/** Replace property names inside a template/duplicated view config with ids. */
function remapConfig(config: Record<string, unknown>, map: (key: string) => string | undefined) {
  const out: Record<string, unknown> = { ...config };
  for (const k of ["y", "groupBy", "dateProperty"])
    if (typeof out[k] === "string") out[k] = map(out[k] as string) ?? null;
  return out;
}

const createSchema = z.object({
  name: z.string().trim().min(1, "Ponle un nombre.").max(120),
  icon: z.string().trim().max(16).nullable().optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  templateKey: z.string().max(40).optional(),
  duplicateFromId: uuid.optional(),
});

export async function createTracker(
  input: z.input<typeof createSchema>,
): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  const { workspace } = await getContext();
  const supabase = await createClient();

  let blueprint: {
    properties: {
      name: string;
      type: PropertyType;
      config: JsonObject;
      is_title: boolean;
      required: boolean;
      oldId?: string;
    }[];
    views: { name: string; type: string; config: Record<string, unknown> }[];
    date?: string;
    templateKey?: string;
    icon?: string | null;
    description?: string | null;
  };
  if (v.duplicateFromId) {
    const props = await loadProperties(v.duplicateFromId);
    if (!props.length) return fail("No se encontró el tracker a duplicar.");
    const [{ data: src }, { data: views }] = await Promise.all([
      supabase
        .from("trackers")
        .select("icon, description, date_property_id")
        .eq("id", v.duplicateFromId)
        .single(),
      supabase
        .from("tracker_views")
        .select("name, type, config")
        .eq("tracker_id", v.duplicateFromId)
        .order("position"),
    ]);
    const nameOf = new Map(props.map((p) => [p.id, p.name]));
    blueprint = {
      properties: props.map((p) => ({
        name: p.name,
        type: p.type,
        config: p.config as JsonObject,
        is_title: p.is_title,
        required: p.required,
        oldId: p.id,
      })),
      views: (views ?? []).map((w) => ({
        name: w.name,
        type: w.type,
        config: remapConfig((w.config ?? {}) as Record<string, unknown>, (id) => nameOf.get(id)),
      })),
      date: src?.date_property_id ? nameOf.get(src.date_property_id) : undefined,
      icon: src?.icon,
      description: src?.description,
    };
  } else if (v.templateKey) {
    const t = getTemplate(v.templateKey);
    if (!t) return fail("Plantilla desconocida.");
    blueprint = {
      properties: t.properties.map((p) => ({
        name: p.name,
        type: p.type,
        config: (p.config ?? {}) as JsonObject,
        is_title: Boolean(p.isTitle),
        required: Boolean(p.required),
      })),
      views: t.views.map((w) => ({ name: w.name, type: w.type, config: w.config ?? {} })),
      date: t.dateProperty,
      templateKey: t.key,
      icon: t.icon,
      description: t.description,
    };
  } else {
    blueprint = {
      properties: [
        { name: "Nombre", type: "text", config: {}, is_title: true, required: false },
        { name: "Fecha", type: "date", config: {}, is_title: false, required: false },
      ],
      views: [{ name: "Tabla", type: "table", config: {} }],
      date: "Fecha",
    };
  }

  const { data: tracker, error } = await supabase
    .from("trackers")
    .insert({
      workspace_id: workspace.id,
      name: v.name,
      icon: v.icon ?? blueprint.icon ?? null,
      description: v.description ?? blueprint.description ?? null,
      template_key: blueprint.templateKey ?? null,
      position: Date.now() / 1000,
    })
    .select("id")
    .single();
  if (error) return fail("No se pudo crear el tracker.");

  const { data: props, error: pErr } = await supabase
    .from("tracker_properties")
    .insert(
      blueprint.properties.map((p, i) => ({
        tracker_id: tracker.id,
        name: p.name,
        type: p.type,
        config: p.config,
        is_title: p.is_title,
        required: p.required,
        position: i + 1,
      })),
    )
    .select("id, name");
  if (pErr || !props) {
    await supabase.from("trackers").delete().eq("id", tracker.id);
    return fail("No se pudieron crear las propiedades.");
  }
  const idByName = new Map(props.map((p) => [p.name.toLowerCase(), p.id]));
  const byName = (n: string) => idByName.get(n.toLowerCase());
  if (blueprint.date && byName(blueprint.date))
    await supabase
      .from("trackers")
      .update({ date_property_id: byName(blueprint.date)! })
      .eq("id", tracker.id);
  if (blueprint.views.length)
    await supabase.from("tracker_views").insert(
      blueprint.views.map((w, i) => ({
        tracker_id: tracker.id,
        name: w.name,
        type: w.type,
        config: remapConfig(w.config, byName) as JsonObject,
        position: i + 1,
      })),
    );
  refresh();
  return ok({ id: tracker.id });
}

const trackerUpdate = z.object({
  name: z.string().trim().min(1, "Ponle un nombre.").max(120),
  icon: z.string().trim().max(16).nullable(),
  description: z.string().trim().max(2000).nullable(),
  datePropertyId: uuid.nullable(),
});

export async function updateTracker(
  id: string,
  input: z.input<typeof trackerUpdate>,
): Promise<ActionResult> {
  await requireUser();
  const parsed = trackerUpdate.safeParse(input);
  if (!uuid.safeParse(id).success) return fail("Identificador no válido.");
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("trackers")
    .update(
      {
        name: parsed.data.name,
        icon: parsed.data.icon || null,
        description: parsed.data.description || null,
        date_property_id: parsed.data.datePropertyId,
      },
      { count: "exact" },
    )
    .eq("id", id);
  if (error)
    return fail(
      error.code === "23514"
        ? "La propiedad del eje temporal debe ser de tipo fecha."
        : "No se pudo guardar.",
    );
  if (!count) return fail("El tracker no existe o no tienes permiso.");
  refresh(id);
  return ok(undefined);
}

export async function deleteTracker(id: string): Promise<ActionResult> {
  await requireUser();
  if (!uuid.safeParse(id).success) return fail("Identificador no válido.");
  const supabase = await createClient();
  const { error, count } = await supabase.from("trackers").delete({ count: "exact" }).eq("id", id);
  if (error || !count) return fail("No se pudo eliminar el tracker.");
  refresh();
  return ok(undefined);
}

const propertySchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1, "Ponle un nombre.").max(60, "Máximo 60 caracteres."),
  type: z.enum(PROPERTY_TYPE_LIST as [PropertyType, ...PropertyType[]]),
  config: configSchema,
  required: z.boolean(),
});

export async function saveProperty(
  trackerId: string,
  input: z.input<typeof propertySchema>,
): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  if (!uuid.safeParse(trackerId).success) return fail("Identificador no válido.");
  const parsed = propertySchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  const existing = await loadProperties(trackerId);
  const current = v.id ? existing.find((p) => p.id === v.id) : undefined;
  if (v.id && !current) return fail("La propiedad no existe.");
  if (current && current.type !== v.type)
    return fail("El tipo de una propiedad no se puede cambiar; crea una nueva.");
  if (existing.some((p) => p.id !== v.id && p.name.toLowerCase() === v.name.toLowerCase()))
    return fail("Ya hay una propiedad con ese nombre.");
  if (
    (v.type === "select" || v.type === "multi_select" || v.type === "status") &&
    !v.config.options?.length
  )
    return fail("Añade al menos una opción.");
  if (v.type === "formula") {
    if (!v.config.formula?.trim()) return fail("Escribe la fórmula.");
    const err = checkFormula(
      v.config.formula,
      existing.filter((p) => p.id !== v.id).map((p) => p.name),
    );
    if (err) return fail(err);
  }
  if (v.type === "relation" && !v.config.targetTrackerId)
    return fail("Elige el tracker relacionado.");

  const supabase = await createClient();
  if (current) {
    const { error } = await supabase
      .from("tracker_properties")
      .update({ name: v.name, config: v.config as JsonObject, required: v.required })
      .eq("id", current.id);
    if (error) return fail("No se pudo guardar la propiedad.");
    refresh(trackerId);
    return ok({ id: current.id });
  }
  const position = Math.max(0, ...existing.map((p) => p.position)) + 1;
  const { data, error } = await supabase
    .from("tracker_properties")
    .insert({
      tracker_id: trackerId,
      name: v.name,
      type: v.type,
      config: v.config as JsonObject,
      required: v.required,
      position,
    })
    .select("id")
    .single();
  if (error) return fail("No se pudo crear la propiedad.");
  refresh(trackerId);
  return ok({ id: data.id });
}

/** Deletes a property and strips its value from every entry of the tracker. */
export async function deleteProperty(trackerId: string, propertyId: string): Promise<ActionResult> {
  await requireUser();
  if (!uuid.safeParse(trackerId).success || !uuid.safeParse(propertyId).success)
    return fail("Identificador no válido.");
  const supabase = await createClient();
  const props = await loadProperties(trackerId);
  const prop = props.find((p) => p.id === propertyId);
  if (!prop) return fail("La propiedad no existe.");
  if (prop.is_title) return fail("La propiedad principal no se puede eliminar.");
  const { error } = await supabase.from("tracker_properties").delete().eq("id", propertyId);
  if (error) return fail("No se pudo eliminar la propiedad.");
  const { data: rows } = await supabase
    .from("tracker_entries")
    .select("id, values")
    .eq("tracker_id", trackerId)
    .not(`values->${propertyId}`, "is", null);
  for (const r of rows ?? []) {
    const values = { ...(r.values as JsonObject) };
    delete values[propertyId];
    await supabase.from("tracker_entries").update({ values }).eq("id", r.id);
  }
  refresh(trackerId);
  return ok(undefined);
}

async function setLinks(entryId: string, properties: Property[], raw: Record<string, unknown>) {
  const supabase = await createClient();
  for (const p of properties.filter((pp) => pp.type === "relation")) {
    if (!(p.id in raw)) continue;
    const targets = z.array(uuid).max(200).safeParse(raw[p.id]);
    if (!targets.success) continue;
    await supabase
      .from("tracker_entry_links")
      .delete()
      .eq("entry_id", entryId)
      .eq("property_id", p.id);
    if (targets.data.length)
      await supabase
        .from("tracker_entry_links")
        .insert(
          targets.data
            .filter((t) => t !== entryId)
            .map((t) => ({ entry_id: entryId, property_id: p.id, target_entry_id: t })),
        );
  }
}

export async function saveEntry(
  trackerId: string,
  entryId: string | null,
  raw: Record<string, unknown>,
): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  if (!uuid.safeParse(trackerId).success || (entryId && !uuid.safeParse(entryId).success))
    return fail("Identificador no válido.");
  const properties = await loadProperties(trackerId);
  const { values, errors, ok: valid } = validateEntry(properties, raw);
  if (!valid)
    return fail(
      Object.values(errors)[0],
      Object.fromEntries(Object.entries(errors).map(([k, m]) => [k, [m]])),
    );
  const supabase = await createClient();
  let id = entryId;
  if (entryId) {
    const { error, count } = await supabase
      .from("tracker_entries")
      .update({ values: values as JsonObject }, { count: "exact" })
      .eq("id", entryId)
      .eq("tracker_id", trackerId);
    if (error || !count) return fail("No se pudo guardar el registro.");
  } else {
    const { data, error } = await supabase
      .from("tracker_entries")
      .insert({ tracker_id: trackerId, values: values as JsonObject, position: Date.now() / 1000 })
      .select("id")
      .single();
    if (error) return fail("No se pudo crear el registro.");
    id = data.id;
  }
  await setLinks(id!, properties, raw);
  refresh(trackerId);
  return ok({ id: id! });
}

/** Quick edit of a single value (kanban drag, inline checkbox…). */
export async function setEntryValue(
  trackerId: string,
  entryId: string,
  propertyId: string,
  value: unknown,
): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("tracker_entries")
    .select("values")
    .eq("id", entryId)
    .eq("tracker_id", trackerId)
    .maybeSingle();
  if (!row) return fail("El registro no existe.");
  const res = await saveEntry(trackerId, entryId, {
    ...(row.values as Record<string, unknown>),
    [propertyId]: value,
  });
  return res.ok ? ok(undefined) : res;
}

export async function deleteEntry(trackerId: string, entryId: string): Promise<ActionResult> {
  await requireUser();
  if (!uuid.safeParse(entryId).success) return fail("Identificador no válido.");
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("tracker_entries")
    .delete({ count: "exact" })
    .eq("id", entryId)
    .eq("tracker_id", trackerId);
  if (error || !count) return fail("No se pudo eliminar el registro.");
  refresh(trackerId);
  return ok(undefined);
}

const viewSchema = z.object({
  id: uuid.optional(),
  name: z.string().trim().min(1, "Ponle un nombre.").max(60),
  type: z.enum(VIEW_TYPES),
  config: z
    .record(z.string(), z.unknown())
    .refine((c) => JSON.stringify(c).length < 7000, "Configuración demasiado grande."),
});

export async function saveView(
  trackerId: string,
  input: z.input<typeof viewSchema>,
): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  if (!uuid.safeParse(trackerId).success) return fail("Identificador no válido.");
  const parsed = viewSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  const supabase = await createClient();
  if (v.id) {
    const { error, count } = await supabase
      .from("tracker_views")
      .update({ name: v.name, type: v.type, config: v.config as JsonObject }, { count: "exact" })
      .eq("id", v.id)
      .eq("tracker_id", trackerId);
    if (error || !count) return fail("No se pudo guardar la vista.");
    refresh(trackerId);
    return ok({ id: v.id });
  }
  const { data, error } = await supabase
    .from("tracker_views")
    .insert({
      tracker_id: trackerId,
      name: v.name,
      type: v.type,
      config: v.config as JsonObject,
      position: Date.now() / 1000,
    })
    .select("id")
    .single();
  if (error) return fail("No se pudo crear la vista.");
  refresh(trackerId);
  return ok({ id: data.id });
}

export async function deleteView(trackerId: string, viewId: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("tracker_views")
    .delete({ count: "exact" })
    .eq("id", viewId)
    .eq("tracker_id", trackerId);
  if (error || !count) return fail("No se pudo eliminar la vista.");
  refresh(trackerId);
  return ok(undefined);
}

export type ImportRowError = { row: number; message: string };

/**
 * Bulk import (CSV/Excel rows already mapped to property ids on the client).
 * Every row is validated server-side; with `skipInvalid` false nothing is saved
 * if any row fails.
 */
export async function importEntries(
  trackerId: string,
  rows: Record<string, unknown>[],
  skipInvalid: boolean,
): Promise<ActionResult<{ inserted: number; errors: ImportRowError[] }>> {
  await requireUser();
  if (!uuid.safeParse(trackerId).success) return fail("Identificador no válido.");
  if (!Array.isArray(rows) || rows.length === 0) return fail("No hay filas para importar.");
  if (rows.length > 5000) return fail("Máximo 5000 filas por importación.");
  const properties = await loadProperties(trackerId);
  const valid: JsonObject[] = [];
  const errors: ImportRowError[] = [];
  rows.forEach((raw, i) => {
    const res = validateEntry(properties, raw ?? {});
    if (res.ok) valid.push(res.values as JsonObject);
    else errors.push({ row: i + 1, message: Object.values(res.errors)[0] });
  });
  if (errors.length && !skipInvalid) return ok({ inserted: 0, errors });
  const supabase = await createClient();
  const base = Date.now() / 1000;
  for (let i = 0; i < valid.length; i += 500) {
    const { error } = await supabase
      .from("tracker_entries")
      .insert(
        valid
          .slice(i, i + 500)
          .map((values, j) => ({ tracker_id: trackerId, values, position: base + i + j })),
      );
    if (error) return fail(`Se importaron ${i} filas; el resto falló.`);
  }
  refresh(trackerId);
  return ok({ inserted: valid.length, errors });
}
