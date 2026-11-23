"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { WIDGET_SIZES, WIDGET_TYPES, isWidgetType } from "./widgets";

const uuid = z.uuid();

async function ownedDashboardId(userId: string) {
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("dashboards")
    .select("id")
    .eq("owner_id", userId)
    .order("is_default", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return existing.id;
  const { data } = await supabase
    .from("dashboards")
    .insert({ owner_id: userId, name: "Inicio", is_default: true })
    .select("id")
    .single();
  return data?.id ?? null;
}

export async function addWidget(type: string): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  if (!isWidgetType(type)) return fail("Tipo de widget no válido.");
  const dashboardId = await ownedDashboardId(user.id);
  if (!dashboardId) return fail("No se encontró tu panel.");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dashboard_widgets")
    .insert({
      dashboard_id: dashboardId,
      type,
      size: WIDGET_TYPES[type].defaultSize,
      position: Date.now() / 1000,
    })
    .select("id")
    .single();
  if (error) return fail("No se pudo añadir el widget.");
  revalidatePath("/dashboard");
  return ok({ id: data.id });
}

export async function removeWidget(id: string): Promise<ActionResult> {
  await requireUser();
  if (!uuid.safeParse(id).success) return fail("Identificador no válido.");
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("dashboard_widgets")
    .delete({ count: "exact" })
    .eq("id", id);
  if (error || !count) return fail("No se pudo quitar el widget.");
  revalidatePath("/dashboard");
  return ok(undefined);
}

export async function resizeWidget(id: string, size: string): Promise<ActionResult> {
  await requireUser();
  if (!uuid.safeParse(id).success || !(WIDGET_SIZES as readonly string[]).includes(size))
    return fail("Datos no válidos.");
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("dashboard_widgets")
    .update({ size }, { count: "exact" })
    .eq("id", id);
  if (error || !count) return fail("No se pudo cambiar el tamaño.");
  revalidatePath("/dashboard");
  return ok(undefined);
}

/** Persist a new order: positions 1..n following the given id list. */
export async function reorderWidgets(ids: string[]): Promise<ActionResult> {
  await requireUser();
  const parsed = z.array(uuid).max(50).safeParse(ids);
  if (!parsed.success) return fail("Orden no válido.");
  const supabase = await createClient();
  const results = await Promise.all(
    parsed.data.map((id, i) =>
      supabase
        .from("dashboard_widgets")
        .update({ position: i + 1 })
        .eq("id", id),
    ),
  );
  if (results.some((r) => r.error)) return fail("No se pudo guardar el orden.");
  revalidatePath("/dashboard");
  return ok(undefined);
}
