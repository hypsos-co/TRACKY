import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type StatusCategory = Database["public"]["Enums"]["task_status_category"];
export type TaskStatus = {
  id: string;
  name: string;
  category: StatusCategory;
  position: number;
  is_default: boolean;
};
export type Tag = { id: string; name: string };

export type Task = {
  id: string;
  title: string;
  notes: string | null;
  priority: number;
  start_date: string | null;
  due_date: string | null;
  due_time: string | null;
  completed_at: string | null;
  position: number;
  created_at: string;
  parent_id: string | null;
  project: { id: string; name: string } | null;
  status: { id: string; name: string; category: StatusCategory };
  tags: Tag[];
  subtasks: { total: number; done: number };
};

const TASK_SELECT =
  "id, title, notes, priority, start_date, due_date, due_time, completed_at, position, created_at, parent_id, project:projects(id, name), status:task_statuses!inner(id, name, category), task_tags(tag:tags(id, name))";

type RawTask = {
  id: string;
  title: string;
  notes: string | null;
  priority: number;
  start_date: string | null;
  due_date: string | null;
  due_time: string | null;
  completed_at: string | null;
  position: number;
  created_at: string;
  parent_id: string | null;
  project: { id: string; name: string } | null;
  status: { id: string; name: string; category: StatusCategory };
  task_tags: { tag: Tag | null }[];
};

function shape(rows: RawTask[]): Task[] {
  const children = new Map<string, { total: number; done: number }>();
  for (const r of rows) {
    if (!r.parent_id) continue;
    const c = children.get(r.parent_id) ?? { total: 0, done: 0 };
    if (r.status.category !== "canceled") c.total += 1;
    if (r.status.category === "done") c.done += 1;
    children.set(r.parent_id, c);
  }
  return rows.map(({ task_tags, ...r }) => ({
    ...r,
    tags: task_tags.map((t) => t.tag).filter((t): t is Tag => Boolean(t)),
    subtasks: children.get(r.id) ?? { total: 0, done: 0 },
  }));
}

export type TaskFilter = {
  projectId?: string;
  priority?: number;
  tag?: string;
  /** include completed tasks finished in the last N days (default 14) */
  doneDays?: number;
};

/** All tasks of a workspace (top-level and subtasks), canceled ones excluded. */
export async function listTasks(workspaceId: string, filter: TaskFilter = {}): Promise<Task[]> {
  const supabase = await createClient();
  const since = new Date(Date.now() - (filter.doneDays ?? 14) * 86_400_000).toISOString();
  let query = supabase
    .from("tasks")
    .select(TASK_SELECT)
    .eq("workspace_id", workspaceId)
    .neq("status.category", "canceled")
    .or(`completed_at.is.null,completed_at.gte.${since}`)
    .order("position")
    .limit(2000);
  if (filter.projectId) query = query.eq("project_id", filter.projectId);
  if (filter.priority !== undefined) query = query.eq("priority", filter.priority);
  const { data, error } = await query;
  if (error) throw new Error(`No se pudieron cargar las tareas: ${error.message}`);
  let tasks = shape(data as unknown as RawTask[]);
  if (filter.tag) {
    const tag = filter.tag.toLowerCase();
    const matching = new Set(
      tasks.filter((t) => t.tags.some((g) => g.name.toLowerCase() === tag)).map((t) => t.id),
    );
    tasks = tasks.filter((t) => matching.has(t.id) || (t.parent_id && matching.has(t.parent_id)));
  }
  return tasks;
}

export async function getTask(id: string): Promise<{ task: Task; subtasks: Task[] } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select(TASK_SELECT)
    .or(`id.eq.${id},parent_id.eq.${id}`)
    .order("position");
  if (error || !data) return null;
  const rows = shape(data as unknown as RawTask[]);
  const task = rows.find((t) => t.id === id);
  if (!task) return null;
  return { task, subtasks: rows.filter((t) => t.parent_id === id) };
}

export async function listStatuses(workspaceId: string): Promise<TaskStatus[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("task_statuses")
    .select("id, name, category, position, is_default")
    .eq("workspace_id", workspaceId)
    .order("position");
  if (error) throw new Error(error.message);
  return data;
}

export async function listTags(workspaceId: string): Promise<Tag[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tags")
    .select("id, name")
    .eq("workspace_id", workspaceId)
    .order("name");
  if (error) throw new Error(error.message);
  return data;
}
