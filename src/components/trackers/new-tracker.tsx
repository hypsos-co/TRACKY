"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Plus, Sparkles } from "lucide-react";
import { createTracker } from "@/lib/trackers/actions";
import { TRACKER_TEMPLATES } from "@/lib/trackers/templates";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Select } from "@/components/ui/inputs";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Mode = "template" | "blank" | "duplicate";

export function NewTrackerButton({ trackers }: { trackers: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("template");
  const [template, setTemplate] = useState(TRACKER_TEMPLATES[0].key);
  const [source, setSource] = useState(trackers[0]?.id ?? "");
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  const tpl = TRACKER_TEMPLATES.find((t) => t.key === template)!;
  const defaultName =
    mode === "template"
      ? tpl.name
      : mode === "duplicate"
        ? `${trackers.find((t) => t.id === source)?.name ?? ""} (copia)`
        : "";

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await createTracker({
        name: name.trim() || defaultName || "Nuevo tracker",
        templateKey: mode === "template" ? template : undefined,
        duplicateFromId: mode === "duplicate" ? source : undefined,
      });
      if (!res.ok) return setError(res.error);
      toast("Tracker creado");
      setOpen(false);
      router.push(`/trackers/${res.data.id}`);
    });
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden /> Nuevo tracker
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Nuevo tracker"
        description="Sigue cualquier cosa: peso, gastos, lecturas, hábitos…"
      >
        <form onSubmit={submit} noValidate className="flex flex-col gap-4 pb-2">
          {error ? <Alert tone="error">{error}</Alert> : null}
          <div role="radiogroup" aria-label="Cómo empezar" className="grid grid-cols-3 gap-2">
            {(
              [
                ["template", "Plantilla", Sparkles],
                ["blank", "En blanco", Plus],
                ["duplicate", "Duplicar", Copy],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={mode === value}
                disabled={value === "duplicate" && !trackers.length}
                onClick={() => setMode(value)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl border p-3 text-[13px] font-medium transition-colors disabled:opacity-40",
                  mode === value
                    ? "border-accent bg-surface-strong"
                    : "border-border hover:bg-surface",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {label}
              </button>
            ))}
          </div>

          {mode === "template" ? (
            <ul className="grid max-h-[40vh] gap-2 overflow-y-auto sm:grid-cols-2">
              {TRACKER_TEMPLATES.map((t) => (
                <li key={t.key}>
                  <button
                    type="button"
                    aria-pressed={template === t.key}
                    onClick={() => setTemplate(t.key)}
                    className={cn(
                      "flex h-full w-full flex-col gap-0.5 rounded-2xl border p-3 text-left",
                      template === t.key
                        ? "border-accent bg-surface-strong"
                        : "border-border hover:bg-surface",
                    )}
                  >
                    <span className="font-medium">
                      <span aria-hidden>{t.icon}</span> {t.name}
                    </span>
                    <span className="text-[12px] text-fg-muted">{t.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {mode === "duplicate" ? (
            <Select
              label="Tracker a duplicar (solo estructura)"
              value={source}
              onChange={(e) => setSource(e.target.value)}
            >
              {trackers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          ) : null}
          <Field
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={defaultName || "Por ejemplo: Meditación"}
            maxLength={120}
          />
          <Button type="submit" disabled={pending}>
            Crear tracker
          </Button>
        </form>
      </Dialog>
    </>
  );
}
