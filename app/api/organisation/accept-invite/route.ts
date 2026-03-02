// app/api/auth/accept-invite/route.ts
// Wordt aangeroepen door de accept-invite pagina nadat Supabase
// de sessie heeft gezet. Koppelt de nieuwe gebruiker aan de org.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Niet ingelogd' }, { status: 401 })

  const { org_id, org_role } = await req.json()
  if (!org_id) return NextResponse.json({ error: 'org_id verplicht' }, { status: 400 })

  const admin = adminClient()

  // Controleer of de org bestaat
  const { data: org } = await admin
    .from('organisations')
    .select('id, name')
    .eq('id', org_id)
    .single()

  if (!org) return NextResponse.json({ error: 'Organisatie niet gevonden' }, { status: 404 })

  // Voeg toe aan organisation_members (of update als al lid)
  const { error: memberErr } = await admin
    .from('organisation_members')
    .upsert({
      org_id,
      user_id: user.id,
      role:    'member',
    }, { onConflict: 'org_id,user_id' })

  if (memberErr) return NextResponse.json({ error: memberErr.message }, { status: 500 })

  // Stel current_org_id in op profiel
  const { error: profileErr } = await admin
    .from('profiles')
    .update({ current_org_id: org_id })
    .eq('id', user.id)

  if (profileErr) return NextResponse.json({ error: profileErr.message }, { status: 500 })

  // Standaard modules activeren als ze nog niet bestaan
  const modules = ['projects', 'customers', 'intake', 'calendar']
  for (const module of modules) {
    await admin
      .from('organisation_modules')
      .upsert({ org_id, module, is_enabled: true }, { onConflict: 'org_id,module' })
  }

  return NextResponse.json({ success: true, org_name: org.name })
}
