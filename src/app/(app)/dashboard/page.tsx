import type { Metadata } from "next";
import { Suspense } from "react";
import { getContext } from "@/lib/workspace";
import { getDefaultDashboard } from "@/lib/dashboard/data";
import { listTasks } from "@/lib/tasks/data";
import { listProjects } from "@/lib/projects/data";
import { listCalendar } from "@/lib/calendar/data";
import { addDays, capitalize, formatDay, monthGrid } from "@/lib/dates";
import { Alert } from "@/components/ui/alert";
import { DashboardGrid, type GridItem } from "@/components/dashboard/dashboard-grid";
import {
  CalendarMonthWidget,
  ProjectsWidget,
  QuickCaptureWidget,
  TaskStatsWidget,
  TasksTodayWidget,
  UpcomingEventsWidget,
} from "@/components/dashboard/widgets";
import { GridSkeleton } from "@/components/app/skeletons";

export const metadata: Metadata = { title: "Inicio" };

export default function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-8">
          <div className="h-16 w-64 rounded-xl bg-surface" />
          <GridSkeleton />
        </div>
      }
    >
      <Dashboard searchParams={searchParams} />
    </Suspense>
  );
}

async function Dashboard({
  searchParams,
}: {
  searchParams: PageProps<"/dashboard">["searchParams"];
}) {
  const [ctx, params] = await Promise.all([getContext(), searchParams]);
  const { user, profile, workspace, today, timeZone } = ctx;
  const grid = monthGrid(today);
  const [dashboard, tasks, projects, week, month] = await Promise.all([
    getDefaultDashboard(user.id),
    listTasks(workspace.id),
    listProjects(workspace.id),
    listCalendar(workspace.id, today, addDays(today, 7), timeZone),
    listCalendar(workspace.id, grid[0], grid[41], timeZone),
  ]);

  const render = (type: GridItem["type"]) => {
    switch (type) {
      case "quick_capture":
        return <QuickCaptureWidget />;
      case "tasks_today":
        return <TasksTodayWidget tasks={tasks} today={today} />;
      case "upcoming_events":
        return <UpcomingEventsWidget events={week.events} today={today} timeZone={timeZone} />;
      case "task_stats":
        return <TaskStatsWidget tasks={tasks} today={today} timeZone={timeZone} />;
      case "projects":
        return <ProjectsWidget projects={projects} />;
      case "calendar_month":
        return <CalendarMonthWidget today={today} events={month.events} tasks={month.tasks} />;
    }
  };

  const items: GridItem[] = (dashboard?.widgets ?? []).map((w) => ({ ...w, node: render(w.type) }));
  const name = profile.display_name ?? user.email.split("@")[0];

  return (
    <div className="flex flex-col gap-6">
      {params.password === "updated" ? <Alert tone="success">Contraseña actualizada.</Alert> : null}
      <header className="animate-rise">
        <p className="text-[14px] font-medium text-fg-subtle">
          {capitalize(formatDay(today, { weekday: "long", day: "numeric", month: "long" }))} ·{" "}
          {workspace.name}
        </p>
        <h1 className="mt-1 text-[34px] leading-tight font-medium tracking-[-0.03em] text-balance sm:text-[44px]">
          Hola, {name}
        </h1>
      </header>
      <DashboardGrid items={items} />
    </div>
  );
}
