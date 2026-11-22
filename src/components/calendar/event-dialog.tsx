"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { createEvent, deleteEvent, updateEvent } from "@/lib/calendar/actions";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/inputs";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { useToast } from "@/components/ui/toast";

export type EventDraft = {
  id?: string;
  title: string;
  description: string | null;
  location: string | null;
  allDay: boolean;
  startDay: string;
  endDay: string;
  startTime: string;
  endTime: string;
};

export function EventDialog({ draft, onClose }: { draft: EventDraft | null; onClose: () => void }) {
  return (
    <Dialog
      open={Boolean(draft)}
      onClose={onClose}
      title={draft?.id ? "Editar evento" : "Nuevo evento"}
    >
      {draft ? (
        <EventForm
          key={draft.id ?? `${draft.startDay}-${draft.startTime}`}
          draft={draft}
          onDone={onClose}
        />
      ) : null}
    </Dialog>
  );
}

function EventForm({ draft, onDone }: { draft: EventDraft; onDone: () => void }) {
  const [v, setV] = useState(draft);
  const [error, setError] = useState<string>();
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const toast = useToast();
  const set = <K extends keyof EventDraft>(k: K, value: EventDraft[K]) =>
    setV((s) => ({ ...s, [k]: value }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    start(async () => {
      const input = {
        title: v.title,
        description: v.description || null,
        location: v.location || null,
        allDay: v.allDay,
        startDay: v.startDay,
        endDay: v.endDay < v.startDay ? v.startDay : v.endDay,
        startTime: v.allDay ? undefined : v.startTime,
        endTime: v.allDay ? undefined : v.endTime,
      };
      const res = draft.id ? await updateEvent(draft.id, input) : await createEvent(input);
      if (!res.ok) return setError(res.error);
      toast(draft.id ? "Evento guardado" : "Evento creado");
      onDone();
    });
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4 pb-2">
      {error ? <Alert tone="error">{error}</Alert> : null}
      <Field
        label="Título"
        value={v.title}
        onChange={(e) => set("title", e.target.value)}
        maxLength={200}
        autoFocus
      />
      <label className="flex items-center gap-3 text-[14px]">
        <input
          type="checkbox"
          checked={v.allDay}
          onChange={(e) => set("allDay", e.target.checked)}
          className="size-4 accent-[var(--accent)]"
        />
        Todo el día
      </label>
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Empieza"
          type="date"
          value={v.startDay}
          onChange={(e) => set("startDay", e.target.value)}
          className="h-11"
        />
        {v.allDay ? (
          <div />
        ) : (
          <Field
            label="Hora de inicio"
            type="time"
            value={v.startTime}
            onChange={(e) => set("startTime", e.target.value)}
            className="h-11"
          />
        )}
        <Field
          label="Termina"
          type="date"
          value={v.endDay}
          onChange={(e) => set("endDay", e.target.value)}
          className="h-11"
        />
        {v.allDay ? (
          <div />
        ) : (
          <Field
            label="Hora de fin"
            type="time"
            value={v.endTime}
            onChange={(e) => set("endTime", e.target.value)}
            className="h-11"
          />
        )}
      </div>
      <Field
        label="Lugar"
        value={v.location ?? ""}
        onChange={(e) => set("location", e.target.value)}
        maxLength={200}
      />
      <Textarea
        label="Descripción"
        value={v.description ?? ""}
        onChange={(e) => set("description", e.target.value)}
        maxLength={5000}
        rows={3}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending}>
          {draft.id ? "Guardar" : "Crear evento"}
        </Button>
        {draft.id ? (
          confirm ? (
            <>
              <Button
                variant="danger"
                disabled={pending}
                onClick={() =>
                  start(async () => {
                    const res = await deleteEvent(draft.id!);
                    if (!res.ok) return setError(res.error);
                    toast("Evento eliminado");
                    onDone();
                  })
                }
              >
                Sí, eliminar
              </Button>
              <Button variant="ghost" onClick={() => setConfirm(false)}>
                Cancelar
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              onClick={() => setConfirm(true)}
              className="text-danger-text hover:text-danger-text"
            >
              <Trash2 className="size-4" aria-hidden /> Eliminar
            </Button>
          )
        ) : null}
      </div>
    </form>
  );
}
