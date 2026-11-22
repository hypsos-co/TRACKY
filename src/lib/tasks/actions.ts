"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { getContext } from "@/lib/workspace";
import { isISODate } from "@/lib/dates";
import { parseQuickAdd } from "./quick-add";
import type { Database } from "@/lib/supabase/database.types";

type TaskUpdate = Database["public"]["Tables"]["tasks"]["Update"];

const uuid = z.uuid("Identificador no válido.");
const isoDate = z.string().refine(isISODate, "Fecha no válida.");
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:00)?$/, "Hora no válida.");

const taskFields = z.object({
  title: z.string().trim().min(1, "Escribe un título.").max(300, "Máximo 300 caracteres."),
  notes: z.string().max(20000, "Las notas son demasiado largas.").nullable(),
  priority: z.number().int().min(0).max(4),
  dueDate: isoDate.nullable(),
  dueTime: time.nullable(),
  startDate: isoDate.nullable(),
  projectId: uuid.nullable(),
  statusId: uuid,
  parentId: uuid.nullable(),
});

const createSchema = taskFields.partial().extend({ title: taskFields.shape.title });
const updateSchema = taskFields.partial();

function refresh() {
  revalidatePath("/", "layout");
}

async function defaultStatusId(workspaceId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("task_statuses")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("is_default", true)
    .single();
  return data?.id ?? null;
}

async function attachTags(workspaceId: string, taskId: string, names: string[]) {
  if (!names.length) return;
  const supabase = await createClient();
  const clean = [...new Set(names.map((n) => n.trim()).filter(Boolean))].slice(0, 20);
  const { data: existing } = await supabase
    .from("tags")
    .select("id, name")
    .eq("workspace_id", workspaceId);
  const byName = new Map((existing ?? []).map((t) => [t.name.toLowerCase(), t.id]));
  const missing = clean.filter((n) => !byName.has(n.toLowerCase()));
  if (missing.length) {
    const { data: created } = await supabase
      .from("tags")
      .insert(missing.map((name) => ({ workspace_id: workspaceId, name: name.slice(0, 40) })))
      .select("id, name");
    for (const t of created ?? []) byName.set(t.name.toLowerCase(), t.id);
  }
  const rows = clean
    .map((n) => byName.get(n.toLowerCase()))
    .filter(Boolean)
    .map((tag_id) => ({ task_id: taskId, tag_id: tag_id! }));
  if (rows.length) await supabase.from("task_tags").upsert(rows, { ignoreDuplicates: true });
}

export async function createTask(
  input: z.input<typeof createSchema> & { tags?: string[] },
): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { workspace } = await getContext();
  const v = parsed.data;
  const statusId = v.statusId ?? (await defaultStatusId(workspace.id));
  if (!statusId) return fail("El espacio no tiene estados de tarea.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .insert({
      workspace_id: workspace.id,
      title: v.title,
      notes: v.notes ?? null,
      priority: v.priority ?? 0,
      due_date: v.dueDate ?? null,
      due_time: v.dueDate ? (v.dueTime ?? null) : null,
      start_date: v.startDate ?? null,
      project_id: v.projectId ?? null,
      parent_id: v.parentId ?? null,
      status_id: statusId,
      position: Date.now() / 1000,
    })
    .select("id")
    .single();
  if (error) return fail("No se pudo crear la tarea.");
  await attachTags(workspace.id, data.id, input.tags ?? []);
  refresh();
  return ok({ id: data.id });
}

/** Natural-language quick add: "Llamar a Ana mañana 17:00 !alta #casa". */
export async function quickAddTask(
  text: string,
  extras: { projectId?: string | null; dueDate?: string | null } = {},
): Promise<ActionResult<{ id: string; title: string }>> {
  await requireUser();
  const { today } = await getContext();
  const parsed = parseQuickAdd(text.slice(0, 500), today);
  if (!parsed.title) return fail("Escribe un título.");
  const res = await createTask({
    title: parsed.title,
    priority: parsed.priority ?? 0,
    dueDate: parsed.dueDate ?? extras.dueDate ?? null,
    dueTime: parsed.dueTime ?? null,
    projectId: extras.projectId ?? null,
    tags: parsed.tags,
  });
  return res.ok ? ok({ id: res.data.id, title: parsed.title }) : res;
}

export async function updateTask(
  id: string,
  patch: z.input<typeof updateSchema>,
): Promise<ActionResult> {
  await requireUser();
  const idOk = uuid.safeParse(id);
  const parsed = updateSchema.safeParse(patch);
  if (!idOk.success) return invalid(idOk.error);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  const row: TaskUpdate = {};
  if (v.title !== undefined) row.title = v.title;
  if (v.notes !== undefined) row.notes = v.notes || null;
  if (v.priority !== undefined) row.priority = v.priority;
  if (v.dueDate !== undefined) {
    row.due_date = v.dueDate;
    if (!v.dueDate) row.due_time = null;
  }
  if (v.dueTime !== undefined) row.due_time = v.dueTime;
  if (v.startDate !== undefined) row.start_date = v.startDate;
  if (v.projectId !== undefined) row.project_id = v.projectId;
  if (v.statusId !== undefined) row.status_id = v.statusId;
  if (!Object.keys(row).length) return ok(undefined);

  const supabase = await createClient();
  const { error, count } = await supabase
    .from("tasks")
    .update(row, { count: "exact" })
    .eq("id", id);
  if (error)
    return fail(
      error.code === "23514"
        ? "Esa combinación no es válida en este espacio."
        : "No se pudo guardar la tarea.",
    );
  if (!count) return fail("La tarea no existe o no tienes permiso.");
  refresh();
  return ok(undefined);
}

/** Toggle completion by moving the task to the workspace's done / default status. */
export async function setTaskDone(id: string, done: boolean): Promise<ActionResult> {
  await requireUser();
  if (!uuid.safeParse(id).success) return fail("Identificador no válido.");
  const supabase = await createClient();
  const { data: task } = await supabase.from("tasks").select("workspace_id").eq("id", id).single();
  if (!task) return fail("La tarea no existe.");
  const { data: statuses } = await supabase
    .from("task_statuses")
    .select("id, category, is_default, position")
    .eq("workspace_id", task.workspace_id)
    .order("position");
  const target = done
    ? statuses?.find((s) => s.category === "done")
    : (statuses?.find((s) => s.is_default) ?? statuses?.find((s) => s.category === "todo"));
  if (!target) return fail("No hay un estado adecuado configurado.");
  return updateTask(id, { statusId: target.id });
}

export async function deleteTask(id: string): Promise<ActionResult> {
  await requireUser();
  if (!uuid.safeParse(id).success) return fail("Identificador no válido.");
  const supabase = await createClient();
  const { error, count } = await supabase.from("tasks").delete({ count: "exact" }).eq("id", id);
  if (error || !count) return fail("No se pudo eliminar la tarea.");
  refresh();
  return ok(undefined);
}

export async function setTaskTags(id: string, names: string[]): Promise<ActionResult> {
  await requireUser();
  if (!uuid.safeParse(id).success) return fail("Identificador no válido.");
  const clean = z.array(z.string().trim().min(1).max(40)).max(20).safeParse(names);
  if (!clean.success) return fail("Etiquetas no válidas.");
  const supabase = await createClient();
  const { data: task } = await supabase.from("tasks").select("workspace_id").eq("id", id).single();
  if (!task) return fail("La tarea no existe.");
  await supabase.from("task_tags").delete().eq("task_id", id);
  await attachTags(task.workspace_id, id, clean.data);
  refresh();
  return ok(undefined);
}

export async function getTaskForEdit(id: string) {
  await requireUser();
  if (!uuid.safeParse(id).success) return null;
  const { getTask } = await import("./data");
  return getTask(id);
}
