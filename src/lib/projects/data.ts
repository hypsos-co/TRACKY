import "server-only";
import { createClient } from "@/lib/supabase/server";
import { progressOf } from "@/lib/tasks/grouping";
import type { Database } from "@/lib/supabase/database.types";

export type ProjectStatus = Database["public"]["Enums"]["project_status"];
export type Project = {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  priority: number;
  icon: string | null;
  start_date: string | null;
  due_date: string | null;
  created_at: string;
  progress: { done: number; total: number; ratio: number };
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  planned: "Planificado",
  active: "Activo",
  paused: "En pausa",
  completed: "Completado",
  archived: "Archivado",
};

/** Projects with progress computed from their (top-level and sub) tasks. */
export async function listProjects(
  workspaceId: string,
  opts: { includeArchived?: boolean } = {},
): Promise<Project[]> {
  const supabase = await createClient();
  let query = supabase
    .from("projects")
    .select(
      "id, name, description, status, priority, icon, start_date, due_date, created_at, position, tasks(status:task_statuses(category))",
    )
    .eq("workspace_id", workspaceId)
    .order("position")
    .order("created_at");
  if (!opts.includeArchived) query = query.neq("status", "archived");
  const { data, error } = await query;
  if (error) throw new Error(`No se pudieron cargar los proyectos: ${error.message}`);
  return data.map(({ tasks, ...rest }) => {
    const { position, ...p } = rest;
    void position;
    return {
      ...p,
      progress: progressOf(
        (tasks as unknown as { status: { category: string } | null }[]).map((t) => ({
          category: t.status?.category ?? "todo",
        })),
      ),
    };
  });
}

export async function getProject(id: string): Promise<Project | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select(
      "id, name, description, status, priority, icon, start_date, due_date, created_at, tasks(status:task_statuses(category))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  const { tasks, ...p } = data;
  return {
    ...p,
    progress: progressOf(
      (tasks as unknown as { status: { category: string } | null }[]).map((t) => ({
        category: t.status?.category ?? "todo",
      })),
    ),
  };
}
