"use client";

import { useState, useTransition } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { createWorkspace, switchWorkspace } from "@/lib/workspace-actions";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

type Ws = { id: string; name: string; icon: string | null; is_personal: boolean };

export function WorkspaceSwitcher({
  workspaces,
  currentId,
}: {
  workspaces: Ws[];
  currentId: string;
}) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const [pending, start] = useTransition();
  const toast = useToast();
  const current = workspaces.find((w) => w.id === currentId);

  function pick(id: string) {
    start(async () => {
      const res = await switchWorkspace(id);
      if (!res.ok) toast(res.error, "error");
      setOpen(false);
    });
  }

  function create(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const res = await createWorkspace(name);
      if (!res.ok) return setError(res.error);
      setCreating(false);
      setOpen(false);
      setName("");
      toast("Espacio creado");
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-11 w-full items-center gap-2.5 rounded-xl border border-border bg-surface px-3 text-left text-[14px] font-medium transition-colors hover:bg-surface-strong"
      >
        <span
          aria-hidden
          className="grid size-6 place-items-center rounded-md bg-primary text-[12px] text-primary-fg"
        >
          {current?.icon ?? current?.name.charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1 truncate">{current?.name}</span>
        <span className="sr-only">, cambiar espacio de trabajo</span>
        <ChevronsUpDown className="size-4 text-fg-subtle" aria-hidden />
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Espacios de trabajo"
        description="Cada espacio tiene sus propias tareas, proyectos y calendario."
      >
        <ul className="flex flex-col gap-1">
          {workspaces.map((w) => (
            <li key={w.id}>
              <button
                type="button"
                disabled={pending}
                onClick={() => pick(w.id)}
                className={cn(
                  "flex h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-[15px] transition-colors hover:bg-surface-strong",
                  w.id === currentId && "bg-surface",
                )}
              >
                <span
                  aria-hidden
                  className="grid size-7 place-items-center rounded-lg bg-primary text-[13px] text-primary-fg"
                >
                  {w.icon ?? w.name.charAt(0).toUpperCase()}
                </span>
                <span className="flex-1 truncate">{w.name}</span>
                {w.is_personal ? (
                  <span className="text-[12px] text-fg-subtle">Personal</span>
                ) : null}
                {w.id === currentId ? (
                  <Check className="size-4 text-accent" aria-label="Actual" />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
        {creating ? (
          <form onSubmit={create} className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
            <Field
              label="Nombre del espacio"
              value={name}
              onChange={(e) => setName(e.target.value)}
              errors={error ? [error] : undefined}
              autoFocus
              maxLength={60}
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={pending}>
                Crear espacio
              </Button>
              <Button variant="ghost" onClick={() => setCreating(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        ) : (
          <Button variant="glass" className="mt-4 w-full" onClick={() => setCreating(true)}>
            <Plus className="size-4" aria-hidden /> Nuevo espacio
          </Button>
        )}
      </Dialog>
    </>
  );
}
