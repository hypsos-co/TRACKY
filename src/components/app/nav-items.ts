import {
  Activity,
  CalendarDays,
  CheckSquare,
  FolderKanban,
  LayoutGrid,
  Settings,
} from "lucide-react";
import { ROUTES } from "@/lib/routes";

/**
 * Primary navigation. Only modules that actually exist are listed —
 * each phase adds its entries here (see docs/ROADMAP.md).
 */
export const NAV_ITEMS = [
  { href: ROUTES.dashboard, label: "Inicio", Icon: LayoutGrid },
  { href: ROUTES.tasks, label: "Tareas", Icon: CheckSquare },
  { href: ROUTES.calendar, label: "Calendario", Icon: CalendarDays },
  { href: ROUTES.trackers, label: "Trackers", Icon: Activity },
  { href: ROUTES.projects, label: "Proyectos", Icon: FolderKanban },
  { href: ROUTES.settings, label: "Ajustes", Icon: Settings },
] as const;
