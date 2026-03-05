/**
 * POST /api/admin/users/invite
 * Stuurt een uitnodigingsmail via Supabase Admin API.
 * Body: { email, role, full_name? }
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireApiContext } from "@/lib/apiContext";
import { createClient } from '@/lib/supabaseServer'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { z } from 'zod'

const schema = z.object({
  email:     z.string().email('Ongeldig e-mailadres'),
  role:      z.enum(['member', 'viewer', 'superuser']).default('member'),
  full_name: z.string().min(1).max(100).optional(),
})

async function requireSuperuser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: isSu } = await supabase.rpc('is_superuser')
  if (!isSu) return null
  return { supabase, currentUserId: user.id }
}

function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function POST(req: NextRequest) {
  const ctx = await requireSuperuser()
  if (!ctx) return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })

  const body = await req.json()
  const result = schema.safeParse(body)
  if (!result.success)
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })

  const { email, role, full_name } = result.data

  // Check of e-mail al bestaat
  const { data: existing } = await ctx.supabase
    .from('profiles').select('id').eq('email', email).maybeSingle()
  if (existing)
    return NextResponse.json({ error: 'Dit e-mailadres is al geregistreerd' }, { status: 409 })

  const admin = adminClient()

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: full_name ?? '', role },
    redirectTo: process.env.NEXT_PUBLIC_APP_URL
      ? process.env.NEXT_PUBLIC_APP_URL + '/auth/accept-invite'
      : 'https://app.nexsolve.nl/auth/accept-invite',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Profiel alvast aanmaken met gewenste rol zodat het niet wacht op de trigger
  if (data.user) {
    await admin.from('profiles').upsert({
      id: data.user.id, email,
      full_name: full_name ?? '',
      role, is_active: true,
    }, { onConflict: 'id' })
  }

  return NextResponse.json({
    success: true,
    message: `Uitnodiging verstuurd naar ${email}`,
    user_id: data.user?.id,
  }, { status: 201 })
}
