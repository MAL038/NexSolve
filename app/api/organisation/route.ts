// app/api/organisation/route.ts
// Geeft de actieve organisatie-context terug voor de ingelogde user:
// naam, logo, kleuren, en welke modules actief zijn.
// Wordt gebruikt door de layout om de sidebar te configureren.

import { NextResponse } from 'next/server'
import { requireApiContext } from '@/lib/api'
export async function GET() {
  const auth = await requireApiContext();
  if (!auth.ok) return auth.res;
  const { supabase, user } = auth.ctx;
  // Haal profiel op met actieve org
  const { data: profile } = await supabase
    .from('profiles')
    .select('current_org_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.current_org_id) {
    return NextResponse.json({ org: null, modules: [], role: null })
  }

  // Haal org op
  const { data: org } = await supabase
    .from('organisations')
    .select('*')
    .eq('id', profile.current_org_id)
    .single()

  // Haal actieve modules op
  const { data: modules } = await supabase
    .from('organisation_modules')
    .select('module, is_enabled')
    .eq('org_id', profile.current_org_id)

  // Haal org-rol op
  const { data: membership } = await supabase
    .from('organisation_members')
    .select('role')
    .eq('org_id', profile.current_org_id)
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({
    org,
    modules:  (modules ?? []).filter(m => m.is_enabled).map(m => m.module),
    org_role: membership?.role ?? 'member',
  })
}

// PATCH /api/organisation — org-instellingen bijwerken (naam, logo, kleuren)
// Alleen voor org owner/admin
export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, logo_url, primary_color, accent_color } = body

  // Haal actieve org op
  const { data: profile } = await supabase
    .from('profiles')
    .select('current_org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.current_org_id) {
    return NextResponse.json({ error: 'Geen actieve organisatie' }, { status: 400 })
  }

  // Check of user admin/owner is
  const { data: membership } = await supabase
    .from('organisation_members')
    .select('role')
    .eq('org_id', profile.current_org_id)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Geen rechten' }, { status: 403 })
  }

  const updates: Record<string, string> = {}
  if (name)          updates.name          = name
  if (logo_url)      updates.logo_url      = logo_url
  if (primary_color) updates.primary_color = primary_color
  if (accent_color)  updates.accent_color  = accent_color

  const { data, error } = await supabase
    .from('organisations')
    .update(updates)
    .eq('id', profile.current_org_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
