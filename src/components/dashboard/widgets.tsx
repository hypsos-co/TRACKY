import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  addDays,
  capitalize,
  dayDiff,
  dueLabel,
  formatDay,
  monthGrid,
  utcToZoned,
  type ISODate,
} from "@/lib/dates";
import type { Task } from "@/lib/tasks/data";
import type { Project } from "@/lib/projects/data";
import type { CalendarEvent, CalendarTask } from "@/lib/calendar/data";
import { TaskItem } from "@/components/tasks/task-item";
import { QuickAdd } from "@/components/tasks/quick-add";
import { ProgressBar } from "@/components/projects/progress";
import { cn } from "@/lib/utils";

function More({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-primary-text hover:underline"
    >
      {children} <ArrowRight className="size-3.5" aria-hidden />
    </Link>
  );
}

export function QuickCaptureWidget() {
  return <QuickAdd placeholder="Añadir tarea, p. ej. «mañana 10:00 !alta #trabajo»" />;
}

export function TasksTodayWidget({ tasks, today }: { tasks: Task[]; today: ISODate }) {
  const due = tasks
    .filter((t) => !t.parent_id && !t.completed_at && t.due_date && dayDiff(today, t.due_date) <= 0)
    .sort((a, b) =>
      a.due_date! < b.due_date! ? -1 : a.due_date! > b.due_date! ? 1 : b.priority - a.priority,
    );
  if (!due.length) return <p className="text-[14px] text-fg-muted">Nada pendiente para hoy</p>;
  return (
    <>
      <ul className="-mx-3 flex flex-col">
        {due.slice(0, 6).map((t) => (
          <TaskItem key={t.id} task={t} today={today} openInTasks />
        ))}
      </ul>
      {due.length > 6 ? (
        <More href="/tasks">Ver las {due.length}</More>
      ) : (
        <More href="/tasks">Todas las tareas</More>
      )}
    </>
  );
}

export function UpcomingEventsWidget({
  events,
  today,
  timeZone,
}: {
  events: CalendarEvent[];
  today: ISODate;
  timeZone: string;
}) {
  const nowMin = utcToZoned(new Date(), timeZone).minutes;
  const upcoming = events
    .filter(
      (e) => e.endDay > today || (e.endDay === today && (e.all_day || e.endMinutes >= nowMin)),
    )
    .slice(0, 6);
  if (!upcoming.length)
    return <p className="text-[14px] text-fg-muted">Sin eventos en los próximos 7 días</p>;
  return (
    <>
      <ul className="flex flex-col gap-2">
        {upcoming.map((e) => (
          <li key={e.id}>
            <Link
              href={`/calendar?view=day&date=${e.startDay < today ? today : e.startDay}&e=${e.id}`}
              className="flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-surface"
            >
              <span className="w-20 shrink-0 text-[12px] text-fg-subtle tabular-nums">
                {dueLabel(e.startDay < today ? today : e.startDay, today)}
                <span className="block text-fg-muted">
                  {e.all_day ? "Todo el día" : e.startTime}
                </span>
              </span>
              <span className="min-w-0 truncate text-[14px]">{e.title}</span>
            </Link>
          </li>
        ))}
      </ul>
      <More href="/calendar?view=week">Abrir calendario</More>
    </>
  );
}

export function TaskStatsWidget({
  tasks,
  today,
  timeZone,
}: {
  tasks: Task[];
  today: ISODate;
  timeZone: string;
}) {
  const open = tasks.filter((t) => !t.completed_at);
  const overdue = open.filter((t) => t.due_date && dayDiff(today, t.due_date) < 0).length;
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const counts = days.map(
    (d) =>
      tasks.filter(
        (t) => t.completed_at && utcToZoned(new Date(t.completed_at), timeZone).day === d,
      ).length,
  );
  const max = Math.max(1, ...counts);
  const week = counts.reduce((a, b) => a + b, 0);
  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-3 gap-2">
        {[
          ["Pendientes", open.length],
          ["Vencidas", overdue],
          ["Hechas (7 d)", week],
        ].map(([label, value]) => (
          <div key={label} className="rounded-lg bg-surface p-3">
            <dt className="text-[12px] text-fg-muted">{label}</dt>
            <dd
              className={cn(
                "text-[24px] font-medium tabular-nums",
                label === "Vencidas" && Number(value) > 0 && "text-danger-text",
              )}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
      {week === 0 ? (
        <p className="text-[13px] text-fg-subtle">Sin tareas completadas en los últimos 7 días</p>
      ) : (
        <figure>
          <div className="flex h-24 items-end gap-1 border-b border-border" aria-hidden>
            {counts.map((c, i) => (
              <div key={days[i]} className="flex flex-1 justify-center">
                {c ? (
                  <div
                    className={cn(
                      "w-full max-w-6 rounded-t",
                      i === counts.length - 1 ? "bg-chart-1" : "bg-fg-subtle/45",
                    )}
                    style={{ height: `${Math.max(4, (c / max) * 88)}px` }}
                  />
                ) : null}
              </div>
            ))}
          </div>
          <div className="mt-1 flex gap-1" aria-hidden>
            {days.map((d) => (
              <span key={d} className="flex-1 text-center text-[11px] text-fg-subtle">
                {formatDay(d, { weekday: "narrow" })}
              </span>
            ))}
          </div>
          <figcaption className="mt-1 text-[12px] text-fg-subtle">
            Tareas completadas por día
          </figcaption>
          <table className="sr-only">
            <caption>Tareas completadas por día, últimos 7 días</caption>
            <tbody>
              {days.map((d, i) => (
                <tr key={d}>
                  <th scope="row">{formatDay(d, { weekday: "long", day: "numeric" })}</th>
                  <td>{counts[i]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
      )}
    </div>
  );
}

export function ProjectsWidget({ projects }: { projects: Project[] }) {
  const active = projects
    .filter((p) => p.status === "active" || p.status === "planned")
    .slice(0, 5);
  if (!active.length)
    return (
      <>
        <p className="text-[14px] text-fg-muted">No hay proyectos activos</p>
        <More href="/projects">Crear un proyecto</More>
      </>
    );
  return (
    <>
      <ul className="flex flex-col gap-3">
        {active.map((p) => (
          <li key={p.id}>
            <Link
              href={`/projects/${p.id}`}
              className="block rounded-lg px-2 py-1.5 hover:bg-surface"
            >
              <span className="block truncate text-[14px] font-medium">{p.name}</span>
              <ProgressBar done={p.progress.done} total={p.progress.total} className="mt-1.5" />
            </Link>
          </li>
        ))}
      </ul>
      <More href="/projects">Todos los proyectos</More>
    </>
  );
}

export function CalendarMonthWidget({
  today,
  events,
  tasks,
}: {
  today: ISODate;
  events: CalendarEvent[];
  tasks: CalendarTask[];
}) {
  const days = monthGrid(today);
  const busy = new Set<string>([...tasks.map((t) => t.due_date)]);
  for (const e of events) for (let d = e.startDay; d <= e.endDay; d = addDays(d, 1)) busy.add(d);
  return (
    <>
      <p className="mb-2 text-[15px] font-medium">
        {capitalize(formatDay(today, { month: "long", year: "numeric" }))}
      </p>
      <div className="grid grid-cols-7 gap-y-1 text-center text-[12px]">
        {days.slice(0, 7).map((d) => (
          <span key={`h-${d}`} className="text-fg-subtle">
            {formatDay(d, { weekday: "narrow" })}
          </span>
        ))}
        {days.map((d) => (
          <Link
            key={d}
            href={`/calendar?view=day&date=${d}`}
            className={cn(
              "relative mx-auto grid size-8 place-items-center rounded-lg tabular-nums",
              d.slice(0, 7) !== today.slice(0, 7) && "opacity-35",
              d === today ? "bg-surface-strong font-medium text-fg" : "hover:bg-surface-strong",
            )}
            aria-current={d === today ? "date" : undefined}
          >
            {Number(d.slice(8))}
            {d === today ? (
              <span aria-hidden className="now-dot absolute bottom-0.5" />
            ) : busy.has(d) ? (
              <span
                aria-hidden
                className="absolute bottom-0.5 size-1 rounded-full bg-primary-text"
              />
            ) : null}
          </Link>
        ))}
      </div>
    </>
  );
}
