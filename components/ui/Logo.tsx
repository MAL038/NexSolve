import clsx from "clsx";

interface LogoProps {
  variant?: "main" | "icon";
  className?: string;
}

export default function Logo({ variant = "main", className }: LogoProps) {
  if (variant === "icon") {
    return (
      <div className={clsx(
        "w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center flex-shrink-0",
        className
      )}>
        <span className="text-white font-black text-sm tracking-tight">N</span>
      </div>
    );
  }

  return (
    <div className={clsx("flex items-center gap-2.5 select-none", className)}>
      <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center flex-shrink-0 shadow-sm shadow-brand-200">
        <span className="text-white font-black text-sm tracking-tight">N</span>
      </div>
      <span className="text-base font-bold text-slate-800 tracking-tight">
        NEX<span className="text-brand-500">SOLVE</span>
      </span>
    </div>
  );
}
