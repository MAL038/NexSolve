import { createClient } from "@/lib/supabaseServer";
import { requireAuth } from "@/lib/auth";
import { notFound } from "next/navigation";
import type { Project, Subprocess, ThemeWithChildren, Customer } from "@/types";
import ProjectDetailClient from "./ProjectDetailClient";

interface Props { params: Promise<{ id: string }> }

export default async function ProjectDetailPage({ params }: Props) {
  const { id }  = await params;
  const session = await requireAuth();
  const supabase = await createClient();

  const [
    { data, error },
    { data: subprocesses },
    { data: hierarchyRaw },
    { data: customersRaw },
  ] = await Promise.all([
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
      .select(`id, name, processes(id, name, process_types(id, name))`),

    supabase
      .from("customers")
      .select("id, name, status, code")
      .order("name"),
  ]);

  if (error || !data) notFound();

  const project   = data as Project;
  const subs      = (subprocesses as Subprocess[]) ?? [];
  const hierarchy = (hierarchyRaw as ThemeWithChildren[]) ?? [];
  const customers = (customersRaw as Customer[]) ?? [];

  const isOwner         = session.user.id === project.owner_id;
  const isMember        = project.project_members?.some(m => m.user_id === session.user.id) ?? false;
  const isOwnerOrMember = isOwner || isMember;

  // Resolve theme labels server-side voor initial render
  const themeObj   = hierarchy.find(t => t.id === project.theme_id);
  const processObj = themeObj?.processes?.find(p => p.id === project.process_id);
  const ptObj      = processObj?.process_types?.find(pt => pt.id === project.process_type_id);

  return (
    <ProjectDetailClient
      project={project}
      subprocesses={subs}
      hierarchy={hierarchy}
      customers={customers}
      isOwnerOrMember={isOwnerOrMember}
      currentUserId={session.user.id}
      themeLabel={themeObj?.name ?? null}
      processLabel={processObj?.name ?? null}
      ptLabel={ptObj?.name ?? null}
    />
  );
}
