import type { Metadata } from "next";
import { Suspense } from "react";
import { getContext } from "@/lib/workspace";
import { listCalendar } from "@/lib/calendar/data";
import { parseAnchor, parseView, rangeFor } from "@/lib/calendar/range";
import { PageHeader } from "@/components/ui/inputs";
import { CalendarView } from "@/components/calendar/calendar-view";
import { GridSkeleton } from "@/components/app/skeletons";

export const metadata: Metadata = { title: "Calendario" };

export default function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Calendario" description="Eventos y tareas con fecha" />
      <Suspense fallback={<GridSkeleton cards={2} />}>
        <Calendar searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Calendar({
  searchParams,
}: {
  searchParams: PageProps<"/calendar">["searchParams"];
}) {
  const params = await searchParams;
  const { workspace, today, timeZone } = await getContext();
  const view = parseView(params.view);
  const anchor = parseAnchor(params.date, today);
  const { from, to } = rangeFor(view, anchor);
  const { events, tasks } = await listCalendar(workspace.id, from, to, timeZone);
  const openEventId = typeof params.e === "string" ? params.e : undefined;
  return (
    <CalendarView
      view={view}
      anchor={anchor}
      today={today}
      events={events}
      tasks={tasks}
      openEventId={openEventId}
    />
  );
}
