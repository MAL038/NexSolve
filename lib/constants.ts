import type { ProjectStatus } from "@/types";

export const PROJECT_STATUSES: {
  value: ProjectStatus;
  label: string;
  color: string;
  bg: string;
  dot: string;
}[] = [
  { value: "active",      label: "Active",      color: "text-brand-500",     bg: "bg-brand-50",      dot: "bg-brand-500" },
  { value: "in-progress", label: "In Progress", color: "text-amber-700",     bg: "bg-amber-50",      dot: "bg-amber-500" },
  { value: "archived",    label: "Archived",    color: "text-slate-500",     bg: "bg-slate-100",     dot: "bg-slate-400" },
];

export const USER_ROLES = ["admin", "member", "viewer"] as const;

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard",   icon: "LayoutDashboard" },
  { href: "/projects",  label: "Projects",    icon: "FolderKanban"    },
  { href: "/team",      label: "Team",        icon: "Users"           },
  { href: "/settings",  label: "Settings",    icon: "Settings"        },
] as const;
