"use client";

import { useState, useTransition, type ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Settings2, X } from "lucide-react";
import { addWidget, removeWidget, reorderWidgets, resizeWidget } from "@/lib/dashboard/actions";
import {
  SIZE_LABELS,
  WIDGET_SIZES,
  WIDGET_TYPES,
  needsTracker,
  type WidgetSize,
  type WidgetType,
} from "@/lib/dashboard/widgets";
import { Button, buttonClasses } from "@/components/ui/button";
import Link from "next/link";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/inputs";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export type GridItem = {
  id: string;
  type: WidgetType;
  size: WidgetSize;
  /** Overrides the catalogue label in the widget header (e.g. the tracker's name). */
  title?: string;
  node: ReactNode;
};
type TrackerOption = { id: string; name: string; icon: string | null };

const SPAN: Record<WidgetSize, string> = {
  sm: "sm:col-span-1 xl:col-span-1",
  md: "sm:col-span-1 xl:col-span-2",
  lg: "sm:col-span-2 xl:col-span-3",
  full: "sm:col-span-2 xl:col-span-4",
};

export function DashboardGrid({
  items: initial,
  trackers,
}: {
  items: GridItem[];
  trackers: TrackerOption[];
}) {
  const [items, setItems] = useState(initial);
  const [editing, setEditing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [, start] = useTransition();
  const toast = useToast();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Widget contents always come from the latest server render; local state only
  // keeps order/size for instant feedback.
  const latestById = new Map(initial.map((i) => [i.id, i]));
  // Server data refreshed (e.g. after add/remove): adopt it.
  const serverKey = initial.map((i) => i.id + i.size).join();
  const [lastKey, setLastKey] = useState(serverKey);
  if (serverKey !== lastKey) {
    setLastKey(serverKey);
    setItems(initial);
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    const next = arrayMove(items, from, to);
    setItems(next);
    start(async () => {
      const res = await reorderWidgets(next.map((i) => i.id));
      if (!res.ok) toast(res.error, "error");
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end gap-2">
        {editing ? (
          <Button variant="glass" size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden /> Añadir widget
          </Button>
        ) : null}
        <Button
          variant={editing ? "accent" : "ghost"}
          size="sm"
          onClick={() => setEditing((e) => !e)}
          aria-pressed={editing}
        >
          <Settings2 className="size-4" aria-hidden /> {editing ? "Listo" : "Personalizar"}
        </Button>
      </div>

      {items.length ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {items.map((item) => (
                <SortableWidget
                  key={item.id}
                  item={{
                    ...item,
                    node: latestById.get(item.id)?.node ?? item.node,
                    title: latestById.get(item.id)?.title ?? item.title,
                  }}
                  editing={editing}
                  onRemove={() =>
                    start(async () => {
                      setItems((list) => list.filter((i) => i.id !== item.id));
                      const res = await removeWidget(item.id);
                      if (!res.ok) toast(res.error, "error");
                    })
                  }
                  onResize={(size) =>
                    start(async () => {
                      setItems((list) => list.map((i) => (i.id === item.id ? { ...i, size } : i)));
                      const res = await resizeWidget(item.id, size);
                      if (!res.ok) toast(res.error, "error");
                    })
                  }
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="rounded-[var(--radius-card)] border border-dashed border-border-strong p-10 text-center">
          <p className="font-medium">Tu panel está vacío</p>
          <Button className="mt-4" onClick={() => setAdding(true)}>
            <Plus className="size-4" aria-hidden /> Añadir widget
          </Button>
        </div>
      )}

      <AddWidgetDialog open={adding} onClose={() => setAdding(false)} trackers={trackers} />
    </div>
  );
}

function SortableWidget({
  item,
  editing,
  onRemove,
  onResize,
}: {
  item: GridItem;
  editing: boolean;
  onRemove: () => void;
  onResize: (s: WidgetSize) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !editing });
  const label = item.title ?? WIDGET_TYPES[item.type].label;
  return (
    <section
      ref={setNodeRef}
      aria-label={label}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(
        "glass col-span-1 flex min-w-0 animate-rise flex-col rounded-[var(--radius-card)] p-5",
        SPAN[item.size],
        isDragging && "z-30 shadow-2xl ring-2 ring-ring",
        editing && "ring-1 ring-border-strong",
      )}
    >
      <header className="mb-3 flex items-center gap-2">
        {editing ? (
          <button
            ref={setActivatorNodeRef}
            type="button"
            aria-label={`Mover ${label}`}
            className="-ml-1 grid size-8 cursor-grab touch-none place-items-center rounded-lg text-fg-subtle hover:bg-surface-strong hover:text-fg active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-4" aria-hidden />
          </button>
        ) : null}
        <h2 className="flex-1 text-[13px] font-medium tracking-[0.06em] text-fg-subtle uppercase">
          {label}
        </h2>
        {editing ? (
          <>
            <label className="sr-only" htmlFor={`size-${item.id}`}>
              Tamaño de {label}
            </label>
            <select
              id={`size-${item.id}`}
              value={item.size}
              onChange={(e) => onResize(e.target.value as WidgetSize)}
              className="h-8 rounded-lg border border-border bg-surface px-2 text-[12px] [&>option]:bg-surface-solid"
            >
              {WIDGET_SIZES.map((s) => (
                <option key={s} value={s}>
                  {SIZE_LABELS[s]}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Quitar ${label}`}
              className="grid size-8 place-items-center rounded-lg text-fg-subtle hover:bg-danger-surface hover:text-danger-text"
            >
              <X className="size-4" aria-hidden />
            </button>
          </>
        ) : null}
      </header>
      <div className="min-w-0 flex-1">{item.node}</div>
    </section>
  );
}

function AddWidgetDialog({
  open,
  onClose,
  trackers,
}: {
  open: boolean;
  onClose: () => void;
  trackers: TrackerOption[];
}) {
  const [picking, setPicking] = useState<WidgetType | null>(null);
  const [trackerId, setTrackerId] = useState("");
  const [pending, start] = useTransition();
  const toast = useToast();
  const close = () => {
    setPicking(null);
    onClose();
  };
  const add = (type: WidgetType, tracker?: string) =>
    start(async () => {
      const res = await addWidget(type, tracker);
      if (!res.ok) return toast(res.error, "error");
      toast(`Añadido: ${WIDGET_TYPES[type].label}`);
      close();
    });

  return (
    <Dialog
      open={open}
      onClose={close}
      title={picking ? WIDGET_TYPES[picking].label : "Añadir widget"}
      description={
        picking ? "Elige qué tracker mostrar." : "Todos los widgets muestran tus datos reales."
      }
    >
      {picking ? (
        trackers.length ? (
          <form
            className="flex flex-col gap-4 pb-2"
            onSubmit={(e) => {
              e.preventDefault();
              add(picking, trackerId || trackers[0].id);
            }}
          >
            <Select
              label="Tracker"
              value={trackerId || trackers[0].id}
              onChange={(e) => setTrackerId(e.target.value)}
            >
              {trackers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.icon ? `${t.icon} ` : ""}
                  {t.name}
                </option>
              ))}
            </Select>
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={pending}>
                Añadir widget
              </Button>
              <Button variant="ghost" onClick={() => setPicking(null)}>
                Volver
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col items-start gap-3 pb-2">
            <p className="text-[14px] text-fg-muted">
              Aún no tienes trackers en este espacio. Crea uno y vuelve para añadirlo al panel.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/trackers" className={buttonClasses({ variant: "primary" })}>
                Ir a Trackers
              </Link>
              <Button variant="ghost" onClick={() => setPicking(null)}>
                Volver
              </Button>
            </div>
          </div>
        )
      ) : (
        <ul className="grid gap-2 pb-2 sm:grid-cols-2">
          {(Object.keys(WIDGET_TYPES) as WidgetType[]).map((type) => (
            <li key={type}>
              <button
                type="button"
                disabled={pending}
                onClick={() => (needsTracker(type) ? setPicking(type) : add(type))}
                className="flex h-full w-full flex-col items-start gap-1 rounded-2xl border border-border p-4 text-left transition-colors hover:border-border-strong hover:bg-surface-strong"
              >
                <span className="font-medium">{WIDGET_TYPES[type].label}</span>
                <span className="text-[13px] text-fg-muted">{WIDGET_TYPES[type].description}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
