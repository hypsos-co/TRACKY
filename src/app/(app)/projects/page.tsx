import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CalendarClock } from "lucide-react";
import { getContext } from "@/lib/workspace";
import { listProjects, PROJECT_STATUS_LABELS } from "@/lib/projects/data";
import { dueLabel } from "@/lib/dates";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/inputs";
import { ProjectFormButton } from "@/components/projects/project-form";
import { ProgressBar } from "@/components/projects/progress";
import { GridSkeleton } from "@/components/app/skeletons";

export const metadata: Metadata = { title: "Proyectos" };

export default function ProjectsPage({ searchParams }: PageProps<"/projects">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Proyectos"
        description="Agrupa tareas y sigue su avance"
        actions={<ProjectFormButton />}
      />
      <Suspense fallback={<GridSkeleton />}>
        <Projects searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Projects({
  searchParams,
}: {
  searchParams: PageProps<"/projects">["searchParams"];
}) {
  const params = await searchParams;
  const showArchived = params.archived === "1";
  const { workspace, today } = await getContext();
  const projects = await listProjects(workspace.id, { includeArchived: showArchived });

  return (
    <>
      {projects.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/projects/${p.id}`}
                className="block h-full rounded-[var(--radius-card)]"
              >
                <Card className="flex h-full flex-col gap-4 p-5 transition-colors hover:border-border-strong">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-[17px] leading-snug font-medium break-words">{p.name}</h2>
                    <span className="shrink-0 text-[12px] text-fg-subtle tabular-nums">
                      {PROJECT_STATUS_LABELS[p.status]}
                    </span>
                  </div>
                  {p.description ? (
                    <p className="line-clamp-2 text-[14px] text-fg-muted">{p.description}</p>
                  ) : null}
                  <div className="mt-auto flex flex-col gap-2">
                    {p.due_date ? (
                      <span className="inline-flex items-center gap-1.5 text-[12px] text-fg-subtle">
                        <CalendarClock className="size-3.5" aria-hidden /> Límite:{" "}
                        {dueLabel(p.due_date, today)}
                      </span>
                    ) : null}
                    <ProgressBar done={p.progress.done} total={p.progress.total} />
                  </div>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title="Aún no tienes proyectos" action={<ProjectFormButton />}>
          Crea un proyecto para agrupar tareas relacionadas y ver su progreso real.
        </EmptyState>
      )}
      <Link
        href={showArchived ? "/projects" : "/projects?archived=1"}
        className="self-start text-[14px] text-primary-text hover:underline"
      >
        {showArchived ? "Ocultar archivados" : "Mostrar archivados"}
      </Link>
    </>
  );
}
