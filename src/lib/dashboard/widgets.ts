type WidgetDef = {
  label: string;
  description: string;
  defaultSize: "sm" | "md" | "lg" | "full";
  /** The widget shows one tracker, chosen when it is added (config.trackerId). */
  needsTracker?: boolean;
};

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
  tracker_chart: {
    label: "Gráfico de tracker",
    description: "La evolución de uno de tus trackers.",
    defaultSize: "md",
    needsTracker: true,
  },
  tracker_latest: {
    label: "Último valor",
    description: "El último registro de un tracker y cuánto ha cambiado.",
    defaultSize: "sm",
    needsTracker: true,
  },
} as const satisfies Record<string, WidgetDef>;

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

export function needsTracker(type: WidgetType) {
  return (WIDGET_TYPES[type] as WidgetDef).needsTracker === true;
}

/** Tracker referenced by a widget's config, if any. */
export function widgetTrackerId(config: Record<string, unknown>): string | null {
  return typeof config.trackerId === "string" ? config.trackerId : null;
}
