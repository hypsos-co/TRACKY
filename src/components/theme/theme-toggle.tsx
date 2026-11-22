"use client";

import { useEffect, useSyncExternalStore } from "react";
import { motion } from "motion/react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { THEME_STORAGE_KEY, type ThemePreference } from "./theme-script";

const OPTIONS: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: "dark", label: "Oscuro", Icon: Moon },
  { value: "light", label: "Claro", Icon: Sun },
  { value: "system", label: "Sistema", Icon: Monitor },
];

function resolve(pref: ThemePreference) {
  if (pref !== "system") return pref;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function apply(pref: ThemePreference) {
  const root = document.documentElement;
  root.dataset.theme = resolve(pref);
  root.dataset.themePref = pref;
}

function readPreference(): ThemePreference {
  const p = document.documentElement.dataset.themePref;
  return p === "light" || p === "system" ? p : "dark";
}

/** Re-render whenever the inline theme script or another toggle changes the preference. */
function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme-pref"],
  });
  return () => observer.disconnect();
}

/** Segmented control: Oscuro / Claro / Sistema. Preference is stored per device. */
export function ThemeToggle({ className }: { className?: string }) {
  const current = useSyncExternalStore(subscribe, readPreference, () => "dark" as const);

  useEffect(() => {
    if (current !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [current]);

  function choose(next: ThemePreference) {
    apply(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage unavailable (private mode): the choice still applies for this visit.
    }
  }

  return (
    <div
      role="radiogroup"
      aria-label="Tema"
      className={cn("glass inline-flex rounded-full p-1", className)}
    >
      {OPTIONS.map(({ value, label, Icon }) => {
        const selected = current === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => choose(value)}
            className={cn(
              "relative inline-flex h-9 items-center gap-2 rounded-full px-4 text-[13px] font-medium transition-colors",
              selected ? "text-accent-fg" : "text-fg-muted hover:text-fg",
            )}
          >
            {selected ? (
              <motion.span
                layoutId="theme-pill"
                className="absolute inset-0 rounded-full bg-accent"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            ) : null}
            <Icon className="relative size-4" aria-hidden />
            <span className="relative">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
