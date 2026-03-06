/**
 * GET /api/admin/activity
 * Volledige activiteitenlog — alle gebruikers, geen RLS filter.
 * Gebruikt service role key.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireSuperuser } from "@/lib/api";
import { createClient as createAdminClient } from '@supabase/supabase-js'

function serviceClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET(req: NextRequest) {
  const auth = await requireSuperuser()
  if (!auth.ok) return auth.res

  const { searchParams } = req.nextUrl
  const actorId = searchParams.get('actor_id')
  const action = searchParams.get('action')
  const cursor = searchParams.get('cursor')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '30'), 100)

  const db = serviceClient()

  let query = db
    .from('activity_log')
    .select('*, actor:profiles!activity_log_actor_id_fkey(id, full_name, avatar_url)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (actorId) query = query.eq('actor_id', actorId)
  if (action) query = query.eq('action', action)
  if (cursor) query = query.lt('created_at', cursor)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data: data ?? [],
    nextCursor: (data?.length ?? 0) === limit
      ? data![data!.length - 1].created_at
      : null,
  })
}
