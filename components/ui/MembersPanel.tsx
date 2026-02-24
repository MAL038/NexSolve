"use client";

import { useState } from "react";
import { Crown, Trash2, Shield, User } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import MemberSearch from "@/components/ui/MemberSearch";
import type { ProjectMember, Profile } from "@/types";

interface Props {
  projectId: string;
  ownerId: string;
  currentUserId: string;
  owner: Pick<Profile, "full_name" | "email" | "avatar_url"> | undefined;
  initialMembers: ProjectMember[];
}

const ROLE_ICON = { admin: Shield, member: User };

export default function MembersPanel({ projectId, ownerId, currentUserId, owner, initialMembers }: Props) {
  const [members, setMembers] = useState<ProjectMember[]>(initialMembers);
  const [removing, setRemoving] = useState<string | null>(null);
  const isOwner = currentUserId === ownerId;

  async function removeMember(userId: string) {
    setRemoving(userId);
    await fetch(`/api/projects/${projectId}/members/${userId}`, { method: "DELETE" });
    setMembers(prev => prev.filter(m => m.user_id !== userId));
    setRemoving(null);
  }

  async function changeRole(userId: string, newRole: "member" | "admin") {
    await fetch(`/api/projects/${projectId}/members/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role: newRole } : m));
  }

  return (
    <div className="space-y-4">
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
        const RoleIcon = ROLE_ICON[m.role];
        return (
          <div key={m.user_id} className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
            <Avatar name={m.profile?.full_name} url={m.profile?.avatar_url} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{m.profile?.full_name}</p>
              <p className="text-xs text-slate-400 truncate">{m.profile?.email}</p>
            </div>

            {isOwner ? (
              <>
                <select
                  value={m.role}
                  onChange={e => changeRole(m.user_id, e.target.value as "member" | "admin")}
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="member">Teamlid</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  onClick={() => removeMember(m.user_id)}
                  disabled={removing === m.user_id}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </>
            ) : (
              <span className="badge bg-slate-100 text-slate-500 gap-1">
                <RoleIcon size={11} /> {m.role}
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
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Teamlid toevoegen</p>
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
