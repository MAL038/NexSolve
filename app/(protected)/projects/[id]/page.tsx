import { createClient } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/auth";
import { notFound } from "next/navigation";
import { formatDate, relativeTime } from "@/lib/time";
import StatusBadge from "@/components/ui/StatusBadge";
import Avatar from "@/components/ui/Avatar";
import MembersPanel from "@/components/ui/MembersPanel";
import SubprocessesPanel from "@/components/ui/SubprocessesPanel";
import Link from "next/link";
import { ArrowLeft, Calendar, Building2, Users, GitBranch, Layers, ChevronRight } from "lucide-react";
import PdfExportButton from "@/components/ui/PdfExportButton";
import type { Project, Subprocess, ThemeWithChildren } from "@/types";
import { DossierList } from '@/components/dossiers/DossierList'

interface Props { params: Promise<{ id: string }> }

export default async function ProjectDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await requireAuth();
  const supabase = await createClient();

  const [{ data, error }, { data: subprocesses }, { data: hierarchyRaw }] = await Promise.all([
    supabase
      .from("projects")
      .select(`
        *,
        customer:customers(id, name),
        owner:profiles!projects_owner_id_fkey(full_name, email, avatar_url),
        project_members(
          user_id, role, added_at,
          profile:profiles(full_name, email, avatar_url)
        )
      `)
      .eq("id", id)
      .single(),
    supabase
      .from("subprocesses")
      .select("*")
      .eq("project_id", id)
      .order("position", { ascending: true }),
    supabase
      .from("themes")
      .select(`id, name, processes(id, name, process_types(id, name))`)
  ]);

  if (error || !data) notFound();
  const project = data as Project;
  const subs    = (subprocesses as Subprocess[]) ?? [];
  const hierarchy = (hierarchyRaw as ThemeWithChildren[]) ?? [];

  const isOwner         = session.user.id === project.owner_id;
  const isMember        = project.project_members?.some(m => m.user_id === session.user.id) ?? false;
  const isOwnerOrMember = isOwner || isMember;
  const doneSubs        = subs.filter(s => s.status === "done").length;

  // Resolve theme labels from hierarchy
  const themeObj   = hierarchy.find(t => t.id === project.theme_id);
  const processObj = themeObj?.processes?.find(p => p.id === project.process_id);
  const ptObj      = processObj?.process_types?.find(pt => pt.id === project.process_type_id);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/projects" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-brand-600 font-medium transition-colors">
        <ArrowLeft size={16} /> Terug naar projecten
      </Link>

      {/* Main info card */}
      <div className="card p-8 space-y-6">
        <div className="flex items-start gap-4">
          <div className="flex-1 space-y-2">
            <h1 className="text-2xl font-bold text-slate-800">{project.name}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge status={project.status} />
              {project.customer && (
                <Link href={`/customers/${(project.customer as any).id}`}
                  className="badge bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors gap-1">
                  <Building2 size={11} /> {(project.customer as any).name}
                </Link>
              )}
              {subs.length > 0 && (
                <span className="badge bg-slate-100 text-slate-500 gap-1">
                  <GitBranch size={11} />
                  {doneSubs}/{subs.length} deeltaken
                </span>
              )}
            </div>
          </div>
          <PdfExportButton scope={`project:${project.id}`} label="Exporteer" />
        </div>

        {/* Theme breadcrumb */}
        {themeObj && (
          <div className="flex items-center gap-1.5 flex-wrap px-3 py-2.5 bg-violet-50 rounded-xl border border-violet-100">
            <Layers size={13} className="text-violet-500 flex-shrink-0" />
            <span className="text-xs font-medium text-violet-700">{themeObj.name}</span>
            {processObj && (
              <>
                <ChevronRight size={11} className="text-violet-300" />
                <span className="text-xs font-medium text-violet-700">{processObj.name}</span>
              </>
            )}
            {ptObj && (
              <>
                <ChevronRight size={11} className="text-violet-300" />
                <span className="text-xs font-semibold text-violet-800">{ptObj.name}</span>
              </>
            )}
          </div>
        )}

        {project.description && (
          <p className="text-slate-600 leading-relaxed border-t border-slate-50 pt-5">
            {project.description}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm border-t border-slate-50 pt-5">
          <div className="flex items-center gap-2 text-slate-500">
            <Calendar size={15} className="text-brand-400" />
            Aangemaakt {formatDate(project.created_at)}
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <Calendar size={15} className="text-brand-400" />
            Bijgewerkt {relativeTime(project.updated_at)}
          </div>
          {project.owner && (
            <div className="flex items-center gap-2 col-span-2">
              <Avatar name={(project.owner as any).full_name} url={(project.owner as any).avatar_url} size="sm" />
              <span className="text-slate-600 font-medium">{(project.owner as any).full_name}</span>
              <span className="text-slate-400">· Eigenaar</span>
            </div>
          )}
        </div>
      </div>

      {/* Subprocesses card */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <GitBranch size={16} className="text-brand-500" />
            <h2 className="font-semibold text-slate-700">
              Deeltaken
              {subs.length > 0 && (
                <span className="ml-2 text-xs font-normal text-slate-400">({doneSubs}/{subs.length} gereed)</span>
              )}
            </h2>
          </div>
        </div>
        <SubprocessesPanel
          projectId={project.id}
          initialSubprocesses={subs}
          isOwnerOrMember={isOwnerOrMember}
        />
      </div>

      {/* Members card */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users size={16} className="text-brand-500" />
          <h2 className="font-semibold text-slate-700">
            Teamleden ({(project.project_members?.length ?? 0) + 1})
          </h2>
        </div>
        <MembersPanel
          projectId={project.id}
          ownerId={project.owner_id}
          currentUserId={session.user.id}
          owner={project.owner as any}
          initialMembers={project.project_members ?? []}
        />
        
      </div>
      {/* Dossiers card */}
      <div className="card p-6">
        <DossierList projectId={id} />
      </div>
    </div>
  );
}

