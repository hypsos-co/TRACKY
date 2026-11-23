import {
  Activity,
  Apple,
  Bike,
  BookOpen,
  Briefcase,
  Camera,
  Clapperboard,
  Code,
  Coffee,
  Droplet,
  Dumbbell,
  Flame,
  Footprints,
  GraduationCap,
  HeartPulse,
  Languages,
  Moon,
  Music,
  PenLine,
  PiggyBank,
  Pill,
  Plane,
  Scale,
  Smartphone,
  Smile,
  Sprout,
  Target,
  Timer,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/**
 * Line icons a tracker can use (one set, one stroke — unslop "Icons" pass).
 * `trackers.icon` stores the key; older trackers may still hold an emoji,
 * which `trackerIconKey` maps to its equivalent at render time (no data rewrite).
 */
export const TRACKER_ICONS = {
  activity: { label: "General", Icon: Activity },
  scale: { label: "Peso", Icon: Scale },
  droplet: { label: "Agua", Icon: Droplet },
  moon: { label: "Sueño", Icon: Moon },
  wallet: { label: "Gastos", Icon: Wallet },
  "piggy-bank": { label: "Ahorro", Icon: PiggyBank },
  "book-open": { label: "Lectura", Icon: BookOpen },
  dumbbell: { label: "Entrenamiento", Icon: Dumbbell },
  footprints: { label: "Pasos", Icon: Footprints },
  bike: { label: "Bici", Icon: Bike },
  "heart-pulse": { label: "Salud", Icon: HeartPulse },
  pill: { label: "Medicación", Icon: Pill },
  apple: { label: "Comida", Icon: Apple },
  coffee: { label: "Café", Icon: Coffee },
  smile: { label: "Ánimo", Icon: Smile },
  "graduation-cap": { label: "Estudio", Icon: GraduationCap },
  languages: { label: "Idiomas", Icon: Languages },
  "pen-line": { label: "Escritura", Icon: PenLine },
  code: { label: "Código", Icon: Code },
  clapperboard: { label: "Vídeo", Icon: Clapperboard },
  smartphone: { label: "Redes", Icon: Smartphone },
  camera: { label: "Fotos", Icon: Camera },
  music: { label: "Música", Icon: Music },
  briefcase: { label: "Trabajo", Icon: Briefcase },
  plane: { label: "Viajes", Icon: Plane },
  timer: { label: "Tiempo", Icon: Timer },
  target: { label: "Meta", Icon: Target },
  flame: { label: "Racha", Icon: Flame },
  sprout: { label: "Hábito", Icon: Sprout },
} as const satisfies Record<string, { label: string; Icon: LucideIcon }>;

export type TrackerIconKey = keyof typeof TRACKER_ICONS;
export const TRACKER_ICON_KEYS = Object.keys(TRACKER_ICONS) as TrackerIconKey[];
export const DEFAULT_TRACKER_ICON: TrackerIconKey = "activity";

/** Emoji used before the line-icon set → closest equivalent. */
const FROM_EMOJI: Record<string, TrackerIconKey> = {
  "⚖️": "scale",
  "⚖": "scale",
  "💧": "droplet",
  "🌙": "moon",
  "😴": "moon",
  "💳": "wallet",
  "💸": "wallet",
  "💰": "piggy-bank",
  "📚": "book-open",
  "📖": "book-open",
  "🏋️": "dumbbell",
  "🏋": "dumbbell",
  "💪": "dumbbell",
  "🏃": "footprints",
  "👟": "footprints",
  "🚴": "bike",
  "❤️": "heart-pulse",
  "💊": "pill",
  "🍎": "apple",
  "🥗": "apple",
  "☕": "coffee",
  "🙂": "smile",
  "😊": "smile",
  "🎓": "graduation-cap",
  "✍️": "pen-line",
  "💻": "code",
  "🎬": "clapperboard",
  "📱": "smartphone",
  "📷": "camera",
  "🎵": "music",
  "💼": "briefcase",
  "✈️": "plane",
  "⏱️": "timer",
  "🎯": "target",
  "🔥": "flame",
  "🌱": "sprout",
  "📈": "activity",
};

export function isTrackerIconKey(v: unknown): v is TrackerIconKey {
  return typeof v === "string" && v in TRACKER_ICONS;
}

/** Key to render for a stored icon value (key, legacy emoji or nothing). */
export function trackerIconKey(stored: string | null | undefined): TrackerIconKey {
  if (!stored) return DEFAULT_TRACKER_ICON;
  if (isTrackerIconKey(stored)) return stored;
  return (
    FROM_EMOJI[stored.trim()] ??
    FROM_EMOJI[stored.trim().replace(/\uFE0F/g, "")] ??
    DEFAULT_TRACKER_ICON
  );
}
