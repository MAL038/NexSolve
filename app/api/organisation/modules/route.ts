// app/api/organisation/modules/route.ts
// PATCH — Schakel een module in of uit voor de actieve org
// Alleen org-owner/admin heeft toegang.
// Body: { module: string, is_enabled: boolean }

import { NextRequest, NextResponse } from 'next/server'
import { requireApiContext } from '@/lib/api'
import { z } from 'zod'

const schema = z.object({
  module:     z.string().min(1),
  is_enabled: z.boolean(),
})

export async function PATCH(req: NextRequest) {
  const auth = await requireApiContext({ requireOrg: true })
  if (!auth.ok) return auth.res
  const { supabase, user, orgId } = auth.ctx

  // Alleen owner/admin mag modules beheren
  const { data: membership } = await supabase
    .from('organisation_members')
    .select('role')
    .eq('org_id', orgId!)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
    return NextResponse.json({ error: 'Geen rechten om modules te beheren' }, { status: 403 })
  }

  const body = await req.json()
  const result = schema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.flatten() }, { status: 400 })
  }

  const { module, is_enabled } = result.data

  const { error } = await supabase
    .from('organisation_modules')
    .upsert(
      { org_id: orgId, module, is_enabled },
      { onConflict: 'org_id,module' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
