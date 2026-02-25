import clsx from "clsx";

interface AvatarProps {
  name?:  string | null;
  url?:   string | null;
  size?:  "xs" | "sm" | "md" | "lg";
}

const SIZE = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-8 h-8 text-xs",
  md: "w-10 h-10 text-sm",
  lg: "w-12 h-12 text-base",
};

function initials(name?: string | null) {
  if (!name) return "?";
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

export default function Avatar({ name, url, size = "md" }: AvatarProps) {
  const s = SIZE[size];
  if (url) {
    return (
      <img
        src={url}
        alt={name ?? "avatar"}
        className={clsx(s, "rounded-full object-cover flex-shrink-0 bg-slate-100")}
      />
    );
  }
  return (
    <div className={clsx(
      s,
      "rounded-full flex items-center justify-center flex-shrink-0 font-semibold select-none",
      "bg-brand-100 text-brand-700"
    )}>
      {initials(name)}
    </div>
  );
}
