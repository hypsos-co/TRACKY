import "server-only";
import { createClient } from "@/lib/supabase/server";
import { addDays, type ISODate, utcToZoned, zonedToUtc } from "@/lib/dates";

export type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string;
  all_day: boolean;
  kind: string;
  /** wall-clock values in the user's zone, for rendering */
  startDay: ISODate;
  endDay: ISODate;
  startMinutes: number;
  endMinutes: number;
  startTime: string;
  endTime: string;
};

export type CalendarTask = {
  id: string;
  title: string;
  due_date: string;
  due_time: string | null;
  done: boolean;
  priority: number;
};

/** Events overlapping [from, to] (calendar days in `timeZone`) + tasks due in that range. */
export async function listCalendar(
  workspaceId: string,
  from: ISODate,
  to: ISODate,
  timeZone: string,
) {
  const supabase = await createClient();
  const rangeStart = zonedToUtc(from, "00:00", timeZone).toISOString();
  const rangeEnd = zonedToUtc(addDays(to, 1), "00:00", timeZone).toISOString();

  const [eventsRes, tasksRes] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, description, location, starts_at, ends_at, all_day, kind")
      .eq("workspace_id", workspaceId)
      .lt("starts_at", rangeEnd)
      .gte("ends_at", rangeStart)
      .order("starts_at")
      .limit(1000),
    supabase
      .from("tasks")
      .select(
        "id, title, due_date, due_time, completed_at, priority, status:task_statuses!inner(category)",
      )
      .eq("workspace_id", workspaceId)
      .neq("status.category", "canceled")
      .gte("due_date", from)
      .lte("due_date", to)
      .order("due_time", { nullsFirst: true })
      .limit(1000),
  ]);
  if (eventsRes.error) throw new Error(eventsRes.error.message);
  if (tasksRes.error) throw new Error(tasksRes.error.message);

  const events: CalendarEvent[] = eventsRes.data.map((e) => {
    const s = utcToZoned(new Date(e.starts_at), timeZone);
    const en = utcToZoned(new Date(e.ends_at), timeZone);
    return {
      ...e,
      startDay: s.day,
      endDay: en.day,
      startMinutes: s.minutes,
      endMinutes: en.minutes,
      startTime: s.time,
      endTime: en.time,
    };
  });
  const tasks: CalendarTask[] = tasksRes.data.map((t) => ({
    id: t.id,
    title: t.title,
    due_date: t.due_date!,
    due_time: t.due_time,
    done: Boolean(t.completed_at),
    priority: t.priority,
  }));
  return { events, tasks };
}
