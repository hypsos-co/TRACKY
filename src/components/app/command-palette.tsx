"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CheckSquare,
  CornerDownLeft,
  FolderKanban,
  Plus,
  Search,
} from "lucide-react";
import { searchEverything, type SearchResult } from "@/lib/search";
import { quickAddTask } from "@/lib/tasks/actions";
import { useToast } from "@/components/ui/toast";
import { NAV_ITEMS } from "./nav-items";
import { cn } from "@/lib/utils";

type Item = {
  key: string;
  label: string;
  hint?: string | null;
  Icon: typeof Search;
  run: () => void;
};
const KIND_ICON = { task: CheckSquare, project: FolderKanban, event: CalendarDays } as const;

/** ⌘K / Ctrl+K: search everything, jump anywhere, create a task from text. */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [active, setActive] = useState(0);
  const [, start] = useTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("tracky:command", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("tracky:command", onOpen);
    };
  }, []);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  function close() {
    setOpen(false);
    setQuery("");
    setResults([]);
  }

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const id = setTimeout(() => {
      searchEverything(q)
        .then(setResults)
        .catch(() => setResults([]));
    }, 180);
    return () => clearTimeout(id);
  }, [query]);

  const items: Item[] = useMemo(() => {
    const q = query.trim();
    const go = (href: string) => () => {
      setOpen(false);
      setQuery("");
      router.push(href);
    };
    const list: Item[] = [];
    if (q) {
      list.push({
        key: "create",
        label: `Crear tarea: “${q}”`,
        hint: "Entiende hoy, mañana, 17:00, !alta, #etiqueta",
        Icon: Plus,
        run: () =>
          start(async () => {
            const res = await quickAddTask(q);
            if (!res.ok) return toast(res.error, "error");
            toast(`Tarea creada: ${res.data.title}`);
            setOpen(false);
            setQuery("");
          }),
      });
      if (q.length >= 2) {
        for (const r of results)
          list.push({
            key: `${r.kind}-${r.id}`,
            label: r.title,
            hint: r.hint,
            Icon: KIND_ICON[r.kind],
            run: go(r.href),
          });
      }
    }
    const nav = NAV_ITEMS.filter((n) => !q || n.label.toLowerCase().includes(q.toLowerCase()));
    for (const n of nav)
      list.push({ key: `nav-${n.href}`, label: `Ir a ${n.label}`, Icon: n.Icon, run: go(n.href) });
    return list;
  }, [query, results, router, toast]);

  const activeIndex = Math.min(active, Math.max(items.length - 1, 0));

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((activeIndex + 1) % Math.max(items.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((activeIndex - 1 + items.length) % Math.max(items.length, 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      items[activeIndex]?.run();
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-label="Buscar y acciones rápidas"
      onClose={close}
      onClick={(e) => e.target === dialogRef.current && close()}
      className="fixed inset-x-0 top-[12vh] mx-auto w-[min(620px,calc(100vw-24px))]"
    >
      <div className="panel-float overflow-hidden rounded-[var(--radius-card)] bg-[var(--surface-solid)]">
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="size-5 text-fg-subtle" aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Buscar o crear tarea"
            aria-label="Buscar o crear"
            role="combobox"
            aria-expanded
            aria-controls="command-results"
            aria-activedescendant={items[activeIndex] ? `cmd-${items[activeIndex].key}` : undefined}
            className="h-14 flex-1 bg-transparent text-[16px] outline-none placeholder:text-fg-subtle"
          />
          <kbd className="hidden rounded-md border border-border px-1.5 py-0.5 text-[11px] text-fg-subtle sm:block">
            Esc
          </kbd>
        </div>
        <ul id="command-results" role="listbox" className="max-h-[50vh] overflow-y-auto p-2">
          {items.map((item, i) => (
            <li
              key={item.key}
              id={`cmd-${item.key}`}
              role="option"
              aria-selected={i === activeIndex}
              onMouseEnter={() => setActive(i)}
              onClick={item.run}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-[14px]",
                i === activeIndex ? "bg-surface-strong text-fg" : "text-fg-muted",
              )}
            >
              <item.Icon
                className={cn("size-4 shrink-0 text-fg-subtle", i === activeIndex && "text-fg")}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              {item.hint ? (
                <span className="hidden truncate text-[12px] text-fg-subtle sm:block">
                  {item.hint}
                </span>
              ) : null}
              {i === activeIndex ? (
                <CornerDownLeft className="size-3.5 text-fg-subtle" aria-hidden />
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </dialog>
  );
}

export function CommandButton({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("tracky:command"))}
      aria-label={compact ? "Buscar" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-xl border border-border bg-surface text-[14px] text-fg-muted transition-colors hover:bg-surface-strong hover:text-fg",
        compact ? "size-10 justify-center" : "h-9 w-full px-2.5",
        className,
      )}
    >
      <Search className="size-4" aria-hidden />
      {compact ? null : (
        <>
          <span className="flex-1 text-left">Buscar</span>
          <kbd className="rounded-md border border-border px-1.5 text-[11px]">⌘K</kbd>
        </>
      )}
    </button>
  );
}
