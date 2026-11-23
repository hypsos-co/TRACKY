"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createTask, deleteTask, setTaskDone, setTaskTags, updateTask } from "@/lib/tasks/actions";
import { PRIORITIES } from "@/lib/tasks/grouping";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Select, Textarea } from "@/components/ui/inputs";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";
import { CompleteButton } from "./task-item";

type Detail = {
  task: {
    id: string;
    title: string;
    notes: string | null;
    priority: number;
    due_date: string | null;
    due_time: string | null;
    completed_at: string | null;
    status: { id: string };
    project: { id: string } | null;
    tags: { name: string }[];
  };
  subtasks: { id: string; title: string; completed_at: string | null }[];
};

export function TaskDetail({
  detail,
  statuses,
  projects,
}: {
  detail: Detail | null;
  statuses: { id: string; name: string }[];
  projects: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const close = () => {
    const next = new URLSearchParams(params.toString());
    next.delete("t");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <Dialog open={Boolean(detail)} onClose={close} title="Detalle de la tarea" variant="sheet">
      {detail ? (
        <DetailForm
          key={detail.task.id + detail.task.status.id}
          detail={detail}
          statuses={statuses}
          projects={projects}
          onDone={close}
        />
      ) : null}
    </Dialog>
  );
}

function DetailForm({
  detail,
  statuses,
  projects,
  onDone,
}: {
  detail: Detail;
  statuses: { id: string; name: string }[];
  projects: { id: string; name: string }[];
  onDone: () => void;
}) {
  const t = detail.task;
  const [title, setTitle] = useState(t.title);
  const [notes, setNotes] = useState(t.notes ?? "");
  const [statusId, setStatusId] = useState(t.status.id);
  const [priority, setPriority] = useState(t.priority);
  const [dueDate, setDueDate] = useState(t.due_date ?? "");
  const [dueTime, setDueTime] = useState(t.due_time?.slice(0, 5) ?? "");
  const [projectId, setProjectId] = useState(t.project?.id ?? "");
  const [tags, setTags] = useState(t.tags.map((g) => g.name).join(", "));
  const [subtask, setSubtask] = useState("");
  const [error, setError] = useState<string>();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();

  function save(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    start(async () => {
      const res = await updateTask(t.id, {
        title,
        notes: notes || null,
        statusId,
        priority,
        dueDate: dueDate || null,
        dueTime: dueDate && dueTime ? dueTime : null,
        projectId: projectId || null,
      });
      if (!res.ok) return setError(res.error);
      const names = tags
        .split(",")
        .map((s) => s.trim().replace(/^#/, ""))
        .filter(Boolean);
      const before = t.tags.map((g) => g.name).join(",");
      if (names.join(",") !== before) {
        const tr = await setTaskTags(t.id, names);
        if (!tr.ok) return setError(tr.error);
      }
      toast("Cambios guardados");
    });
  }

  function addSubtask(e: React.FormEvent) {
    e.preventDefault();
    if (!subtask.trim()) return;
    start(async () => {
      const res = await createTask({
        title: subtask,
        parentId: t.id,
        projectId: projectId || null,
      });
      if (!res.ok) return toast(res.error, "error");
      setSubtask("");
    });
  }

  function remove() {
    start(async () => {
      const res = await deleteTask(t.id);
      if (!res.ok) return toast(res.error, "error");
      toast("Tarea eliminada");
      onDone();
    });
  }

  return (
    <div className="flex flex-col gap-6 pb-2">
      <form onSubmit={save} noValidate className="flex flex-col gap-4">
        {error ? <Alert tone="error">{error}</Alert> : null}
        <Field
          label="Título"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={300}
          required
        />
        <div className="grid grid-cols-2 gap-3">
          <Select label="Estado" value={statusId} onChange={(e) => setStatusId(e.target.value)}>
            {statuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
          <Select
            label="Prioridad"
            value={priority}
            onChange={(e) => setPriority(Number(e.target.value))}
          >
            {PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </Select>
          <Field
            label="Fecha"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="h-11"
          />
          <Field
            label="Hora"
            type="time"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
            disabled={!dueDate}
            className="h-11"
          />
        </div>
        <Select label="Proyecto" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
          <option value="">Sin proyecto</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
        <Field
          label="Etiquetas"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          hint="Separadas por comas"
          placeholder="casa, recados"
        />
        <Textarea
          label="Notas"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={20000}
          rows={4}
        />
        <Button type="submit" disabled={pending}>
          Guardar cambios
        </Button>
      </form>

      <section aria-labelledby="subtasks-title" className="border-t border-border pt-5">
        <h3 id="subtasks-title" className="text-[15px] font-medium">
          Subtareas
        </h3>
        <ul className="mt-2 flex flex-col gap-1">
          {detail.subtasks.map((s) => (
            <li key={s.id} className="flex items-center gap-3 rounded-xl px-2 py-2">
              <CompleteButton
                id={s.id}
                title={s.title}
                done={Boolean(s.completed_at)}
                onToggle={(next) =>
                  start(async () => {
                    const res = await setTaskDone(s.id, next);
                    if (!res.ok) toast(res.error, "error");
                  })
                }
              />
              <span className={s.completed_at ? "text-fg-subtle line-through" : ""}>{s.title}</span>
            </li>
          ))}
        </ul>
        <form onSubmit={addSubtask} className="mt-2 flex gap-2">
          <label htmlFor="new-subtask" className="sr-only">
            Nueva subtarea
          </label>
          <input
            id="new-subtask"
            value={subtask}
            onChange={(e) => setSubtask(e.target.value)}
            placeholder="Añadir subtarea"
            maxLength={300}
            className="h-11 min-w-0 flex-1 rounded-[var(--radius-field)] border border-border bg-surface px-3.5 text-[15px] outline-none focus:border-ring"
          />
          <Button type="submit" variant="secondary" disabled={pending || !subtask.trim()}>
            Añadir
          </Button>
        </form>
      </section>

      <section className="border-t border-border pt-5">
        {confirmDelete ? (
          <div className="flex flex-col gap-3">
            <p className="text-[14px] text-fg-muted">
              ¿Eliminar esta tarea y sus subtareas? No se puede deshacer.
            </p>
            <div className="flex gap-2">
              <Button variant="danger" onClick={remove} disabled={pending}>
                Sí, eliminar
              </Button>
              <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="ghost"
            onClick={() => setConfirmDelete(true)}
            className="text-danger-text hover:text-danger-text"
          >
            <Trash2 className="size-4" aria-hidden />
            Eliminar tarea
          </Button>
        )}
      </section>
    </div>
  );
}
