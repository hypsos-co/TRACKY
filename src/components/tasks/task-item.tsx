"use client";

import { useOptimistic, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Check, Clock, Flag, FolderKanban, ListTree } from "lucide-react";
import { setTaskDone } from "@/lib/tasks/actions";
import { dueLabel, dayDiff } from "@/lib/dates";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export type TaskItemData = {
  id: string;
  title: string;
  priority: number;
  due_date: string | null;
  due_time: string | null;
  completed_at: string | null;
  project: { id: string; name: string } | null;
  tags: { id: string; name: string }[];
  subtasks: { total: number; done: number };
};

const PRIORITY_STYLE = [
  "",
  "text-fg-subtle",
  "text-fg-muted",
  "text-primary-text",
  "text-danger-text",
];
const PRIORITY_NAME = ["", "Baja", "Media", "Alta", "Urgente"];

/** Opens the task detail by adding ?t=<id> to the current URL. */
export function useOpenTask() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (id: string) => {
    const next = new URLSearchParams(params.toString());
    next.set("t", id);
    router.push(`${pathname}?${next.toString()}`, { scroll: false });
  };
}

export function CompleteButton({
  id,
  title,
  done,
  onToggle,
}: {
  id: string;
  title: string;
  done: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={done}
      aria-label={done ? `Marcar como pendiente: ${title}` : `Completar: ${title}`}
      data-task-id={id}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(!done);
      }}
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-full border-[1.5px] transition-[background-color,border-color,transform] duration-150 active:scale-[0.97]",
        done
          ? "border-primary bg-primary text-primary-fg"
          : "border-border-strong hover:border-fg-subtle",
      )}
    >
      {done ? (
        <motion.span
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
        >
          <Check className="size-3.5 [stroke-width:2.5]" aria-hidden />
        </motion.span>
      ) : null}
    </button>
  );
}

export function TaskItem({
  task,
  today,
  showProject = true,
  openInTasks = false,
}: {
  task: TaskItemData;
  today: string;
  showProject?: boolean;
  /** open the detail on /tasks instead of the current page (e.g. from the dashboard) */
  openInTasks?: boolean;
}) {
  const [, start] = useTransition();
  const [done, setDone] = useOptimistic(Boolean(task.completed_at));
  const toast = useToast();
  const openHere = useOpenTask();
  const router = useRouter();
  const open = (id: string) => (openInTasks ? router.push(`/tasks?t=${id}`) : openHere(id));
  const overdue = !done && task.due_date && dayDiff(today, task.due_date) < 0;

  function toggle(next: boolean) {
    start(async () => {
      setDone(next);
      const res = await setTaskDone(task.id, next);
      if (!res.ok) toast(res.error, "error");
      else if (next) toast("Tarea completada");
    });
  }

  return (
    <li className="group">
      <div className="relative flex items-start gap-3 rounded-[var(--radius-field)] px-3 py-2.5 transition-colors focus-within:bg-surface hover:bg-surface">
        <div className="relative z-10 pt-0.5">
          <CompleteButton id={task.id} title={task.title} done={done} onToggle={toggle} />
        </div>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => open(task.id)}
            className={cn(
              "block w-full text-left text-[15px] leading-snug break-words after:absolute after:inset-0 after:rounded-[var(--radius-field)] focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-ring",
              done && "text-fg-subtle line-through decoration-fg-subtle/60",
            )}
          >
            {task.title}
          </button>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-fg-subtle">
            {task.due_date ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  overdue && "font-medium text-danger-text",
                )}
              >
                <Clock className="size-3.5" aria-hidden />
                {dueLabel(task.due_date, today)}
                {task.due_time ? ` · ${task.due_time.slice(0, 5)}` : ""}
              </span>
            ) : null}
            {task.priority > 0 ? (
              <span className={cn("inline-flex items-center gap-1", PRIORITY_STYLE[task.priority])}>
                <Flag className="size-3.5" aria-hidden />
                {PRIORITY_NAME[task.priority]}
              </span>
            ) : null}
            {showProject && task.project ? (
              <span className="inline-flex items-center gap-1">
                <FolderKanban className="size-3.5" aria-hidden />
                {task.project.name}
              </span>
            ) : null}
            {task.subtasks.total > 0 ? (
              <span className="inline-flex items-center gap-1">
                <ListTree className="size-3.5" aria-hidden />
                {task.subtasks.done}/{task.subtasks.total}
              </span>
            ) : null}
            {task.tags.map((t) => (
              <span key={t.id} className="text-fg-subtle">
                #{t.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </li>
  );
}
