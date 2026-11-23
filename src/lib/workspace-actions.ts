"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { fail, invalid, ok, type ActionResult } from "@/lib/action-result";
import { WORKSPACE_COOKIE } from "@/lib/workspace";

const nameSchema = z.string().trim().min(1, "Ponle un nombre.").max(60, "Máximo 60 caracteres.");

async function remember(id: string) {
  (await cookies()).set(WORKSPACE_COOKIE, id, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export async function switchWorkspace(id: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  const { data } = await supabase.from("workspaces").select("id").eq("id", id).maybeSingle();
  if (!data) return fail("Ese espacio no existe o no tienes acceso.");
  await remember(id);
  revalidatePath("/", "layout");
  return ok(undefined);
}

export async function createWorkspace(name: string): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspaces")
    .insert({ name: parsed.data, created_by: user.id })
    .select("id")
    .single();
  if (error) return fail("No se pudo crear el espacio.");
  await remember(data.id);
  revalidatePath("/", "layout");
  return ok({ id: data.id });
}

export async function renameWorkspace(id: string, name: string): Promise<ActionResult> {
  await requireUser();
  const parsed = nameSchema.safeParse(name);
  if (!parsed.success) return invalid(parsed.error);
  const supabase = await createClient();
  const { error, count } = await supabase
    .from("workspaces")
    .update({ name: parsed.data }, { count: "exact" })
    .eq("id", id);
  if (error || !count) return fail("No se pudo renombrar el espacio.");
  revalidatePath("/", "layout");
  return ok(undefined);
}
