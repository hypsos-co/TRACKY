import { cn } from "@/lib/utils";
import {
  MARK_PATH,
  MARK_VIEWBOX,
  WORDMARK_DOT_PATH,
  WORDMARK_LETTERS_PATH,
  WORDMARK_VIEWBOX,
} from "./paths";

type SvgProps = { className?: string; title?: string };

/** The TRACKY star mark. Inherits `currentColor`. */
export function LogoMark({ className, title }: SvgProps) {
  return (
    <svg
      viewBox={MARK_VIEWBOX}
      className={cn("shrink-0", className)}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      fill="currentColor"
    >
      <path d={MARK_PATH} />
    </svg>
  );
}

/** "TRACKY." wordmark. Letters inherit `currentColor`; the full stop takes the accent colour. */
export function Wordmark({ className, title = "TRACKY" }: SvgProps) {
  return (
    <svg
      viewBox={WORDMARK_VIEWBOX}
      className={cn("shrink-0", className)}
      role="img"
      aria-label={title}
    >
      <path d={WORDMARK_LETTERS_PATH} fill="currentColor" />
      <path d={WORDMARK_DOT_PATH} fill="var(--accent)" />
    </svg>
  );
}

/** Mark + wordmark lock-up. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5 text-fg", className)}>
      <LogoMark className="size-7" />
      <Wordmark className="h-[1.05rem] w-auto" />
    </span>
  );
}
