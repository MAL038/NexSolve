/**
 * GET /api/admin/stats
 * Platform-brede statistieken voor het superuser dashboard.
 * Gebruikt service role key — bypassed RLS volledig.
 */
import { NextResponse } from 'next/server'
import { requireSuperuser } from "@/lib/api";
import { createClient } from '@/lib/supabaseServer'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function serviceClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function GET() {
  const ok = await requireSuperuser()
  if (!ok) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })

  const db = serviceClient()

  const now        = new Date()
  const thirtyDaysAgo = new Date(now); thirtyDaysAgo.setDate(now.getDate() - 30)
  const sevenDaysAgo  = new Date(now); sevenDaysAgo.setDate(now.getDate() - 7)
  const startOfMonth  = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    { count: totalUsers },
    { count: activeUsers },
    { count: blockedUsers },
    { count: newUsersThisMonth },
    { count: totalProjects },
    { count: activeProjects },
    { count: archivedProjects },
    { data: staleProjectsData },
    { data: hoursThisMonth },
    { data: recentSignups },
    { data: topUsers },
  ] = await Promise.all([
    db.from('profiles').select('*', { count: 'exact', head: true }),
    db.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', true),
    db.from('profiles').select('*', { count: 'exact', head: true }).eq('is_active', false),
    db.from('profiles').select('*', { count: 'exact', head: true })
      .gte('created_at', startOfMonth.toISOString()),

    db.from('projects').select('*', { count: 'exact', head: true }),
    db.from('projects').select('*', { count: 'exact', head: true })
      .in('status', ['active', 'in-progress']),
    db.from('projects').select('*', { count: 'exact', head: true })
      .eq('status', 'archived'),

    // Projecten die 30+ dagen niet bijgewerkt zijn en niet gearchiveerd
    db.from('projects')
      .select('id, name, status, updated_at, owner:profiles!projects_owner_id_fkey(full_name)')
      .lt('updated_at', thirtyDaysAgo.toISOString())
      .neq('status', 'archived')
      .order('updated_at', { ascending: true })
      .limit(5),

    // Uren deze maand
    db.from('project_planning')
      .select('hours')
      .gte('date', startOfMonth.toISOString().split('T')[0]),

    // Recente registraties (7 dagen)
    db.from('profiles')
      .select('id, full_name, email, role, created_at')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(5),

    // Gebruikers met meeste activiteit
    db.from('activity_log')
      .select('actor_id, actor:profiles!activity_log_actor_id_fkey(full_name, avatar_url)')
      .gte('created_at', startOfMonth.toISOString())
      .limit(200),
  ])

  const totalHoursMonth = (hoursThisMonth ?? [])
    .reduce((s: number, h: any) => s + Number(h.hours), 0)

  // Activiteit per gebruiker tellen
  const activityCount: Record<string, { name: string; avatar: string | null; count: number }> = {}
  ;(topUsers ?? []).forEach((row: any) => {
    const id = row.actor_id
    if (!activityCount[id]) {
      activityCount[id] = {
        name:   row.actor?.full_name ?? 'Onbekend',
        avatar: row.actor?.avatar_url ?? null,
        count:  0,
      }
    }
    activityCount[id].count++
  })
  const mostActive = Object.values(activityCount)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return NextResponse.json({
    users: {
      total:        totalUsers ?? 0,
      active:       activeUsers ?? 0,
      blocked:      blockedUsers ?? 0,
      newThisMonth: newUsersThisMonth ?? 0,
      recentSignups: recentSignups ?? [],
    },
    projects: {
      total:    totalProjects ?? 0,
      active:   activeProjects ?? 0,
      archived: archivedProjects ?? 0,
      stale:    staleProjectsData ?? [],
    },
    hours: {
      thisMonth: Math.round(totalHoursMonth * 10) / 10,
    },
    activity: {
      mostActive,
    },
    generated_at: now.toISOString(),
  })
}
