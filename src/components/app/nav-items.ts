import { LayoutGrid, Settings } from "lucide-react";
import { ROUTES } from "@/lib/routes";

/**
 * Primary navigation. Only modules that actually exist are listed —
 * each phase adds its entries here (see docs/ROADMAP.md).
 */
export const NAV_ITEMS = [
  { href: ROUTES.dashboard, label: "Inicio", Icon: LayoutGrid },
  { href: ROUTES.settings, label: "Ajustes", Icon: Settings },
] as const;
