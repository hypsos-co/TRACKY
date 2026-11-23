"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteProject } from "@/lib/projects/actions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";

export function DeleteProjectButton({ id, name }: { id: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();
  return (
    <>
      <Button
        variant="ghost"
        onClick={() => setOpen(true)}
        aria-label={`Eliminar proyecto ${name}`}
      >
        <Trash2 className="size-4" aria-hidden />
        <span className="hidden sm:inline">Eliminar</span>
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="¿Eliminar este proyecto?"
        description="Sus tareas se conservan, pero quedarán sin proyecto. No se puede deshacer."
      >
        <div className="flex gap-2 pb-2">
          <Button
            variant="danger"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await deleteProject(id);
                if (!res.ok) return toast(res.error, "error");
                toast("Proyecto eliminado");
                setOpen(false);
                router.push("/projects");
              })
            }
          >
            Sí, eliminar
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
        </div>
      </Dialog>
    </>
  );
}
