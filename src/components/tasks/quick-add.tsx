"use client";

import { useRef, useState, useTransition } from "react";
import { CornerDownLeft, Plus } from "lucide-react";
import { quickAddTask } from "@/lib/tasks/actions";
import { useToast } from "@/components/ui/toast";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

export function QuickAdd({
  projectId,
  dueDate,
  placeholder = "Añadir tarea, p. ej. «mañana 17:00 !alta #casa»",
  className,
  autoFocus,
}: {
  projectId?: string;
  dueDate?: string;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const ref = useRef<HTMLInputElement>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = value.trim();
    if (!text) return;
    start(async () => {
      const res = await quickAddTask(text, { projectId, dueDate });
      if (!res.ok) return toast(res.error, "error");
      setValue("");
      toast(`Tarea creada: ${res.data.title}`);
      ref.current?.focus();
    });
  }

  return (
    <form
      onSubmit={submit}
      className={cn("card flex items-center gap-2 rounded-xl px-3", className)}
    >
      <Plus className="size-4 shrink-0 text-fg-subtle" aria-hidden />
      <label htmlFor="quick-add" className="sr-only">
        Añadir tarea
      </label>
      <input
        id="quick-add"
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        maxLength={500}
        autoComplete="off"
        className="h-11 min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-fg-subtle"
      />
      <button
        type="submit"
        disabled={pending || !value.trim()}
        aria-label="Crear tarea"
        className="grid size-8 place-items-center rounded-lg text-fg-muted transition-colors hover:bg-surface-strong hover:text-fg disabled:opacity-40"
      >
        {pending ? <Spinner /> : <CornerDownLeft className="size-4" aria-hidden />}
      </button>
    </form>
  );
}
