// app/api/intakes/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'
import { sendEmail } from '@/lib/email'

// GET /api/intakes/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('project_intakes')
    .select('*')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

// PATCH /api/intakes/[id] — status bijwerken of e-mail versturen
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action, email_to, sender_name } = body

  const { data: intake, error: fetchErr } = await supabase
    .from('project_intakes')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchErr || !intake) return NextResponse.json({ error: 'Intake niet gevonden' }, { status: 404 })

  if (action === 'send_email') {
    if (!email_to) return NextResponse.json({ error: 'email_to vereist' }, { status: 400 })

    const snapshot = intake.template_snapshot as any
    const projectName = snapshot?.project?.name ?? 'Project'
    const projectCode = snapshot?.project?.code

    // Stuur e-mail via bestaande Resend infrastructuur
    await sendEmail({
      type:        'intake_request',
      to:          email_to,
      projectName: projectName,
      projectCode: projectCode ?? undefined,
      senderName:  sender_name ?? 'Het NexSolve team',
      intakeId:    id,
    } as any)

    const { data: updated, error: updateErr } = await supabase
      .from('project_intakes')
      .update({ status: 'sent', sent_to: email_to, sent_at: new Date().toISOString() })
      .eq('id', id)
      .select('*')
      .single()

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
    return NextResponse.json(updated)
  }

  if (action === 'mark_received') {
    const { data: updated, error: updateErr } = await supabase
      .from('project_intakes')
      .update({ status: 'received' })
      .eq('id', id)
      .select('*')
      .single()

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
    return NextResponse.json(updated)
  }

  if (action === 'mark_draft') {
    const { data: updated, error: updateErr } = await supabase
      .from('project_intakes')
      .update({ status: 'draft' })
      .eq('id', id)
      .select('*')
      .single()

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
    return NextResponse.json(updated)
  }

  return NextResponse.json({ error: 'Onbekende actie' }, { status: 400 })
}

// DELETE /api/intakes/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('project_intakes')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
