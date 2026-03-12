import { Clock, Loader2, XCircle, CheckSquare } from "lucide-react";
import type { SubprocessStatus } from "@/types";
import TaskCard from "./TaskCard";
import { TASK_STATUS_CONFIG } from "./TaskStatusBadge";
import clsx from "clsx";

interface Task {
  id:          string;
  title:       string;
  description?: string | null;
  status:      SubprocessStatus;
  project_id:  string;
  project:     { id: string; name: string; customer?: { id: string; name: string } | null };
}

const BOARD_COLUMNS: SubprocessStatus[] = ["todo", "in-progress", "blocked", "done"];

const COLUMN_ICONS: Record<SubprocessStatus, React.ElementType> = {
  "todo":        Clock,
  "in-progress": Loader2,
  "blocked":     XCircle,
  "done":        CheckSquare,
};

interface TaskBoardProps {
  tasks: Task[];
}

export default function TaskBoard({ tasks }: TaskBoardProps) {
  const byStatus = Object.fromEntries(
    BOARD_COLUMNS.map(s => [s, tasks.filter(t => t.status === s)])
  ) as Record<SubprocessStatus, Task[]>;

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-1 px-1">
      {BOARD_COLUMNS.map(status => {
        const cfg   = TASK_STATUS_CONFIG[status];
        const items = byStatus[status];
        const Icon  = COLUMN_ICONS[status];
        return (
          <div key={status} className="flex-shrink-0 w-72">
            {/* Column header */}
            <div className={clsx(
              "flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3 border",
              cfg.bg, cfg.border
            )}>
              <Icon size={13} className={clsx(cfg.text, status === "in-progress" && "animate-spin")} />
              <span className={clsx("text-xs font-bold flex-1", cfg.text)}>{cfg.label}</span>
              <span className={clsx(
                "text-[11px] font-bold px-1.5 py-0.5 rounded-full",
                "bg-white/60 border", cfg.text, cfg.border
              )}>
                {items.length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-2 min-h-[120px]">
              {items.length === 0 ? (
                <div className="px-3 py-8 text-center rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-400">Geen taken</p>
                </div>
              ) : items.map(task => (
                <TaskCard
                  key={task.id}
                  id={task.id}
                  title={task.title}
                  description={task.description}
                  status={task.status}
                  projectId={task.project_id}
                  projectName={task.project.name}
                  customerName={task.project.customer?.name}
                  compact
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
