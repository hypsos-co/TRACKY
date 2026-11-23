import type { Metadata } from "next";
import { Suspense } from "react";
import { getContext } from "@/lib/workspace";
import { getDefaultDashboard } from "@/lib/dashboard/data";
import { widgetTrackerId } from "@/lib/dashboard/widgets";
import { getTracker, listTrackers } from "@/lib/trackers/data";
import { buildTrackerWidget, type TrackerWidgetData } from "@/lib/trackers/widget";
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
import {
  MissingTracker,
  TrackerChartWidget,
  TrackerLatestWidget,
} from "@/components/dashboard/tracker-widgets";
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
  const { user, workspace, today, timeZone } = ctx;
  const grid = monthGrid(today);
  const [dashboard, tasks, projects, week, month, trackers] = await Promise.all([
    getDefaultDashboard(user.id),
    listTasks(workspace.id),
    listProjects(workspace.id),
    listCalendar(workspace.id, today, addDays(today, 7), timeZone),
    listCalendar(workspace.id, grid[0], grid[41], timeZone),
    listTrackers(workspace.id),
  ]);

  // Trackers shown by widgets (any workspace you belong to; RLS decides).
  const trackerIds = [
    ...new Set((dashboard?.widgets ?? []).map((w) => widgetTrackerId(w.config)).filter(Boolean)),
  ] as string[];
  const trackerData = new Map<string, TrackerWidgetData>();
  await Promise.all(
    trackerIds.map(async (id) => {
      const t = await getTracker(id).catch(() => null);
      if (t) trackerData.set(id, buildTrackerWidget(t, today));
    }),
  );

  const render = (type: GridItem["type"], config: Record<string, unknown>) => {
    const tracker = trackerData.get(widgetTrackerId(config) ?? "");
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
      case "tracker_chart":
        return tracker ? <TrackerChartWidget data={tracker} /> : <MissingTracker />;
      case "tracker_latest":
        return tracker ? <TrackerLatestWidget data={tracker} /> : <MissingTracker />;
    }
  };

  const items: GridItem[] = (dashboard?.widgets ?? []).map((w) => {
    const tracker = trackerData.get(widgetTrackerId(w.config) ?? "");
    return {
      id: w.id,
      type: w.type,
      size: w.size,
      title: tracker?.name,
      icon: tracker ? (tracker.icon ?? "") : undefined,
      node: render(w.type, w.config),
    };
  });
  return (
    <div className="flex flex-col gap-6">
      {params.password === "updated" ? <Alert tone="success">Contraseña actualizada</Alert> : null}
      <DashboardGrid
        header={
          <header className="min-w-0">
            <p className="text-[13px] text-fg-subtle">{workspace.name}</p>
            <h1 className="mt-1 text-[28px] leading-[1.15] font-medium sm:text-[34px]">
              {capitalize(formatDay(today, { weekday: "long", day: "numeric", month: "long" }))}
            </h1>
          </header>
        }
        items={items}
        trackers={trackers.map((t) => ({ id: t.id, name: t.name, icon: t.icon }))}
      />
    </div>
  );
}
