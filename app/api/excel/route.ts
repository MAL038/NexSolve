/**
 * GET /api/export/excel
 *
 * Genereert een Excel-bestand met meerdere tabbladen:
 *   - Projecten
 *   - Klanten
 *   - Urenregistratie (optioneel, via ?include_hours=true)
 *
 * Geeft JSON terug — de client bouwt het .xlsx bestand via SheetJS.
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireApiContext } from "@/lib/apiContext";
export async function GET(req: NextRequest) {
    const ctx = await requireApiContext();
  if (!ctx.ok) return ctx.res;
  const { supabase, user, orgId: ctxOrgId, orgRole, isSuperuser } = ctx;
  const { searchParams } = req.nextUrl
  const includeHours = searchParams.get('include_hours') === 'true'
  const fromDate     = searchParams.get('from')  // YYYY-MM-DD
  const toDate       = searchParams.get('to')    // YYYY-MM-DD

  // ── Parallel ophalen ──────────────────────────────────────
  // Supabase query builders zijn PromiseLike maar geen exacte Promise —
  // .then(r => r) wrapping zorgt dat Promise.allSettled correct typeert.
  let hoursQuery = supabase
    .from('project_planning')
    .select(`
      id, date, hours, notes,
      project:projects(name),
      user:profiles!project_planning_user_id_fkey(full_name, email)
    `)
    .order('date', { ascending: false })

  if (fromDate) hoursQuery = hoursQuery.gte('date', fromDate)
  if (toDate)   hoursQuery = hoursQuery.lte('date', toDate)

  const [projectsRes, customersRes, hoursRes] = await Promise.allSettled([
    supabase
      .from('projects')
      .select(`
        id, name, description, status, created_at, updated_at,
        start_date, end_date,
        customer:customers(name),
        owner:profiles!projects_owner_id_fkey(full_name, email),
        theme:themes(name),
        process:processes(name),
        subprocesses(id, status)
      `)
      .order('created_at', { ascending: false })
      .then(r => r),

    supabase
      .from('customers')
      .select('*')
      .eq('owner_id', user.id)
      .order('code', { ascending: true, nullsFirst: false })
      .then(r => r),

    includeHours
      ? hoursQuery.then(r => r)
      : Promise.resolve({ data: [] as any[], error: null }),
  ])

  const projectsData  = projectsRes.status  === 'fulfilled' ? (projectsRes.value.data  ?? []) : []
  const customersData = customersRes.status === 'fulfilled' ? (customersRes.value.data ?? []) : []
  const hoursData     = includeHours && hoursRes.status === 'fulfilled'
    ? (hoursRes.value.data ?? [])
    : []

  // ── Projecten mappen naar flat rows ──────────────────────
  const STATUS_NL: Record<string, string> = {
    active:       'Actief',
    'in-progress':'In uitvoering',
    archived:     'Gearchiveerd',
  }

  const projects = projectsData.map((p: any) => {
    const sps   = p.subprocesses ?? []
    const done  = sps.filter((s: any) => s.status === 'done').length
    const total = sps.length
    return {
      Naam:           p.name,
      Status:         STATUS_NL[p.status] ?? p.status,
      Klant:          p.customer?.name    ?? '',
      Eigenaar:       p.owner?.full_name  ?? '',
      Thema:          p.theme?.name       ?? '',
      Module:         p.process?.name     ?? '',
      Startdatum:     p.start_date        ?? '',
      Einddatum:      p.end_date          ?? '',
      'Taken gereed': total > 0 ? `${done}/${total}` : '',
      Omschrijving:   p.description       ?? '',
      Aangemaakt:     new Date(p.created_at).toLocaleDateString('nl-NL'),
      Bijgewerkt:     new Date(p.updated_at).toLocaleDateString('nl-NL'),
    }
  })

  // ── Klanten mappen ────────────────────────────────────────
  const CSTATUS_NL: Record<string, string> = { active: 'Actief', inactive: 'Inactief' }

  const customers = customersData.map((c: any) => ({
    Code:                c.code              ?? '',
    Naam:                c.name,
    Status:              CSTATUS_NL[c.status] ?? c.status,
    'E-mail':            c.email             ?? '',
    Telefoon:            c.phone             ?? '',
    Website:             c.website           ?? '',
    Straat:              c.address_street    ?? '',
    Postcode:            c.address_zip       ?? '',
    Plaats:              c.address_city      ?? '',
    Land:                c.address_country   ?? '',
    Contactpersoon:      c.contact_name      ?? '',
    'Rol contactpersoon':c.contact_role      ?? '',
    'E-mail contact':    c.contact_email     ?? '',
    'Tel. contact':      c.contact_phone     ?? '',
    'Klant sinds':       new Date(c.created_at).toLocaleDateString('nl-NL'),
  }))

  // ── Uren mappen ───────────────────────────────────────────
  const hours = hoursData.map((h: any) => ({
    Datum:     h.date,
    Uren:      Number(h.hours),
    Project:   h.project?.name       ?? '',
    Medewerker:h.user?.full_name      ?? '',
    Notitie:   h.notes                ?? '',
  }))

  return NextResponse.json({
    exported_at:    new Date().toISOString(),
    include_hours:  includeHours,
    date_range:     fromDate && toDate ? `${fromDate} t/m ${toDate}` : null,
    sheets: {
      projects,
      customers,
      ...(includeHours ? { hours } : {}),
    },
    totals: {
      projects:  projects.length,
      customers: customers.length,
      hours:     hours.length,
      total_hours: hours.reduce((s: number, h: any) => s + h.Uren, 0),
    },
  })
}
