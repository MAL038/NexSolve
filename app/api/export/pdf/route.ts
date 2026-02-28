/**
 * GET /api/export/pdf
 *
 * Query params:
 *   scope           = "all" | "projects" | "customers" | "hours"
 *   from            = YYYY-MM-DD (optioneel)
 *   to              = YYYY-MM-DD (optioneel)
 *   include_hours   = true|false
 *   project_id      = UUID (single project export)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const scope         = searchParams.get('scope')       ?? 'all'
  const fromDate      = searchParams.get('from')
  const toDate        = searchParams.get('to')
  const includeHours  = searchParams.get('include_hours') === 'true'
  const projectId     = searchParams.get('project_id')

  const includeProjects  = scope === 'all' || scope === 'projects'
  const includeCustomers = scope === 'all' || scope === 'customers'

  // Supabase builders zijn PromiseLike — .then(r => r) maakt ze tot echte Promises
  let projectQuery = supabase
    .from('projects')
    .select(`
      id, name, description, status, created_at, updated_at, start_date, end_date,
      customer:customers(name),
      owner:profiles!projects_owner_id_fkey(full_name, email),
      theme:themes(name),
      process:processes(name),
      subprocesses(id, title, status),
      project_members(user_id, role, profile:profiles(full_name))
    `)
    .order('created_at', { ascending: false })

  if (projectId) projectQuery = projectQuery.eq('id', projectId)
  if (fromDate)  projectQuery = projectQuery.gte('updated_at', `${fromDate}T00:00:00Z`)
  if (toDate)    projectQuery = projectQuery.lte('updated_at', `${toDate}T23:59:59Z`)

  let hoursQuery = supabase
    .from('project_planning')
    .select(`
      id, date, hours, notes,
      project:projects(name),
      user:profiles!project_planning_user_id_fkey(full_name)
    `)
    .order('date', { ascending: false })
    .limit(200)

  if (fromDate) hoursQuery = hoursQuery.gte('date', fromDate)
  if (toDate)   hoursQuery = hoursQuery.lte('date', toDate)

  const [projectsRes, customersRes, hoursRes] = await Promise.allSettled([
    (includeProjects || projectId)
      ? projectQuery.then(r => r)
      : Promise.resolve({ data: [] as any[], error: null }),

    includeCustomers
      ? supabase.from('customers').select('*').eq('owner_id', user.id).order('name').then(r => r)
      : Promise.resolve({ data: [] as any[], error: null }),

    includeHours
      ? hoursQuery.then(r => r)
      : Promise.resolve({ data: [] as any[], error: null }),
  ])

  const projects  = projectsRes.status  === 'fulfilled' ? (projectsRes.value.data  ?? []) : []
  const customers = customersRes.status === 'fulfilled' ? (customersRes.value.data ?? []) : []
  const hours     = hoursRes.status     === 'fulfilled' ? (hoursRes.value.data     ?? []) : []

  return NextResponse.json({
    exported_at:    new Date().toISOString(),
    scope,
    from_date:      fromDate ?? null,
    to_date:        toDate   ?? null,
    include_hours:  includeHours,
    projects,
    customers,
    hours,
    totals: {
      projects:    projects.length,
      customers:   customers.length,
      total_hours: hours.reduce((s: number, h: any) => s + Number(h.hours), 0),
    },
  })
}
