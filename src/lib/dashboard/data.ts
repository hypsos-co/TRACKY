import "server-only";
import { createClient } from "@/lib/supabase/server";
import { isWidgetType, type WidgetSize, type WidgetType } from "./widgets";

export type Widget = { id: string; type: WidgetType; size: WidgetSize; position: number };
export type Dashboard = { id: string; name: string; widgets: Widget[] };

export async function getDefaultDashboard(userId: string): Promise<Dashboard | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dashboards")
    .select("id, name, dashboard_widgets(id, type, size, position)")
    .eq("owner_id", userId)
    .order("is_default", { ascending: false })
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const widgets = (
    data.dashboard_widgets as { id: string; type: string; size: string; position: number }[]
  )
    .filter((w) => isWidgetType(w.type))
    .map((w) => ({ ...w, type: w.type as WidgetType, size: w.size as WidgetSize }))
    .sort((a, b) => a.position - b.position);
  return { id: data.id, name: data.name, widgets };
}
