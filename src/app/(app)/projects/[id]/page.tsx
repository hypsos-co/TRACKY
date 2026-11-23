import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { getContext } from "@/lib/workspace";
import { getProject, listProjects, PROJECT_STATUS_LABELS } from "@/lib/projects/data";
import { getTask, listStatuses, listTasks } from "@/lib/tasks/data";
import { dueLabel } from "@/lib/dates";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/inputs";
import { ProjectFormButton } from "@/components/projects/project-form";
import { DeleteProjectButton } from "@/components/projects/delete-project";
import { ProgressBar } from "@/components/projects/progress";
import { QuickAdd } from "@/components/tasks/quick-add";
import { TaskList } from "@/components/tasks/task-list";
import { TaskDetail } from "@/components/tasks/task-detail";
import { ListSkeleton } from "@/components/app/skeletons";

export const metadata: Metadata = { title: "Proyecto" };

export default function ProjectPage(props: PageProps<"/projects/[id]">) {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 self-start text-[14px] text-fg-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" aria-hidden /> Proyectos
      </Link>
      <Suspense fallback={<ListSkeleton />}>
        <ProjectView {...props} />
      </Suspense>
    </div>
  );
}

async function ProjectView({ params, searchParams }: PageProps<"/projects/[id]">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { workspace, today } = await getContext();
  const project = await getProject(id);
  if (!project) notFound();
  const openId = typeof sp.t === "string" && /^[0-9a-f-]{36}$/i.test(sp.t) ? sp.t : null;
  const [tasks, statuses, projects, detail] = await Promise.all([
    listTasks(workspace.id, { projectId: id, doneDays: 3650 }),
    listStatuses(workspace.id),
    listProjects(workspace.id, { includeArchived: true }),
    openId ? getTask(openId) : Promise.resolve(null),
  ]);
  const topLevel = tasks.filter((t) => !t.parent_id);

  return (
    <>
      <Card className="flex animate-rise flex-col gap-4 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[13px] text-fg-subtle">{PROJECT_STATUS_LABELS[project.status]}</p>
            <h1 className="mt-1 text-[30px] leading-tight font-medium tracking-[-0.03em] break-words">
              {project.name}
            </h1>
            {project.description ? (
              <p className="mt-2 max-w-2xl text-[15px] whitespace-pre-line text-fg-muted">
                {project.description}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 gap-2">
            <ProjectFormButton project={project} />
            <DeleteProjectButton id={project.id} name={project.name} />
          </div>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-[13px] text-fg-muted">
          {project.start_date ? <span>Inicio: {dueLabel(project.start_date, today)}</span> : null}
          {project.due_date ? <span>Límite: {dueLabel(project.due_date, today)}</span> : null}
        </div>
        <ProgressBar done={project.progress.done} total={project.progress.total} />
      </Card>

      <QuickAdd projectId={project.id} placeholder="Añadir tarea a este proyecto…" />
      {topLevel.length ? (
        <TaskList tasks={topLevel} today={today} showProject={false} />
      ) : (
        <EmptyState title="Este proyecto no tiene tareas">
          El progreso se calcula automáticamente a partir de sus tareas.
        </EmptyState>
      )}
      <TaskDetail detail={detail} statuses={statuses} projects={projects} />
    </>
  );
}
