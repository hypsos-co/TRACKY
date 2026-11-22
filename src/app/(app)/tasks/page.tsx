import type { Metadata } from "next";
import { Suspense } from "react";
import { getContext } from "@/lib/workspace";
import { getTask, listStatuses, listTags, listTasks } from "@/lib/tasks/data";
import { listProjects } from "@/lib/projects/data";
import { PageHeader, EmptyState } from "@/components/ui/inputs";
import { QuickAdd } from "@/components/tasks/quick-add";
import { TaskList } from "@/components/tasks/task-list";
import { TaskDetail } from "@/components/tasks/task-detail";
import { TaskFilters } from "@/components/tasks/task-filters";
import { ListSkeleton } from "@/components/app/skeletons";

export const metadata: Metadata = { title: "Tareas" };

export default function TasksPage({ searchParams }: PageProps<"/tasks">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tareas"
        description="Todo lo que tienes entre manos, ordenado por fecha."
      />
      <Suspense fallback={<ListSkeleton />}>
        <Tasks searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

async function Tasks({ searchParams }: { searchParams: PageProps<"/tasks">["searchParams"] }) {
  const params = await searchParams;
  const { workspace, today } = await getContext();
  const projectId = one(params.project);
  const priority = one(params.priority);
  const tag = one(params.tag);
  const openId = one(params.t);

  const [tasks, statuses, projects, tags, detail] = await Promise.all([
    listTasks(workspace.id, {
      projectId: projectId && /^[0-9a-f-]{36}$/i.test(projectId) ? projectId : undefined,
      priority: priority && /^[0-4]$/.test(priority) ? Number(priority) : undefined,
      tag,
    }),
    listStatuses(workspace.id),
    listProjects(workspace.id),
    listTags(workspace.id),
    openId && /^[0-9a-f-]{36}$/i.test(openId) ? getTask(openId) : Promise.resolve(null),
  ]);
  const topLevel = tasks.filter((t) => !t.parent_id);

  return (
    <>
      <QuickAdd />
      <TaskFilters projects={projects} tags={tags} />
      {topLevel.length ? (
        <TaskList tasks={topLevel} today={today} />
      ) : (
        <EmptyState title="No hay tareas aquí">
          Escribe arriba lo que tengas que hacer. Puedes añadir la fecha, la hora, la prioridad y
          etiquetas en la misma línea.
        </EmptyState>
      )}
      <TaskDetail detail={detail} statuses={statuses} projects={projects} />
    </>
  );
}
