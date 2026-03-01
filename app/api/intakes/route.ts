// app/api/intakes/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'
import { logActivity } from '@/lib/activityLogger'

// GET /api/intakes?project_id=xxx
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const projectId = new URL(req.url).searchParams.get('project_id')
  if (!projectId) return NextResponse.json({ error: 'project_id vereist' }, { status: 400 })

  const { data, error } = await supabase
    .from('project_intakes')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/intakes — genereer nieuwe intake voor een project
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { project_id, selected_section_ids } = body

  if (!project_id) return NextResponse.json({ error: 'project_id vereist' }, { status: 400 })

  // Haal project op om thema te bepalen
  const { data: project, error: projectErr } = await supabase
    .from('projects')
    .select('id, name, code, theme_id, customer_id, start_date, end_date, customer:customers!projects_customer_id_fkey(id, name, contact_name, contact_email)')
    .eq('id', project_id)
    .single()

  if (projectErr || !project) return NextResponse.json({ error: 'Project niet gevonden' }, { status: 404 })

  // Haal generieke template op
  const { data: genericTemplate } = await supabase
    .from('intake_templates')
    .select('*')
    .is('theme_id', null)
    .eq('is_active', true)
    .order('position')
    .limit(1)
    .single()

  // Haal thema-specifieke template op (als project een thema heeft)
  let themeTemplate: any = null
  if (project.theme_id) {
    const { data } = await supabase
      .from('intake_templates')
      .select('*')
      .eq('theme_id', project.theme_id)
      .eq('is_active', true)
      .order('position')
      .limit(1)
      .single()
    themeTemplate = data
  }

  // Bouw de snapshot: generieke secties + thema-secties, gefilterd op selectie
  const allSections: any[] = [
    ...(genericTemplate?.sections ?? []),
    ...(themeTemplate?.sections ?? []),
  ]

  const sections = selected_section_ids && selected_section_ids.length > 0
    ? allSections.filter((s: any) => selected_section_ids.includes(s.id))
    : allSections

  const templateSnapshot = {
    project: {
      id:         project.id,
      name:       project.name,
      code:       project.code,
      start_date: project.start_date,
      end_date:   project.end_date,
      customer:   project.customer,
    },
    templates: [
      genericTemplate ? { id: genericTemplate.id, name: genericTemplate.name } : null,
      themeTemplate   ? { id: themeTemplate.id,   name: themeTemplate.name   } : null,
    ].filter(Boolean),
    sections,
    generated_at: new Date().toISOString(),
  }

  const { data: intake, error: intakeErr } = await supabase
    .from('project_intakes')
    .insert({
      project_id,
      template_snapshot: templateSnapshot,
      status: 'draft',
      created_by: user.id,
    })
    .select('*')
    .single()

  if (intakeErr) return NextResponse.json({ error: intakeErr.message }, { status: 500 })

  await logActivity(supabase, {
    actorId:    user.id,
    action:     'intake.created',
    entityType: 'project',
    entityId:   project.id,
    entityName: project.name,
    projectId:  project.id,
    customerId: project.customer_id,
  })

  return NextResponse.json(intake, { status: 201 })
}
