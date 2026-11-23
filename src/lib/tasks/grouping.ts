import { dayDiff, type ISODate } from "@/lib/dates";

export type Groupable = {
  due_date: string | null;
  completed_at: string | null;
  priority: number;
  position: number;
  created_at: string;
};

export type SectionKey = "overdue" | "today" | "upcoming" | "later" | "someday" | "done";

export const SECTION_LABELS: Record<SectionKey, string> = {
  overdue: "Vencidas",
  today: "Hoy",
  upcoming: "Próximos 7 días",
  later: "Más adelante",
  someday: "Sin fecha",
  done: "Completadas",
};

export function sectionOf(task: Groupable, today: ISODate): SectionKey {
  if (task.completed_at) return "done";
  if (!task.due_date) return "someday";
  const diff = dayDiff(today, task.due_date);
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff <= 7) return "upcoming";
  return "later";
}

/** Sort: due date, then priority (high first), then manual position. */
export function compareTasks(a: Groupable, b: Groupable) {
  if (a.due_date !== b.due_date) {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date < b.due_date ? -1 : 1;
  }
  if (a.priority !== b.priority) return b.priority - a.priority;
  if (a.position !== b.position) return a.position - b.position;
  return a.created_at < b.created_at ? -1 : 1;
}

export function groupTasks<T extends Groupable>(tasks: T[], today: ISODate) {
  const order: SectionKey[] = ["overdue", "today", "upcoming", "later", "someday", "done"];
  const map = new Map<SectionKey, T[]>(order.map((k) => [k, []]));
  for (const t of tasks) map.get(sectionOf(t, today))!.push(t);
  for (const [key, list] of map) {
    if (key === "done") list.sort((a, b) => (a.completed_at! > b.completed_at! ? -1 : 1));
    else list.sort(compareTasks);
  }
  return order
    .map((key) => ({ key, label: SECTION_LABELS[key], tasks: map.get(key)! }))
    .filter((s) => s.tasks.length > 0);
}

export const PRIORITIES = [
  { value: 0, label: "Sin prioridad" },
  { value: 1, label: "Baja" },
  { value: 2, label: "Media" },
  { value: 3, label: "Alta" },
  { value: 4, label: "Urgente" },
] as const;

/** Progress of a set of tasks, ignoring canceled ones. */
export function progressOf(tasks: { category: string }[]) {
  const relevant = tasks.filter((t) => t.category !== "canceled");
  const done = relevant.filter((t) => t.category === "done").length;
  return { done, total: relevant.length, ratio: relevant.length ? done / relevant.length : 0 };
}
