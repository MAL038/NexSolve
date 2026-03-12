import clsx from "clsx";
import type { UserRole, OrgRole } from "@/types";
import { PLATFORM_ROLE_CONFIG, ORG_ROLE_CONFIG } from "@/lib/permissions";

interface PlatformRoleBadgeProps {
  role: UserRole;
  size?: "xs" | "sm";
}

export function PlatformRoleBadge({ role, size = "sm" }: PlatformRoleBadgeProps) {
  const cfg = PLATFORM_ROLE_CONFIG[role] ?? PLATFORM_ROLE_CONFIG["member"];
  return (
    <span className={clsx(
      "inline-flex items-center font-semibold rounded-lg border",
      size === "xs" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1",
      cfg.bg, cfg.color, cfg.border
    )}>
      {cfg.label}
    </span>
  );
}

interface OrgRoleBadgeProps {
  role: OrgRole;
  size?: "xs" | "sm";
}

export function OrgRoleBadge({ role, size = "sm" }: OrgRoleBadgeProps) {
  const cfg = ORG_ROLE_CONFIG[role] ?? ORG_ROLE_CONFIG["member"];
  return (
    <span className={clsx(
      "inline-flex items-center font-semibold rounded-lg border",
      size === "xs" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1",
      cfg.bg, cfg.color, cfg.border
    )}>
      {cfg.label}
    </span>
  );
}
