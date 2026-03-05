// app/api/intake-templates/route.ts
// Geeft de gecombineerde secties terug (generiek + thema-specifiek)
// zodat de IntakeModal kan tonen welke secties beschikbaar zijn.

import { NextRequest, NextResponse } from 'next/server'
import { requireApiContext } from "@/lib/apiContext";
export async function GET(req: NextRequest) {
    const ctx = await requireApiContext();
  if (!ctx.ok) return ctx.res;
  const { supabase, user, orgId: ctxOrgId, orgRole, isSuperuser } = ctx;
  const themeId = new URL(req.url).searchParams.get('theme_id') || null

  // Generieke template (theme_id is null)
  const { data: genericTemplates } = await supabase
    .from('intake_templates')
    .select('*')
    .is('theme_id', null)
    .eq('is_active', true)
    .order('position')

  // Thema-specifieke template
  let themeTemplates: any[] = []
  if (themeId) {
    const { data } = await supabase
      .from('intake_templates')
      .select('*')
      .eq('theme_id', themeId)
      .eq('is_active', true)
      .order('position')
    themeTemplates = data ?? []
  }

  // Combineer alle secties
  const sections = [
    ...(genericTemplates ?? []).flatMap((t: any) => t.sections ?? []),
    ...themeTemplates.flatMap((t: any) => t.sections ?? []),
  ]

  return NextResponse.json({ sections })
}
