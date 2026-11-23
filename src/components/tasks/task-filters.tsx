"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { PRIORITIES } from "@/lib/tasks/grouping";
import { Select } from "@/components/ui/inputs";

export function TaskFilters({
  projects,
  tags,
}: {
  projects: { id: string; name: string }[];
  tags: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("t");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };
  const active = ["project", "priority", "tag"].some((k) => params.get(k));

  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:items-end">
      <div className="sm:w-48">
        <Select
          label="Proyecto"
          value={params.get("project") ?? ""}
          onChange={(e) => set("project", e.target.value)}
        >
          <option value="">Todos</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="sm:w-40">
        <Select
          label="Prioridad"
          value={params.get("priority") ?? ""}
          onChange={(e) => set("priority", e.target.value)}
        >
          <option value="">Todas</option>
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </Select>
      </div>
      <div className="sm:w-40">
        <Select
          label="Etiqueta"
          value={params.get("tag") ?? ""}
          onChange={(e) => set("tag", e.target.value)}
        >
          <option value="">Todas</option>
          {tags.map((t) => (
            <option key={t.id} value={t.name}>
              #{t.name}
            </option>
          ))}
        </Select>
      </div>
      {active ? (
        <button
          type="button"
          onClick={() => router.replace(pathname, { scroll: false })}
          className="flex h-11 items-center gap-1.5 rounded-[var(--radius-field)] px-3 text-[14px] text-fg-muted hover:bg-surface hover:text-fg"
        >
          <X className="size-4" aria-hidden /> Quitar filtros
        </button>
      ) : null}
    </div>
  );
}
