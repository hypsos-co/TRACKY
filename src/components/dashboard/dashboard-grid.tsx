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
  type WidgetSize,
  type WidgetType,
} from "@/lib/dashboard/widgets";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export type GridItem = { id: string; type: WidgetType; size: WidgetSize; node: ReactNode };

const SPAN: Record<WidgetSize, string> = {
  sm: "sm:col-span-1 xl:col-span-1",
  md: "sm:col-span-1 xl:col-span-2",
  lg: "sm:col-span-2 xl:col-span-3",
  full: "sm:col-span-2 xl:col-span-4",
};

export function DashboardGrid({ items: initial }: { items: GridItem[] }) {
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
  const nodeById = new Map(initial.map((i) => [i.id, i.node]));
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
                  item={{ ...item, node: nodeById.get(item.id) ?? item.node }}
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

      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title="Añadir widget"
        description="Todos los widgets muestran tus datos reales."
      >
        <ul className="grid gap-2 pb-2 sm:grid-cols-2">
          {(Object.keys(WIDGET_TYPES) as WidgetType[]).map((type) => (
            <li key={type}>
              <button
                type="button"
                onClick={() =>
                  start(async () => {
                    const res = await addWidget(type);
                    if (!res.ok) return toast(res.error, "error");
                    toast(`Añadido: ${WIDGET_TYPES[type].label}`);
                    setAdding(false);
                  })
                }
                className="flex h-full w-full flex-col items-start gap-1 rounded-2xl border border-border p-4 text-left transition-colors hover:border-border-strong hover:bg-surface-strong"
              >
                <span className="font-medium">{WIDGET_TYPES[type].label}</span>
                <span className="text-[13px] text-fg-muted">{WIDGET_TYPES[type].description}</span>
              </button>
            </li>
          ))}
        </ul>
      </Dialog>
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
  const label = WIDGET_TYPES[item.type].label;
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
