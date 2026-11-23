/** Widget catalogue. Only types backed by real, implemented modules are listed. */
export const WIDGET_TYPES = {
  quick_capture: {
    label: "Captura rápida",
    description: "Añade tareas con lenguaje natural.",
    defaultSize: "full",
  },
  tasks_today: {
    label: "Tareas de hoy",
    description: "Vencidas y para hoy, con check rápido.",
    defaultSize: "md",
  },
  upcoming_events: {
    label: "Próximos eventos",
    description: "Tu agenda de los próximos 7 días.",
    defaultSize: "md",
  },
  task_stats: {
    label: "Estadísticas",
    description: "Tareas completadas por día y pendientes.",
    defaultSize: "md",
  },
  projects: {
    label: "Proyectos",
    description: "Proyectos activos y su progreso.",
    defaultSize: "md",
  },
  calendar_month: {
    label: "Calendario",
    description: "El mes actual con tus eventos y tareas.",
    defaultSize: "md",
  },
} as const;

export type WidgetType = keyof typeof WIDGET_TYPES;
export const WIDGET_SIZES = ["sm", "md", "lg", "full"] as const;
export type WidgetSize = (typeof WIDGET_SIZES)[number];
export const SIZE_LABELS: Record<WidgetSize, string> = {
  sm: "Pequeño",
  md: "Mediano",
  lg: "Grande",
  full: "Ancho completo",
};

export function isWidgetType(v: unknown): v is WidgetType {
  return typeof v === "string" && v in WIDGET_TYPES;
}
