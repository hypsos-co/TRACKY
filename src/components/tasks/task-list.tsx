"use client";

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { groupTasks } from "@/lib/tasks/grouping";
import { TaskItem, type TaskItemData } from "./task-item";
import { cn } from "@/lib/utils";

type Row = TaskItemData & { position: number; created_at: string };

export function TaskList({
  tasks,
  today,
  showProject = true,
}: {
  tasks: Row[];
  today: string;
  showProject?: boolean;
}) {
  const [showDone, setShowDone] = useState(false);
  const groups = groupTasks(tasks, today);

  return (
    <div className="flex flex-col gap-6">
      {groups.map((g) => {
        const isDone = g.key === "done";
        return (
          <section key={g.key} aria-labelledby={`sec-${g.key}`}>
            <h2
              id={`sec-${g.key}`}
              className="mb-1 flex items-center gap-2 px-3 text-[13px] font-medium tracking-[0.04em] text-fg-subtle uppercase"
            >
              {isDone ? (
                <button
                  type="button"
                  onClick={() => setShowDone((s) => !s)}
                  aria-expanded={showDone}
                  className="flex items-center gap-1.5 uppercase hover:text-fg"
                >
                  <ChevronRight
                    className={cn("size-4 transition-transform", showDone && "rotate-90")}
                    aria-hidden
                  />
                  {g.label}
                </button>
              ) : (
                <span className={cn(g.key === "overdue" && "text-danger-text")}>{g.label}</span>
              )}
              <span className="text-fg-subtle/80">{g.tasks.length}</span>
            </h2>
            {!isDone || showDone ? (
              <ul className="flex flex-col">
                {g.tasks.map((t) => (
                  <TaskItem key={t.id} task={t} today={today} showProject={showProject} />
                ))}
              </ul>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
