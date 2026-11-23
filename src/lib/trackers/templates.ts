import type { PropertyConfig, PropertyType } from "./properties";

type TemplateProperty = {
  name: string;
  type: PropertyType;
  config?: PropertyConfig;
  isTitle?: boolean;
  required?: boolean;
};
type TemplateView = {
  name: string;
  type: "table" | "list" | "cards" | "kanban" | "calendar" | "chart";
  config?: Record<string, unknown>;
};
export type TrackerTemplate = {
  key: string;
  name: string;
  icon: string;
  description: string;
  properties: TemplateProperty[];
  /** name of the date property used as time axis */
  dateProperty?: string;
  /** views reference properties by name; resolved to ids when created */
  views: TemplateView[];
};

const opts = (...labels: string[]) => labels.map((label, i) => ({ id: `o${i + 1}`, label }));

export const TRACKER_TEMPLATES: TrackerTemplate[] = [
  {
    key: "weight",
    name: "Peso corporal",
    icon: "⚖️",
    description: "Peso y % de grasa con su evolución.",
    properties: [
      { name: "Fecha", type: "date", isTitle: true, required: true },
      { name: "Peso", type: "decimal", config: { decimals: 1, unit: "kg" }, required: true },
      { name: "Grasa corporal", type: "percent", config: { decimals: 1 } },
      { name: "Nota", type: "text" },
    ],
    dateProperty: "Fecha",
    views: [
      {
        name: "Evolución",
        type: "chart",
        config: { kind: "line", y: "Peso", agg: "avg", bucket: "day" },
      },
      { name: "Registros", type: "table" },
    ],
  },
  {
    key: "water",
    name: "Hidratación",
    icon: "💧",
    description: "Vasos de agua al día y si llegaste al objetivo.",
    properties: [
      { name: "Fecha", type: "date", isTitle: true, required: true },
      { name: "Vasos", type: "integer", required: true },
      { name: "Objetivo cumplido", type: "formula", config: { formula: "{Vasos} >= 8" } },
    ],
    dateProperty: "Fecha",
    views: [
      {
        name: "Por día",
        type: "chart",
        config: { kind: "bar", y: "Vasos", agg: "sum", bucket: "day" },
      },
      { name: "Registros", type: "table" },
    ],
  },
  {
    key: "sleep",
    name: "Sueño",
    icon: "🌙",
    description: "Horas dormidas y calidad del descanso.",
    properties: [
      { name: "Fecha", type: "date", isTitle: true, required: true },
      { name: "Duración", type: "duration", required: true },
      { name: "Calidad", type: "rating", config: { max: 5 } },
      {
        name: "Horas",
        type: "formula",
        config: { formula: "round({Duración} / 60, 1)", decimals: 1 },
      },
    ],
    dateProperty: "Fecha",
    views: [
      {
        name: "Horas por noche",
        type: "chart",
        config: { kind: "bar", y: "Horas", agg: "avg", bucket: "day" },
      },
      { name: "Registros", type: "table" },
    ],
  },
  {
    key: "expenses",
    name: "Gastos",
    icon: "💳",
    description: "Gastos por categoría y total mensual.",
    properties: [
      { name: "Concepto", type: "text", isTitle: true, required: true },
      { name: "Fecha", type: "date", required: true },
      { name: "Importe", type: "currency", config: { currency: "EUR" }, required: true },
      {
        name: "Categoría",
        type: "select",
        config: { options: opts("Casa", "Comida", "Transporte", "Ocio", "Salud", "Otros") },
      },
    ],
    dateProperty: "Fecha",
    views: [
      {
        name: "Por mes",
        type: "chart",
        config: { kind: "bar", y: "Importe", agg: "sum", bucket: "month" },
      },
      { name: "Por categoría", type: "kanban", config: { groupBy: "Categoría" } },
      { name: "Movimientos", type: "table" },
    ],
  },
  {
    key: "reading",
    name: "Lecturas",
    icon: "📚",
    description: "Libros por leer, leyendo y leídos.",
    properties: [
      { name: "Título", type: "text", isTitle: true, required: true },
      { name: "Autor", type: "text" },
      { name: "Estado", type: "status", config: { options: opts("Por leer", "Leyendo", "Leído") } },
      { name: "Páginas", type: "integer" },
      { name: "Terminado", type: "date" },
      { name: "Valoración", type: "rating", config: { max: 5 } },
    ],
    dateProperty: "Terminado",
    views: [
      { name: "Tablero", type: "kanban", config: { groupBy: "Estado" } },
      { name: "Biblioteca", type: "cards" },
    ],
  },
  {
    key: "workouts",
    name: "Entrenamientos",
    icon: "🏋️",
    description: "Sesiones, duración y esfuerzo.",
    properties: [
      { name: "Fecha", type: "date", isTitle: true, required: true },
      {
        name: "Tipo",
        type: "select",
        config: { options: opts("Fuerza", "Cardio", "Movilidad", "Deporte") },
      },
      { name: "Duración", type: "duration" },
      { name: "Esfuerzo", type: "scale", config: { min: 1, max: 10 } },
      { name: "Notas", type: "long_text" },
    ],
    dateProperty: "Fecha",
    views: [
      {
        name: "Minutos por semana",
        type: "chart",
        config: { kind: "bar", y: "Duración", agg: "sum", bucket: "week" },
      },
      { name: "Calendario", type: "calendar" },
      { name: "Sesiones", type: "table" },
    ],
  },
  {
    key: "study",
    name: "Horas de estudio",
    icon: "🎓",
    description: "Tiempo de estudio por materia.",
    properties: [
      { name: "Fecha", type: "date", isTitle: true, required: true },
      {
        name: "Materia",
        type: "select",
        config: { options: opts("Idiomas", "Programación", "Lectura", "Otro") },
      },
      { name: "Duración", type: "duration", required: true },
    ],
    dateProperty: "Fecha",
    views: [
      {
        name: "Por semana",
        type: "chart",
        config: { kind: "bar", y: "Duración", agg: "sum", bucket: "week" },
      },
      { name: "Sesiones", type: "table" },
    ],
  },
  {
    key: "content",
    name: "Publicaciones",
    icon: "📱",
    description: "Publicaciones en redes y sus resultados.",
    properties: [
      { name: "Título", type: "text", isTitle: true, required: true },
      {
        name: "Plataforma",
        type: "select",
        config: { options: opts("Instagram", "TikTok", "YouTube", "X", "LinkedIn") },
      },
      { name: "Fecha", type: "date" },
      { name: "Visualizaciones", type: "integer" },
      { name: "Me gusta", type: "integer" },
      {
        name: "Engagement",
        type: "formula",
        config: {
          formula: "if({Visualizaciones} > 0, round({Me gusta} / {Visualizaciones} * 100, 2), 0)",
          decimals: 2,
        },
      },
      { name: "Enlace", type: "url" },
    ],
    dateProperty: "Fecha",
    views: [
      { name: "Publicaciones", type: "table" },
      {
        name: "Visualizaciones",
        type: "chart",
        config: { kind: "bar", y: "Visualizaciones", agg: "sum", bucket: "week" },
      },
    ],
  },
];

export const getTemplate = (key: string) => TRACKER_TEMPLATES.find((t) => t.key === key);
