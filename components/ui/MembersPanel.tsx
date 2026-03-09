"use client";

import { useState } from "react";
import { Crown, Trash2, Shield, User, Loader2, X, AlertCircle, Check } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import MemberSearch from "@/components/ui/MemberSearch";
import type { ProjectMember, Profile, MemberRole } from "@/types";

interface Props {
  projectId:      string;
  ownerId:        string;
  currentUserId:  string;
  owner:          Pick<Profile, "full_name" | "email" | "avatar_url"> | undefined;
  initialMembers: ProjectMember[];
}

const ROLE_ICON: Record<MemberRole, React.ElementType> = {
  projectleider: Shield,
  member:        User,
};

const ROLE_LABEL: Record<MemberRole, string> = {
  projectleider: "Projectleider",
  member:        "Teamlid",
};

export default function MembersPanel({
  projectId,
  ownerId,
  currentUserId,
  owner,
  initialMembers,
}: Props) {
  const [members,      setMembers]      = useState<ProjectMember[]>(initialMembers);
  const [removing,     setRemoving]     = useState<string | null>(null);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [toast,        setToast]        = useState<{ msg: string; ok: boolean } | null>(null);
  const isOwner = currentUserId === ownerId;

  function showToast(msg: string, ok = true) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function removeMember(userId: string) {
    setRemoving(userId);
    const res = await fetch(`/api/projects/${projectId}/members/${userId}`, { method: "DELETE" });
    setRemoving(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast(data.error ?? "Verwijderen mislukt", false);
      return;
    }
    setMembers(prev => prev.filter(m => m.user_id !== userId));
    showToast("Teamlid verwijderd");
  }

  async function changeRole(userId: string, newRole: MemberRole) {
    setChangingRole(userId);
    const res = await fetch(`/api/projects/${projectId}/members/${userId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ role: newRole }),
    });
    setChangingRole(null);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      showToast(data.error ?? "Rolwijziging mislukt", false);
      return;
    }
    setMembers(prev =>
      prev.map(m => m.user_id === userId ? { ...m, role: newRole } : m)
    );
  }

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className={[
          "flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium",
          toast.ok
            ? "bg-brand-50 border-brand-200 text-brand-700"
            : "bg-red-50 border-red-200 text-red-700",
        ].join(" ")}>
          {toast.ok ? <Check size={14} /> : <AlertCircle size={14} />}
          <span className="flex-1">{toast.msg}</span>
          <button
            onClick={() => setToast(null)}
            aria-label="Melding sluiten"
          >
            <X size={14} className="opacity-60 hover:opacity-100" />
          </button>
        </div>
      )}

      {/* Owner row */}
      <div className="flex items-center gap-3 px-4 py-3 bg-brand-50 rounded-xl border border-brand-100">
        <Avatar name={owner?.full_name} url={owner?.avatar_url} size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">{owner?.full_name ?? "Eigenaar"}</p>
          <p className="text-xs text-slate-400 truncate">{owner?.email}</p>
        </div>
        <span className="badge bg-brand-500 text-white gap-1">
          <Crown size={11} /> Eigenaar
        </span>
      </div>

      {/* Members */}
      {members.map(m => {
        const RoleIcon  = ROLE_ICON[m.role] ?? User;
        const isRemoving  = removing     === m.user_id;
        const isChanging  = changingRole === m.user_id;
        const busy        = isRemoving || isChanging;

        return (
          <div
            key={m.user_id}
            className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
          >
            <Avatar name={m.profile?.full_name} url={m.profile?.avatar_url} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{m.profile?.full_name}</p>
              <p className="text-xs text-slate-400 truncate">{m.profile?.email}</p>
            </div>

            {isOwner ? (
              <>
                {/* Role selector with loading indicator */}
                <div className="relative">
                  <select
                    value={m.role}
                    onChange={e => changeRole(m.user_id, e.target.value as MemberRole)}
                    disabled={busy}
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1 pr-5 bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="member">Teamlid</option>
                    <option value="projectleider">Projectleider</option>
                  </select>
                  {isChanging && (
                    <Loader2
                      size={11}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 animate-spin text-brand-500 pointer-events-none"
                    />
                  )}
                </div>

                {/* Remove button */}
                <button
                  onClick={() => removeMember(m.user_id)}
                  disabled={busy}
                  aria-label={`${m.profile?.full_name ?? "teamlid"} verwijderen`}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRemoving
                    ? <Loader2 size={14} className="animate-spin" />
                    : <Trash2  size={14} />
                  }
                </button>
              </>
            ) : (
              <span className="badge bg-slate-100 text-slate-500 gap-1">
                <RoleIcon size={11} /> {ROLE_LABEL[m.role] ?? m.role}
              </span>
            )}
          </div>
        );
      })}

      {members.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-4">Nog geen teamleden.</p>
      )}

      {/* Teamlid toevoegen (alleen eigenaar) */}
      {isOwner && (
        <div className="pt-2 border-t border-slate-100">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Teamlid toevoegen
          </p>
          <MemberSearch
            projectId={projectId}
            existingMembers={members}
            onMemberAdded={m => setMembers(prev => [...prev, m])}
          />
        </div>
      )}
    </div>
  );
}
