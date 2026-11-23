"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil } from "lucide-react";
import { createProject, updateProject } from "@/lib/projects/actions";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Select, Textarea } from "@/components/ui/inputs";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import type { ProjectStatus } from "@/lib/projects/data";

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "planned", label: "Planificado" },
  { value: "active", label: "Activo" },
  { value: "paused", label: "En pausa" },
  { value: "completed", label: "Completado" },
  { value: "archived", label: "Archivado" },
];

type Initial = {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  start_date: string | null;
  due_date: string | null;
};

export function ProjectFormButton({ project }: { project?: Initial }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant={project ? "secondary" : "accent"} onClick={() => setOpen(true)}>
        {project ? (
          <Pencil className="size-4" aria-hidden />
        ) : (
          <Plus className="size-4" aria-hidden />
        )}
        {project ? "Editar" : "Nuevo proyecto"}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={project ? "Editar proyecto" : "Nuevo proyecto"}
      >
        {open ? <ProjectForm project={project} onDone={() => setOpen(false)} /> : null}
      </Dialog>
    </>
  );
}

function ProjectForm({ project, onDone }: { project?: Initial; onDone: () => void }) {
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [status, setStatus] = useState<ProjectStatus>(project?.status ?? "active");
  const [startDate, setStartDate] = useState(project?.start_date ?? "");
  const [dueDate, setDueDate] = useState(project?.due_date ?? "");
  const [errors, setErrors] = useState<Record<string, string[] | undefined>>({});
  const [message, setMessage] = useState<string>();
  const [pending, start] = useTransition();
  const router = useRouter();
  const toast = useToast();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const input = {
        name,
        description: description || null,
        status,
        startDate: startDate || null,
        dueDate: dueDate || null,
      };
      const res = project ? await updateProject(project.id, input) : await createProject(input);
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {});
        setMessage(res.fieldErrors ? undefined : res.error);
        return;
      }
      toast(project ? "Proyecto guardado" : "Proyecto creado");
      onDone();
      if (!project && res.data && "id" in res.data) router.push(`/projects/${res.data.id}`);
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 pb-2">
      {message ? <Alert tone="error">{message}</Alert> : null}
      <Field
        label="Nombre"
        value={name}
        onChange={(e) => setName(e.target.value)}
        errors={errors.name}
        maxLength={120}
        autoFocus
      />
      <Textarea
        label="Descripción"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={5000}
        rows={3}
      />
      <Select
        label="Estado"
        value={status}
        onChange={(e) => setStatus(e.target.value as ProjectStatus)}
      >
        {STATUS_OPTIONS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </Select>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Inicio"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="h-11"
        />
        <Field
          label="Fecha límite"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          errors={errors.dueDate}
          className="h-11"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {project ? "Guardar cambios" : "Crear proyecto"}
      </Button>
    </form>
  );
}
