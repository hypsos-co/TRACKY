"use client";

import { useRef } from "react";
import { TRACKER_ICONS, TRACKER_ICON_KEYS, type TrackerIconKey } from "@/lib/trackers/icons";
import { cn } from "@/lib/utils";

/** Radio group of line icons (arrow keys move, like native radios). */
export function IconPicker({
  value,
  onChange,
}: {
  value: TrackerIconKey;
  onChange: (key: TrackerIconKey) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const move = (from: number, delta: number) => {
    const next = (from + delta + TRACKER_ICON_KEYS.length) % TRACKER_ICON_KEYS.length;
    onChange(TRACKER_ICON_KEYS[next]);
    refs.current[next]?.focus();
  };
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-[13px] font-medium text-fg-muted">Icono</legend>
      <div role="radiogroup" aria-label="Icono" className="grid grid-cols-8 gap-1 sm:grid-cols-10">
        {TRACKER_ICON_KEYS.map((key, i) => {
          const { Icon, label } = TRACKER_ICONS[key];
          const selected = key === value;
          return (
            <button
              key={key}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={label}
              title={label}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(key)}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight" || e.key === "ArrowDown") move(i, 1);
                else if (e.key === "ArrowLeft" || e.key === "ArrowUp") move(i, -1);
                else return;
                e.preventDefault();
              }}
              className={cn(
                "grid aspect-square place-items-center rounded-lg border transition-colors",
                selected
                  ? "border-primary bg-surface-strong text-fg"
                  : "border-transparent text-fg-muted hover:bg-surface hover:text-fg",
              )}
            >
              <Icon className="size-[18px]" aria-hidden />
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
