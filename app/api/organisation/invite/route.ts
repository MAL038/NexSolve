// app/api/organisation/invite/route.ts
// POST — Nodig een gebruiker uit voor de actieve org
// Alleen org-admin/owner heeft toegang.
// Body: { email, full_name?, org_role }

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { sendEmail } from '@/lib/email'

const schema = z.object({
  email:    z.string().email('Ongeldig e-mailadres'),
  org_role: z.enum(['admin', 'member']).default('member'),
  full_name: z.string().min(1).max(100).optional(),
})

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
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Haal actieve org op
  const { data: profile } = await supabase
    .from('profiles')
    .select('current_org_id, full_name')
    .eq('id', user.id)
    .single()

  if (!profile?.current_org_id)
    return NextResponse.json({ error: 'Geen actieve organisatie' }, { status: 400 })

  // Check of user org-admin/owner is
  const { data: membership } = await supabase
    .from('organisation_members')
    .select('role')
    .eq('org_id', profile.current_org_id)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role))
    return NextResponse.json({ error: 'Geen rechten om gebruikers uit te nodigen' }, { status: 403 })

  // Valideer body
  const body = await req.json()
  const result = schema.safeParse(body)
  if (!result.success)
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })

  const { email, org_role, full_name } = result.data

  // Haal org-naam op voor de email
  const { data: org } = await supabase
    .from('organisations')
    .select('name, id')
    .eq('id', profile.current_org_id)
    .single()

  // Check of email al bestaat in deze org
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, current_org_id')
    .eq('email', email)
    .maybeSingle()

  if (existingProfile) {
    // Gebruiker bestaat al — check of ze al in deze org zitten
    const { data: existingMember } = await supabase
      .from('organisation_members')
      .select('role')
      .eq('org_id', profile.current_org_id)
      .eq('user_id', existingProfile.id)
      .maybeSingle()

    if (existingMember)
      return NextResponse.json({ error: 'Dit e-mailadres is al lid van deze organisatie' }, { status: 409 })

    // Gebruiker bestaat maar is nog geen lid — direct toevoegen
    const admin = adminClient()
    await admin.from('organisation_members').insert({
      org_id:  profile.current_org_id,
      user_id: existingProfile.id,
      role:    org_role,
    })

    // Stuur notificatie email
    await sendEmail({
      type:          'org_invite',
      to:            email,
      recipientName: full_name ?? email,
      inviterName:   profile.full_name ?? 'Een beheerder',
      orgName:       org?.name ?? 'de organisatie',
      acceptUrl:     `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.nexsolve.nl'}/dashboard`,
    })

    return NextResponse.json({ success: true, message: `${email} toegevoegd aan ${org?.name}` }, { status: 201 })
  }

  // Nieuwe gebruiker — stuur Supabase uitnodigingsmail
  const admin = adminClient()
  const acceptUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.nexsolve.nl'}/auth/accept-invite`

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      full_name:       full_name ?? '',
      invited_org_id:  profile.current_org_id,
      invited_org_role: org_role,
    },
    redirectTo: acceptUrl,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Profiel alvast aanmaken
  if (data.user) {
    await admin.from('profiles').upsert({
      id:        data.user.id,
      email,
      full_name: full_name ?? '',
      role:      'member',
      is_active: true,
    }, { onConflict: 'id' })
  }

  // Stuur uitnodigingsemail via Resend
  await sendEmail({
    type:          'org_invite',
    to:            email,
    recipientName: full_name ?? email,
    inviterName:   profile.full_name ?? 'Een beheerder',
    orgName:       org?.name ?? 'de organisatie',
    acceptUrl,
  })

  return NextResponse.json({
    success: true,
    message: `Uitnodiging verstuurd naar ${email}`,
  }, { status: 201 })
}

// GET — Haal leden van de actieve org op
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('current_org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.current_org_id)
    return NextResponse.json({ error: 'Geen actieve organisatie' }, { status: 400 })

  const { data, error } = await supabase
    .from('organisation_members')
    .select(`
      role, joined_at,
      profile:profiles!organisation_members_user_id_fkey(
        id, full_name, email, avatar_url, role, is_active
      )
    `)
    .eq('org_id', profile.current_org_id)
    .order('joined_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// DELETE — Verwijder lid uit org
// Body: { user_id }
export async function DELETE(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { user_id } = await req.json()
  if (!user_id) return NextResponse.json({ error: 'user_id verplicht' }, { status: 400 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('current_org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.current_org_id)
    return NextResponse.json({ error: 'Geen actieve organisatie' }, { status: 400 })

  // Alleen admin/owner mag verwijderen
  const { data: membership } = await supabase
    .from('organisation_members')
    .select('role')
    .eq('org_id', profile.current_org_id)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role))
    return NextResponse.json({ error: 'Geen rechten' }, { status: 403 })

  // Owner mag zichzelf niet verwijderen
  if (user_id === user.id)
    return NextResponse.json({ error: 'Je kunt jezelf niet verwijderen' }, { status: 400 })

  const admin = adminClient()
  const { error } = await admin
    .from('organisation_members')
    .delete()
    .eq('org_id', profile.current_org_id)
    .eq('user_id', user_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
