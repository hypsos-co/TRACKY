import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth/session";
import { todayIn } from "@/lib/dates";

export const WORKSPACE_COOKIE = "tracky-ws";

export type Workspace = { id: string; name: string; icon: string | null; is_personal: boolean };

/** Workspaces the signed-in user belongs to (RLS-filtered). */
export const getWorkspaces = cache(async (): Promise<Workspace[]> => {
  await getProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspaces")
    .select("id, name, icon, is_personal")
    .order("is_personal", { ascending: false })
    .order("created_at");
  if (error) throw new Error(`No se pudieron cargar los espacios: ${error.message}`);
  return data;
});

/** Current workspace from the cookie, validated against membership. */
export const getCurrentWorkspace = cache(async (): Promise<Workspace> => {
  const [list, store] = await Promise.all([getWorkspaces(), cookies()]);
  const wanted = store.get(WORKSPACE_COOKIE)?.value;
  const ws = list.find((w) => w.id === wanted) ?? list.find((w) => w.is_personal) ?? list[0];
  if (!ws) throw new Error("Tu cuenta no tiene ningún espacio de trabajo.");
  return ws;
});

/** User context shared by every module page. */
export const getContext = cache(async () => {
  const [{ user, profile }, workspace, workspaces] = await Promise.all([
    getProfile(),
    getCurrentWorkspace(),
    getWorkspaces(),
  ]);
  const timeZone = profile.timezone;
  return { user, profile, workspace, workspaces, timeZone, today: todayIn(timeZone) };
});
