/**
 * GET /api/activity
 *
 * Query params:
 *   project_id   – filter op project
 *   customer_id  – filter op klant
 *   actor_id     – filter op gebruiker
 *   org_id       – filter op organisatie (voor /beheer)
 *   limit        – max resultaten (default 20, max 50)
 *   cursor       – created_at voor paginering
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const projectId  = searchParams.get('project_id')
  const customerId = searchParams.get('customer_id')
  const actorId    = searchParams.get('actor_id')
  const orgId      = searchParams.get('org_id')
  const cursor     = searchParams.get('cursor')
  const limit      = Math.min(parseInt(searchParams.get('limit') ?? '20'), 50)

  let query = supabase
    .from('activity_log')
    .select(`
      *,
      actor:profiles!activity_log_actor_id_fkey(id, full_name, avatar_url)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (projectId)  query = query.eq('project_id', projectId)
  if (customerId) query = query.eq('customer_id', customerId)
  if (actorId)    query = query.eq('actor_id', actorId)
  if (orgId)      query = query.eq('org_id', orgId)
  if (cursor)     query = query.lt('created_at', cursor)

  const { data, error } = await query

  if (error) {
    console.error('[GET /api/activity]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data: data ?? [],
    nextCursor: (data?.length ?? 0) === limit
      ? data![data!.length - 1].created_at
      : null,
  })
}
