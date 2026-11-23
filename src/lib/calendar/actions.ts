"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { getContext } from "@/lib/workspace";
import { addDays, isISODate, zonedToUtc } from "@/lib/dates";

const isoDate = z.string().refine(isISODate, "Fecha no válida.");
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora no válida.");

const eventSchema = z
  .object({
    title: z.string().trim().min(1, "Escribe un título.").max(200, "Máximo 200 caracteres."),
    description: z.string().trim().max(5000).nullable().optional(),
    location: z.string().trim().max(200).nullable().optional(),
    allDay: z.boolean(),
    startDay: isoDate,
    endDay: isoDate,
    startTime: time.optional(),
    endTime: time.optional(),
    kind: z.enum(["event", "time_block"]).optional(),
  })
  .refine((v) => v.endDay >= v.startDay, {
    path: ["endDay"],
    error: "El final no puede ser anterior al inicio.",
  })
  .refine((v) => v.allDay || (v.startTime && v.endTime), {
    path: ["startTime"],
    error: "Indica la hora de inicio y fin.",
  })
  .refine((v) => v.allDay || v.endDay > v.startDay || (v.endTime ?? "") > (v.startTime ?? ""), {
    path: ["endTime"],
    error: "La hora de fin debe ser posterior al inicio.",
  });

async function toInstants(v: z.infer<typeof eventSchema>) {
  const { timeZone } = await getContext();
  if (v.allDay) {
    return {
      starts_at: zonedToUtc(v.startDay, "00:00", timeZone).toISOString(),
      // exclusive end at the next midnight, minus 1 minute so it stays on the last day
      ends_at: new Date(
        zonedToUtc(addDays(v.endDay, 1), "00:00", timeZone).getTime() - 60_000,
      ).toISOString(),
      all_day: true,
    };
  }
  return {
    starts_at: zonedToUtc(v.startDay, v.startTime!, timeZone).toISOString(),
    ends_at: zonedToUtc(v.endDay, v.endTime!, timeZone).toISOString(),
    all_day: false,
  };
}

export async function createEvent(
  input: z.input<typeof eventSchema>,
): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { workspace } = await getContext();
  const supabase = await createClient();
  const v = parsed.data;
  const { data, error } = await supabase
    .from("events")
    .insert({
      workspace_id: workspace.id,
      title: v.title,
      description: v.description || null,
      location: v.location || null,
      kind: v.kind ?? "event",
      ...(await toInstants(v)),
    })
    .select("id")
    .single();
  if (error) return fail("No se pudo crear el evento.");
  revalidatePath("/", "layout");
  return ok({ id: data.id });
}

export async function updateEvent(
  id: string,
  input: z.input<typeof eventSchema>,
): Promise<ActionResult> {
  await requireUser();
  if (!z.uuid().safeParse(id).success) return fail("Identificador no válido.");
  const parsed = eventSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const v = parsed.data;
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("events")
    .update(
      {
        title: v.title,
        description: v.description || null,
        location: v.location || null,
        kind: v.kind ?? "event",
        ...(await toInstants(v)),
      },
      { count: "exact" },
    )
    .eq("id", id);
  if (error || !count) return fail("No se pudo guardar el evento.");
  revalidatePath("/", "layout");
  return ok(undefined);
}

/** Move an event keeping its duration (drag & drop in the calendar). */
export async function moveEvent(
  id: string,
  startDay: string,
  startTime: string | null,
): Promise<ActionResult> {
  await requireUser();
  if (!z.uuid().safeParse(id).success || !isISODate(startDay)) return fail("Datos no válidos.");
  if (startTime !== null && !time.safeParse(startTime).success) return fail("Hora no válida.");
  const supabase = await createClient();
  const { data: ev } = await supabase
    .from("events")
    .select("starts_at, ends_at, all_day")
    .eq("id", id)
    .single();
  if (!ev) return fail("El evento no existe.");
  const { timeZone } = await getContext();
  const duration = new Date(ev.ends_at).getTime() - new Date(ev.starts_at).getTime();
  const start = zonedToUtc(
    startDay,
    ev.all_day || startTime === null ? "00:00" : startTime,
    timeZone,
  );
  const { error } = await supabase
    .from("events")
    .update({
      starts_at: start.toISOString(),
      ends_at: new Date(start.getTime() + duration).toISOString(),
    })
    .eq("id", id);
  if (error) return fail("No se pudo mover el evento.");
  revalidatePath("/", "layout");
  return ok(undefined);
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  await requireUser();
  if (!z.uuid().safeParse(id).success) return fail("Identificador no válido.");
  const supabase = await createClient();
  const { error, count } = await supabase.from("events").delete({ count: "exact" }).eq("id", id);
  if (error || !count) return fail("No se pudo eliminar el evento.");
  revalidatePath("/", "layout");
  return ok(undefined);
}
