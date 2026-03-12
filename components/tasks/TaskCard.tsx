import clsx from "clsx";
import Link from "next/link";
import { FolderKanban } from "lucide-react";
import type { SubprocessStatus } from "@/types";
import TaskStatusBadge from "./TaskStatusBadge";

interface TaskCardProps {
  id:          string;
  title:       string;
  description?: string | null;
  status:      SubprocessStatus;
  projectId:   string;
  projectName: string;
  customerName?: string | null;
  compact?:    boolean;
}

export default function TaskCard({
  id, title, description, status, projectId, projectName, customerName, compact,
}: TaskCardProps) {
  return (
    <Link
      href={`/projects/${projectId}`}
      className={clsx(
        "block card hover:border-brand-200 hover:bg-brand-50/20 transition-all group",
        compact ? "p-3" : "p-4"
      )}
    >
      <p className={clsx(
        "font-medium text-slate-700 group-hover:text-brand-700 transition-colors line-clamp-2",
        compact ? "text-xs mb-1.5" : "text-sm mb-2"
      )}>
        {title}
      </p>
      {!compact && description && (
        <p className="text-xs text-slate-400 truncate mb-2">{description}</p>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <TaskStatusBadge status={status} />
        <span className="flex items-center gap-1 text-[11px] text-slate-400 min-w-0">
          <FolderKanban size={10} className="flex-shrink-0" />
          <span className="truncate">
            {customerName ? `${customerName} · ${projectName}` : projectName}
          </span>
        </span>
      </div>
    </Link>
  );
}
