"use server";

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { getContext } from "@/lib/workspace";

export type SearchResult = {
  kind: "task" | "project" | "event";
  id: string;
  title: string;
  hint: string | null;
  href: string;
};

/** Universal search across the current workspace (title match, RLS-scoped). */
export async function searchEverything(query: string): Promise<SearchResult[]> {
  await requireUser();
  const q = query.trim().slice(0, 100);
  if (q.length < 2) return [];
  const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  const { workspace } = await getContext();
  const supabase = await createClient();
  const [tasks, projects, events] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, due_date, completed_at")
      .eq("workspace_id", workspace.id)
      .ilike("title", pattern)
      .limit(8),
    supabase
      .from("projects")
      .select("id, name, status")
      .eq("workspace_id", workspace.id)
      .ilike("name", pattern)
      .limit(6),
    supabase
      .from("events")
      .select("id, title, starts_at")
      .eq("workspace_id", workspace.id)
      .ilike("title", pattern)
      .order("starts_at", { ascending: false })
      .limit(6),
  ]);
  return [
    ...(tasks.data ?? []).map((t) => ({
      kind: "task" as const,
      id: t.id,
      title: t.title,
      hint: t.completed_at ? "Completada" : t.due_date,
      href: `/tasks?t=${t.id}`,
    })),
    ...(projects.data ?? []).map((p) => ({
      kind: "project" as const,
      id: p.id,
      title: p.name,
      hint: null,
      href: `/projects/${p.id}`,
    })),
    ...(events.data ?? []).map((e) => ({
      kind: "event" as const,
      id: e.id,
      title: e.title,
      hint: e.starts_at.slice(0, 10),
      href: `/calendar?view=day&date=${e.starts_at.slice(0, 10)}&e=${e.id}`,
    })),
  ];
}
