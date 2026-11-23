"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { getContext } from "@/lib/workspace";
import { isISODate } from "@/lib/dates";

const isoDate = z.string().refine(isISODate, "Fecha no válida.");
const projectSchema = z
  .object({
    name: z.string().trim().min(1, "Ponle un nombre.").max(120, "Máximo 120 caracteres."),
    description: z.string().trim().max(5000, "Máximo 5000 caracteres.").nullable().optional(),
    status: z.enum(["planned", "active", "paused", "completed", "archived"]).optional(),
    priority: z.number().int().min(0).max(4).optional(),
    icon: z.string().trim().max(16).nullable().optional(),
    startDate: isoDate.nullable().optional(),
    dueDate: isoDate.nullable().optional(),
  })
  .refine((v) => !v.startDate || !v.dueDate || v.dueDate >= v.startDate, {
    path: ["dueDate"],
    error: "La fecha límite no puede ser anterior al inicio.",
  });

function toRow(v: z.infer<typeof projectSchema>) {
  return {
    name: v.name,
    description: v.description || null,
    ...(v.status ? { status: v.status } : {}),
    ...(v.priority !== undefined ? { priority: v.priority } : {}),
    icon: v.icon || null,
    start_date: v.startDate ?? null,
    due_date: v.dueDate ?? null,
  };
}

export async function createProject(
  input: z.input<typeof projectSchema>,
): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { workspace } = await getContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({ workspace_id: workspace.id, position: Date.now() / 1000, ...toRow(parsed.data) })
    .select("id")
    .single();
  if (error) return fail("No se pudo crear el proyecto.");
  revalidatePath("/", "layout");
  return ok({ id: data.id });
}

export async function updateProject(
  id: string,
  input: z.input<typeof projectSchema>,
): Promise<ActionResult> {
  await requireUser();
  if (!z.uuid().safeParse(id).success) return fail("Identificador no válido.");
  const parsed = projectSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("projects")
    .update(toRow(parsed.data), { count: "exact" })
    .eq("id", id);
  if (error || !count) return fail("No se pudo guardar el proyecto.");
  revalidatePath("/", "layout");
  return ok(undefined);
}

/** Deletes the project; its tasks are kept and simply lose the project link. */
export async function deleteProject(id: string): Promise<ActionResult> {
  await requireUser();
  if (!z.uuid().safeParse(id).success) return fail("Identificador no válido.");
  const supabase = await createClient();
  const { error, count } = await supabase.from("projects").delete({ count: "exact" }).eq("id", id);
  if (error || !count) return fail("No se pudo eliminar el proyecto.");
  revalidatePath("/", "layout");
  return ok(undefined);
}
