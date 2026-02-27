import { createClient } from '@/lib/supabaseServer'
import { NextRequest, NextResponse } from 'next/server'

const PAGE_SIZE = 25

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  
  // Auth check
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = req.nextUrl
  const projectId = searchParams.get('project_id')
  const customerId = searchParams.get('customer_id')
  const cursor = searchParams.get('cursor')  // submitted_at voor pagination

  // Minimaal één filter vereist
  if (!projectId && !customerId) {
    return NextResponse.json(
      { error: 'project_id of customer_id is verplicht' },
      { status: 400 }
    )
  }

  let query = supabase
    .from('dossiers_with_details')
    .select('*')
    .order('submitted_at', { ascending: false })
    .limit(PAGE_SIZE)

  if (projectId) query = query.eq('project_id', projectId)
  if (customerId) query = query.eq('customer_id', customerId)
  
  // Cursor-based pagination
  if (cursor) query = query.lt('submitted_at', cursor)

  const { data, error } = await query

  if (error) {
    console.error('[GET /api/dossiers]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data,
    nextCursor: data.length === PAGE_SIZE 
      ? data[data.length - 1].submitted_at 
      : null,
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const { title, type, description, project_id, customer_id, file_url, file_name, file_size } = body

  // Validatie
  if (!title?.trim()) {
    return NextResponse.json({ error: 'Titel is verplicht' }, { status: 400 })
  }
  if (!project_id && !customer_id) {
    return NextResponse.json(
      { error: 'project_id of customer_id is verplicht' },
      { status: 400 }
    )
  }

  // submitted_by server-side zetten — nooit vertrouwen op client
  const { data, error } = await supabase
    .from('dossiers')
    .insert({
      title: title.trim(),
      type: type ?? 'document',
      description: description?.trim() ?? null,
      project_id: project_id ?? null,
      customer_id: customer_id ?? null,
      file_url: file_url ?? null,
      file_name: file_name ?? null,
      file_size: file_size ?? null,
      submitted_by: user.id,  // ← server-side, altijd
    })
    .select('*, profiles(display_name, avatar_url)')
    .single()

  if (error) {
    console.error('[POST /api/dossiers]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data }, { status: 201 })
}