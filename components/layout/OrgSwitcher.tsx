"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, Check, Loader2 } from "lucide-react";
import clsx from "clsx";

interface Org {
  id:            string;
  name:          string;
  logo_url?:     string | null;
  primary_color?: string | null;
  role:          string;
}

export default function OrgSwitcher() {
  const router = useRouter();
  const [orgs,       setOrgs]       = useState<Org[]>([]);
  const [currentId,  setCurrentId]  = useState<string | null>(null);
  const [open,       setOpen]       = useState(false);
  const [switching,  setSwitching]  = useState(false);
  const [loaded,     setLoaded]     = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/organisation/my-orgs")
      .then(r => r.ok ? r.json() : { orgs: [], current_org_id: null })
      .then(data => {
        setOrgs(data.orgs ?? []);
        setCurrentId(data.current_org_id ?? null);
        setLoaded(true);
      });
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  // Niet renderen als user maar in 1 org zit of nog niet geladen
  if (!loaded || orgs.length <= 1) return null;

  const current = orgs.find(o => o.id === currentId) ?? orgs[0];

  async function switchOrg(org: Org) {
    if (org.id === currentId) { setOpen(false); return; }
    setSwitching(true);
    try {
      await fetch("/api/organisation/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id: org.id }),
      });
      setCurrentId(org.id);
      setOpen(false);
      router.refresh();
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div ref={menuRef} className="relative px-3 mb-1">
      <button
        onClick={() => setOpen(o => !o)}
        className={clsx(
          "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all",
          "border border-transparent hover:border-slate-200 hover:bg-slate-50",
          open && "border-slate-200 bg-slate-50"
        )}
      >
        <div className="w-7 h-7 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
          {current?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.logo_url} alt="" className="w-full h-full rounded-lg object-cover" />
          ) : (
            <Building2 size={14} className="text-brand-600" />
          )}
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p className="text-xs font-semibold text-slate-700 truncate">{current?.name ?? "Organisatie"}</p>
          <p className="text-[10px] text-slate-400 capitalize">{current?.role ?? ""}</p>
        </div>
        {switching
          ? <Loader2 size={13} className="animate-spin text-slate-400 flex-shrink-0" />
          : <ChevronDown size={13} className={clsx("text-slate-400 flex-shrink-0 transition-transform", open && "rotate-180")} />
        }
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 bg-white rounded-xl border border-slate-200 shadow-lg z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Jouw organisaties
            </p>
          </div>
          <div className="py-1">
            {orgs.map(org => (
              <button
                key={org.id}
                onClick={() => switchOrg(org)}
                className={clsx(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors text-left",
                  org.id === currentId
                    ? "bg-brand-50 text-brand-700"
                    : "text-slate-700 hover:bg-slate-50"
                )}
              >
                <div className="w-7 h-7 rounded-lg bg-brand-100 flex items-center justify-center flex-shrink-0">
                  {org.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={org.logo_url} alt="" className="w-full h-full rounded-lg object-cover" />
                  ) : (
                    <Building2 size={13} className="text-brand-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{org.name}</p>
                  <p className="text-[10px] text-slate-400 capitalize">{org.role}</p>
                </div>
                {org.id === currentId && <Check size={13} className="text-brand-600 flex-shrink-0" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
