/**
 * GET /api/search?q=...&limit=5
 *
 * Doorzoekt parallel: projecten, klanten, dossiers, teamleden
 * Elke categorie geeft max `limit` resultaten (default 5).
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireApiContext } from '@/lib/api'
export async function GET(req: NextRequest) {
  const auth = await requireApiContext();
  if (!auth.ok) return auth.res;
  const { supabase, user } = auth.ctx;
  const { searchParams } = req.nextUrl
  const q     = searchParams.get('q')?.trim() ?? ''
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '5'), 10)

  if (q.length < 2) return NextResponse.json({ projects: [], customers: [], dossiers: [], members: [] })

  const pattern = `%${q}%`

  // Parallel ophalen — elk falen individueel afvangen
  const [projectsRes, customersRes, dossiersRes, membersRes] = await Promise.allSettled([
    supabase
      .from('projects')
      .select('id, name, status, customer:customers(name)')
      .ilike('name', pattern)
      .order('name')
      .limit(limit),

    supabase
      .from('customers')
      .select('id, name, code, status, email')
      .ilike('name', pattern)
      .order('name')
      .limit(limit),

    supabase
      .from('dossiers_with_details')
      .select('id, title, type, project_name, customer_name, submitted_at')
      .ilike('title', pattern)
      .order('submitted_at', { ascending: false })
      .limit(limit),

    supabase
      .from('profiles')
      .select('id, full_name, email, role, avatar_url')
      .or(`full_name.ilike.${pattern},email.ilike.${pattern}`)
      .order('full_name')
      .limit(limit),
  ])

  return NextResponse.json({
    projects:  projectsRes.status  === 'fulfilled' ? (projectsRes.value.data  ?? []) : [],
    customers: customersRes.status === 'fulfilled' ? (customersRes.value.data ?? []) : [],
    dossiers:  dossiersRes.status  === 'fulfilled' ? (dossiersRes.value.data  ?? []) : [],
    members:   membersRes.status   === 'fulfilled' ? (membersRes.value.data   ?? []) : [],
  })
}
