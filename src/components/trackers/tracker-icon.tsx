import { TRACKER_ICONS, trackerIconKey } from "@/lib/trackers/icons";
import { cn } from "@/lib/utils";

/** A tracker's line icon (decorative: the tracker name always sits next to it). */
export function TrackerIcon({ icon, className }: { icon: string | null; className?: string }) {
  const { Icon } = TRACKER_ICONS[trackerIconKey(icon)];
  return <Icon className={cn("size-4 shrink-0 text-fg-muted", className)} aria-hidden />;
}
