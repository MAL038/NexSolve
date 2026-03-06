import { NextRequest, NextResponse } from "next/server";
import { requireApiContext } from "@/lib/api";
import { logActivity } from "@/lib/activityLogger";
import { sendEmail } from "@/lib/email";
import { z } from "zod";

const addMemberSchema = z.object({
  user_id: z.string().uuid("Invalid user ID"),
  role:    z.enum(["member", "lead"]).default("member"),
});

export async function GET(_: NextRequest, { params }: { params: Promise<Record<string, string>> }) {
  const { id } = await params;
  const auth = await requireApiContext();
  if (!auth.ok) return auth.res;
  const { supabase, user } = auth.ctx;
  const { data, error } = await supabase
    .from("project_members")
    .select("*, profile:profiles(full_name, email, avatar_url)")
    .eq("project_id", id)
    .order("added_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest, { params }: { params: Promise<Record<string, string>> }) {
  const { id } = await params;
  const auth = await requireApiContext();
  if (!auth.ok) return auth.res;
  const { supabase, user } = auth.ctx;

  const { data: project } = await supabase
    .from("projects").select("owner_id, name, customer_id").eq("id", id).single();

  if (!project) return NextResponse.json({ error: "Project niet gevonden" }, { status: 404 });
  if (project.owner_id !== user.id)
    return NextResponse.json({ error: "Only the project owner can add members" }, { status: 403 });

  const body = await req.json();
  const result = addMemberSchema.safeParse(body);
  if (!result.success)
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 });

  if (result.data.user_id === user.id)
    return NextResponse.json({ error: "Eigenaar is al lid van dit project" }, { status: 409 });

  const { data, error } = await supabase
    .from("project_members")
    .insert({ project_id: id, ...result.data })
    .select("*, profile:profiles(full_name, email, avatar_url)")
    .single();

  if (error) {
    if (error.code === "23505")
      return NextResponse.json({ error: "User is already a member" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 🔔 Log
  await logActivity(supabase, {
    actorId:    user.id,
    action:     'member.added',
    entityType: 'member',
    entityId:   result.data.user_id,
    entityName: (data.profile as any)?.full_name,
    projectId:  id,
    customerId: project.customer_id,
    metadata:   { project_name: project.name, role: result.data.role },
  });

  // 📧 Uitnodigingse-mail (fire-and-forget)
  const profile = data.profile as any;
  if (profile?.email) {
    const { data: inviter } = await supabase
      .from('profiles').select('full_name').eq('id', user.id).single();
    sendEmail({
      type:          'project_invite',
      to:            profile.email,
      recipientName: profile.full_name ?? 'daar',
      inviterName:   inviter?.full_name ?? 'Een collega',
      projectName:   project.name,
      projectUrl:    `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.nexsolve.nl'}/projects/${id}`,
      role:          result.data.role === 'lead' ? 'Projectleider' : 'Lid',
    }).catch(() => {}); // nooit blocking
  }

  return NextResponse.json(data, { status: 201 });
}
