"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { moveEvent } from "@/lib/calendar/actions";
import {
  rangeFor,
  shift,
  titleFor,
  VIEW_LABELS,
  VIEWS,
  type CalendarViewKind,
} from "@/lib/calendar/range";
import { addDays, capitalize, formatDay, monthGrid, type ISODate } from "@/lib/dates";
import { buttonClasses, Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { EventDialog, type EventDraft } from "./event-dialog";

export type CalEvent = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  all_day: boolean;
  startDay: string;
  endDay: string;
  startMinutes: number;
  endMinutes: number;
  startTime: string;
  endTime: string;
};
export type CalTask = {
  id: string;
  title: string;
  due_date: string;
  due_time: string | null;
  done: boolean;
};

const HOUR = 48; // px per hour in the time grid
const pad = (n: number) => String(n).padStart(2, "0");
const toTime = (m: number) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
const href = (view: CalendarViewKind, date: string) => `/calendar?view=${view}&date=${date}`;

function draftFrom(e: CalEvent): EventDraft {
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    location: e.location,
    allDay: e.all_day,
    startDay: e.startDay,
    endDay: e.endDay,
    startTime: e.startTime,
    endTime: e.endTime,
  };
}

function newDraft(day: string, minutes = 9 * 60): EventDraft {
  const end = Math.min(minutes + 60, 23 * 60 + 59);
  return {
    title: "",
    description: null,
    location: null,
    allDay: false,
    startDay: day,
    endDay: day,
    startTime: toTime(minutes),
    endTime: toTime(end),
  };
}

export function CalendarView({
  view,
  anchor,
  today,
  events,
  tasks,
  openEventId,
}: {
  view: CalendarViewKind;
  anchor: ISODate;
  today: ISODate;
  events: CalEvent[];
  tasks: CalTask[];
  openEventId?: string;
}) {
  const [draft, setDraft] = useState<EventDraft | null>(() => {
    const ev = openEventId ? events.find((e) => e.id === openEventId) : undefined;
    return ev ? draftFrom(ev) : null;
  });

  const tasksByDay = useMemo(() => {
    const m = new Map<string, CalTask[]>();
    for (const t of tasks) m.set(t.due_date, [...(m.get(t.due_date) ?? []), t]);
    return m;
  }, [tasks]);

  const eventsOn = (day: string) => events.filter((e) => e.startDay <= day && e.endDay >= day);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <Link
            href={href(view, shift(view, anchor, -1))}
            aria-label="Anterior"
            className={buttonClasses({ variant: "secondary", size: "icon" })}
          >
            <ChevronLeft className="size-4" aria-hidden />
          </Link>
          <Link
            href={href(view, today)}
            className={buttonClasses({ variant: "secondary", size: "sm" })}
          >
            Hoy
          </Link>
          <Link
            href={href(view, shift(view, anchor, 1))}
            aria-label="Siguiente"
            className={buttonClasses({ variant: "secondary", size: "icon" })}
          >
            <ChevronRight className="size-4" aria-hidden />
          </Link>
          <h2 className="ml-2 text-[20px] font-medium" aria-live="polite">
            {titleFor(view, anchor)}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <nav
            aria-label="Vista del calendario"
            className="inline-flex rounded-xl border border-border bg-surface p-1"
          >
            {VIEWS.map((v) => (
              <Link
                key={v}
                href={href(v, anchor)}
                aria-current={v === view ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors",
                  v === view
                    ? "bg-surface-strong text-fg shadow-[var(--highlight)]"
                    : "text-fg-muted hover:text-fg",
                )}
              >
                {VIEW_LABELS[v]}
              </Link>
            ))}
          </nav>
          <Button size="sm" onClick={() => setDraft(newDraft(view === "day" ? anchor : today))}>
            <Plus className="size-4" aria-hidden /> Nuevo evento
          </Button>
        </div>
      </div>

      {view === "month" ? (
        <MonthGrid
          anchor={anchor}
          today={today}
          eventsOn={eventsOn}
          tasksByDay={tasksByDay}
          onPick={setDraft}
        />
      ) : view === "year" ? (
        <YearGrid anchor={anchor} today={today} eventsOn={eventsOn} tasksByDay={tasksByDay} />
      ) : (
        <TimeGrid
          key={`${view}-${anchor}-${events.map((e) => e.id + e.startDay + e.startMinutes).join()}`}
          days={
            view === "day"
              ? [anchor]
              : Array.from({ length: 7 }, (_, i) => addDays(rangeFor("week", anchor).from, i))
          }
          today={today}
          events={events}
          eventsOn={eventsOn}
          tasksByDay={tasksByDay}
          onPick={setDraft}
        />
      )}

      <EventDialog draft={draft} onClose={() => setDraft(null)} />
    </div>
  );
}

function Chip({
  children,
  tone = "event",
  href: link,
  onClick,
}: {
  children: React.ReactNode;
  tone?: "event" | "task" | "done";
  href?: string;
  onClick?: () => void;
}) {
  const cls = cn(
    "block w-full truncate rounded-md px-1.5 py-0.5 text-left text-[12px] leading-tight",
    tone === "event" && "bg-primary/20 text-fg hover:bg-primary/30",
    tone === "task" && "border border-border-strong text-fg-muted hover:text-fg",
    tone === "done" && "text-fg-subtle line-through",
  );
  if (link)
    return (
      <Link href={link} className={cls} onClick={(e) => e.stopPropagation()}>
        {children}
      </Link>
    );
  return (
    <button
      type="button"
      className={cls}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      {children}
    </button>
  );
}

function MonthGrid({
  anchor,
  today,
  eventsOn,
  tasksByDay,
  onPick,
}: {
  anchor: ISODate;
  today: ISODate;
  eventsOn: (d: string) => CalEvent[];
  tasksByDay: Map<string, CalTask[]>;
  onPick: (d: EventDraft) => void;
}) {
  const days = monthGrid(anchor);
  const month = anchor.slice(0, 7);
  const weekdays = days.slice(0, 7).map((d) => formatDay(d, { weekday: "short" }));
  return (
    <div className="card overflow-hidden rounded-[var(--radius-card)]">
      <div className="grid grid-cols-7 border-b border-border">
        {weekdays.map((w) => (
          <div key={w} className="py-2 text-center text-[12px] text-fg-subtle">
            {capitalize(w.replace(".", ""))}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d) => {
          const items = [
            ...eventsOn(d).map((e) => ({ kind: "event" as const, e })),
            ...(tasksByDay.get(d) ?? []).map((t) => ({ kind: "task" as const, t })),
          ];
          const inMonth = d.slice(0, 7) === month;
          return (
            <div
              key={d}
              role="gridcell"
              onClick={() => onPick(newDraft(d))}
              className={cn(
                "min-h-[92px] cursor-pointer border-r border-b border-border p-1.5 transition-colors hover:bg-surface sm:min-h-[112px]",
                !inMonth && "opacity-45",
              )}
            >
              <Link
                href={href("day", d)}
                onClick={(e) => e.stopPropagation()}
                aria-label={formatDay(d, { weekday: "long", day: "numeric", month: "long" })}
                className={cn(
                  "mb-1 inline-flex h-7 items-center gap-1.5 rounded-md px-1.5 text-[13px] tabular-nums",
                  d === today ? "font-medium text-fg" : "text-fg-muted hover:bg-surface-strong",
                )}
                aria-current={d === today ? "date" : undefined}
              >
                {Number(d.slice(8))}
                {d === today ? <span className="now-dot" aria-hidden /> : null}
              </Link>
              <div className="flex flex-col gap-0.5">
                {items.slice(0, 3).map((it) =>
                  it.kind === "event" ? (
                    <Chip key={it.e.id} onClick={() => onPick(draftFrom(it.e))}>
                      {it.e.all_day ? "" : `${it.e.startTime} `}
                      {it.e.title}
                    </Chip>
                  ) : (
                    <Chip
                      key={it.t.id}
                      tone={it.t.done ? "done" : "task"}
                      href={`/tasks?t=${it.t.id}`}
                    >
                      ◦ {it.t.title}
                    </Chip>
                  ),
                )}
                {items.length > 3 ? (
                  <Link
                    href={href("day", d)}
                    onClick={(e) => e.stopPropagation()}
                    className="px-1.5 text-[11px] text-fg-subtle hover:text-fg"
                  >
                    +{items.length - 3} más
                  </Link>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function YearGrid({
  anchor,
  today,
  eventsOn,
  tasksByDay,
}: {
  anchor: ISODate;
  today: ISODate;
  eventsOn: (d: string) => CalEvent[];
  tasksByDay: Map<string, CalTask[]>;
}) {
  const year = anchor.slice(0, 4);
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 12 }, (_, m) => `${year}-${pad(m + 1)}-01`).map((first) => (
        <div key={first} className="card rounded-[var(--radius-card)] p-4">
          <Link
            href={href("month", first)}
            className="text-[15px] font-medium capitalize hover:text-primary-text"
          >
            {formatDay(first, { month: "long" })}
          </Link>
          <div className="mt-2 grid grid-cols-7 gap-y-1 text-center text-[11px]">
            {monthGrid(first).map((d) => {
              const busy = eventsOn(d).length + (tasksByDay.get(d)?.length ?? 0) > 0;
              const inMonth = d.slice(0, 7) === first.slice(0, 7);
              return inMonth ? (
                <Link
                  key={d}
                  href={href("day", d)}
                  className={cn(
                    "relative mx-auto grid size-6 place-items-center rounded-md tabular-nums",
                    d === today
                      ? "bg-surface-strong font-medium text-fg"
                      : "text-fg-muted hover:bg-surface-strong",
                  )}
                  aria-current={d === today ? "date" : undefined}
                >
                  {Number(d.slice(8))}
                  {d === today ? (
                    <span aria-hidden className="now-dot absolute -bottom-0.5" />
                  ) : busy ? (
                    <span
                      aria-hidden
                      className="absolute bottom-0 size-1 rounded-full bg-primary-text"
                    />
                  ) : null}
                  {busy ? <span className="sr-only"> (con elementos)</span> : null}
                </Link>
              ) : (
                <span key={d} />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

type DragState = {
  id: string;
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  moved: boolean;
};

function TimeGrid({
  days,
  today,
  events,
  eventsOn,
  tasksByDay,
  onPick,
}: {
  days: ISODate[];
  today: ISODate;
  events: CalEvent[];
  eventsOn: (d: string) => CalEvent[];
  tasksByDay: Map<string, CalTask[]>;
  onPick: (d: EventDraft) => void;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const columns = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [override, setOverride] = useState<Record<string, { day: string; minutes: number }>>({});
  const [, start] = useTransition();
  const toast = useToast();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 7 * HOUR });
    const tick = () => {
      const d = new Date();
      setNow(d.getHours() * 60 + d.getMinutes());
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const colWidth = () =>
    columns.current ? columns.current.getBoundingClientRect().width / days.length : 1;
  const snap = (m: number) => Math.max(0, Math.min(24 * 60 - 15, Math.round(m / 15) * 15));

  function onPointerDown(e: React.PointerEvent, ev: CalEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ id: ev.id, startX: e.clientX, startY: e.clientY, dx: 0, dy: 0, moved: false });
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    setDrag({ ...drag, dx, dy, moved: drag.moved || Math.abs(dx) > 4 || Math.abs(dy) > 4 });
  }
  function onPointerUp(ev: CalEvent) {
    if (!drag) return;
    const d = drag;
    setDrag(null);
    if (!d.moved) return onPick(draftFrom(ev));
    const fromIdx = Math.max(0, days.indexOf(ev.startDay));
    const idx = Math.max(0, Math.min(days.length - 1, fromIdx + Math.round(d.dx / colWidth())));
    const minutes = snap(ev.startMinutes + (d.dy / HOUR) * 60);
    const day = days[idx];
    if (day === ev.startDay && minutes === ev.startMinutes) return;
    setOverride((o) => ({ ...o, [ev.id]: { day, minutes } }));
    start(async () => {
      const res = await moveEvent(ev.id, day, toTime(minutes));
      if (!res.ok) {
        setOverride((o) => {
          const n = { ...o };
          delete n[ev.id];
          return n;
        });
        toast(res.error, "error");
      } else toast("Evento movido");
    });
  }

  return (
    <div className="card overflow-hidden rounded-[var(--radius-card)]">
      <div className="overflow-x-auto">
        <div style={{ minWidth: days.length > 1 ? 640 : undefined }}>
          {/* Day headers + all-day lane */}
          <div
            className="grid border-b border-border"
            style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}
          >
            <div className="py-2 text-right text-[11px] text-fg-subtle" />
            {days.map((d) => (
              <div key={d} className="border-l border-border px-1.5 py-2">
                <Link href={href("day", d)} className="flex items-baseline gap-1.5">
                  <span className="text-[12px] text-fg-subtle">
                    {capitalize(formatDay(d, { weekday: "short" }).replace(".", ""))}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[16px] font-medium tabular-nums">
                    {Number(d.slice(8))}
                    {d === today ? <span className="now-dot" aria-hidden /> : null}
                  </span>
                </Link>
                <div className="mt-1 flex flex-col gap-0.5">
                  {eventsOn(d)
                    .filter((e) => e.all_day)
                    .map((e) => (
                      <Chip key={e.id} onClick={() => onPick(draftFrom(e))}>
                        {e.title}
                      </Chip>
                    ))}
                  {(tasksByDay.get(d) ?? []).map((t) => (
                    <Chip key={t.id} tone={t.done ? "done" : "task"} href={`/tasks?t=${t.id}`}>
                      ◦ {t.due_time ? `${t.due_time.slice(0, 5)} ` : ""}
                      {t.title}
                    </Chip>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Hour grid */}
          <div ref={scroller} className="relative max-h-[68vh] overflow-y-auto">
            <div
              className="grid"
              style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)`, height: 24 * HOUR }}
            >
              <div className="relative">
                {Array.from({ length: 24 }, (_, h) => (
                  <span
                    key={h}
                    className="absolute right-2 -translate-y-1/2 text-[11px] text-fg-subtle tabular-nums"
                    style={{ top: h * HOUR }}
                  >
                    {h ? `${pad(h)}:00` : ""}
                  </span>
                ))}
              </div>
              <div
                ref={columns}
                className="relative grid"
                style={{ gridColumn: "2 / -1", gridTemplateColumns: `repeat(${days.length}, 1fr)` }}
              >
                {days.map((d) => (
                  <div
                    key={d}
                    role="button"
                    tabIndex={-1}
                    aria-label={`Crear evento el ${formatDay(d, { day: "numeric", month: "long" })}`}
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      onPick(newDraft(d, snap(((e.clientY - rect.top) / HOUR) * 60 - 15)));
                    }}
                    className="relative border-l border-border"
                    style={{
                      backgroundImage: `repeating-linear-gradient(to bottom, var(--border) 0 1px, transparent 1px ${HOUR}px)`,
                    }}
                  >
                    {d === today && now !== null ? (
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-danger"
                        style={{ top: (now / 60) * HOUR }}
                      />
                    ) : null}
                  </div>
                ))}

                {events
                  .filter((e) => !e.all_day)
                  .map((ev) => {
                    const o = override[ev.id];
                    const day = o?.day ?? ev.startDay;
                    const idx = days.indexOf(day);
                    if (idx < 0) return null;
                    const startMin = o?.minutes ?? ev.startMinutes;
                    const duration =
                      ev.endDay === ev.startDay
                        ? Math.max(ev.endMinutes - ev.startMinutes, 20)
                        : 24 * 60 - ev.startMinutes;
                    const isDragging = drag?.id === ev.id && drag.moved;
                    return (
                      <button
                        key={ev.id}
                        type="button"
                        onPointerDown={(e) => onPointerDown(e, ev)}
                        onPointerMove={onPointerMove}
                        onPointerUp={() => onPointerUp(ev)}
                        onKeyDown={(e) => e.key === "Enter" && onPick(draftFrom(ev))}
                        className={cn(
                          "absolute z-20 touch-none overflow-hidden rounded-lg border border-primary/40 bg-primary/25 px-2 py-1 text-left text-[12px] leading-tight backdrop-blur-sm transition-shadow select-none",
                          isDragging
                            ? "cursor-grabbing shadow-[var(--shadow-float)] ring-2 ring-ring"
                            : "cursor-grab hover:bg-primary/35",
                        )}
                        style={{
                          top: (startMin / 60) * HOUR + 1,
                          height: Math.max((duration / 60) * HOUR - 2, 18),
                          left: `calc(${(idx / days.length) * 100}% + 3px)`,
                          width: `calc(${100 / days.length}% - 6px)`,
                          transform: isDragging
                            ? `translate(${drag!.dx}px, ${drag!.dy}px)`
                            : undefined,
                        }}
                      >
                        <span className="block truncate font-medium">{ev.title}</span>
                        <span className="block text-fg-muted">
                          {toTime(startMin)}–{toTime(Math.min(startMin + duration, 24 * 60 - 1))}
                        </span>
                        <span className="sr-only">. Pulsa para editar o arrastra para mover</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
