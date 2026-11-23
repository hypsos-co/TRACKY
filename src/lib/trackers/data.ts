import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Property, PropertyType } from "./properties";

export type TrackerSummary = {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  updated_at: string;
  entries: number;
};
export type TrackerView = {
  id: string;
  name: string;
  type: "table" | "list" | "cards" | "kanban" | "calendar" | "chart";
  config: Record<string, unknown>;
  position: number;
};
export type TrackerEntry = {
  id: string;
  values: Record<string, unknown>;
  created_at: string;
  links: Record<string, string[]>;
};
export type TrackerFull = {
  id: string;
  name: string;
  icon: string | null;
  description: string | null;
  date_property_id: string | null;
  properties: Property[];
  views: TrackerView[];
  entries: TrackerEntry[];
};

export async function listTrackers(workspaceId: string): Promise<TrackerSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trackers")
    .select("id, name, icon, description, updated_at, tracker_entries(count)")
    .eq("workspace_id", workspaceId)
    .is("archived_at", null)
    .order("position")
    .order("created_at");
  if (error) throw new Error(`No se pudieron cargar los trackers: ${error.message}`);
  return data.map(({ tracker_entries, ...t }) => ({
    ...t,
    entries: (tracker_entries as unknown as { count: number }[])[0]?.count ?? 0,
  }));
}

export async function getTracker(id: string): Promise<TrackerFull | null> {
  const supabase = await createClient();
  const { data: t } = await supabase
    .from("trackers")
    .select("id, name, icon, description, date_property_id")
    .eq("id", id)
    .maybeSingle();
  if (!t) return null;
  const [props, views, entries] = await Promise.all([
    supabase
      .from("tracker_properties")
      .select("id, name, type, config, position, is_title, required")
      .eq("tracker_id", id)
      .order("position"),
    supabase
      .from("tracker_views")
      .select("id, name, type, config, position")
      .eq("tracker_id", id)
      .order("position"),
    supabase
      .from("tracker_entries")
      .select("id, values, created_at")
      .eq("tracker_id", id)
      .order("created_at", { ascending: false })
      .limit(5000),
  ]);
  if (props.error || views.error || entries.error) throw new Error("No se pudo cargar el tracker.");
  const entryIds = entries.data.map((e) => e.id);
  const links: Record<string, Record<string, string[]>> = {};
  if (entryIds.length && props.data.some((p) => p.type === "relation")) {
    for (let i = 0; i < entryIds.length; i += 500) {
      const { data } = await supabase
        .from("tracker_entry_links")
        .select("entry_id, property_id, target_entry_id")
        .in("entry_id", entryIds.slice(i, i + 500));
      for (const l of data ?? [])
        ((links[l.entry_id] ??= {})[l.property_id] ??= []).push(l.target_entry_id);
    }
  }
  return {
    ...t,
    properties: props.data.map((p) => ({
      ...p,
      type: p.type as PropertyType,
      config: (p.config ?? {}) as Property["config"],
    })),
    views: views.data.map((v) => ({
      ...v,
      type: v.type as TrackerView["type"],
      config: (v.config ?? {}) as Record<string, unknown>,
    })),
    entries: entries.data.map((e) => ({
      id: e.id,
      values: (e.values ?? {}) as Record<string, unknown>,
      created_at: e.created_at,
      links: links[e.id] ?? {},
    })),
  };
}

/** Title + label of every entry of a tracker (relation pickers). */
export async function listEntryTitles(trackerId: string): Promise<{ id: string; label: string }[]> {
  const supabase = await createClient();
  const [{ data: props }, { data: entries }] = await Promise.all([
    supabase.from("tracker_properties").select("id, is_title").eq("tracker_id", trackerId),
    supabase
      .from("tracker_entries")
      .select("id, values, created_at")
      .eq("tracker_id", trackerId)
      .order("created_at", { ascending: false })
      .limit(1000),
  ]);
  const titleId = props?.find((p) => p.is_title)?.id;
  return (entries ?? []).map((e) => ({
    id: e.id,
    label: String(
      (titleId && (e.values as Record<string, unknown>)?.[titleId]) ?? e.created_at.slice(0, 10),
    ),
  }));
}
