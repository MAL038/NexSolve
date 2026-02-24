"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Search, UserPlus, X, Loader2 } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import type { Profile, ProjectMember } from "@/types";

interface Props {
  projectId: string;
  existingMembers: ProjectMember[];
  onMemberAdded: (member: ProjectMember) => void;
}

export default function MemberSearch({ projectId, existingMembers, onMemberAdded }: Props) {
  const [query,    setQuery]   = useState("");
  const [results,  setResults] = useState<Pick<Profile, "id" | "full_name" | "email" | "avatar_url">[]>([]);
  const [loading,  setLoading] = useState(false);
  const [adding,   setAdding]  = useState<string | null>(null);
  const [open,     setOpen]    = useState(false);
  const [error,    setError]   = useState("");
  const debounce = useRef<NodeJS.Timeout>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node))
        setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback((q: string) => {
    clearTimeout(debounce.current);
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/users?query=${encodeURIComponent(q)}`);
        const data = await res.json();
        setResults(data);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setQuery(v);
    search(v);
  }

  async function addMember(userId: string) {
    setAdding(userId); setError("");
    const res = await fetch(`/api/projects/${projectId}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId, role: "member" }),
    });
    const data = await res.json();
    setAdding(null);
    if (!res.ok) { setError(data.error ?? "Failed to add member"); return; }
    onMemberAdded(data);
    setQuery(""); setResults([]); setOpen(false);
  }

  const existingIds = new Set(existingMembers.map(m => m.user_id));

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        {loading
          ? <Loader2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
          : <Search   size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        }
        <input
          className="input pl-9"
          placeholder="Zoeken op naam of e-mail…"
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
      </div>

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

      {open && results.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
          {results.map(u => {
            const already = existingIds.has(u.id);
            return (
              <div key={u.id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors">
                <Avatar name={u.full_name} url={u.avatar_url} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{u.full_name}</p>
                  <p className="text-xs text-slate-400 truncate">{u.email}</p>
                </div>
                {already ? (
                  <span className="text-xs text-slate-400 italic">Already member</span>
                ) : (
                  <button
                    onClick={() => addMember(u.id)}
                    disabled={adding === u.id}
                    className="btn-secondary text-xs px-2.5 py-1.5"
                  >
                    {adding === u.id
                      ? <Loader2 size={12} className="animate-spin" />
                      : <><UserPlus size={12} /> Add</>
                    }
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {open && results.length === 0 && query.length >= 2 && !loading && (
        <div className="absolute z-50 mt-1 w-full bg-white rounded-xl border border-slate-200 shadow-lg px-4 py-3">
          <p className="text-sm text-slate-400">No users found for &ldquo;{query}&rdquo;</p>
        </div>
      )}
    </div>
  );
}
