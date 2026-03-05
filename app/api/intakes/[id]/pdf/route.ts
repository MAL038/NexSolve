// app/api/intakes/[id]/pdf/route.ts
// Genereert een professionele intake PDF via jsPDF (client-triggered server route)
// Retourneert JSON met de HTML-string zodat de client de PDF kan bouwen

import { NextRequest, NextResponse } from 'next/server'
import { requireApiContext } from '@/lib/api'
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<Record<string, string>> }
) {
  const { id } = await params
  const auth = await requireApiContext();
  if (!auth.ok) return auth.res;
  const { supabase, user } = auth.ctx;
  const { data: intake, error } = await supabase
    .from('project_intakes')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !intake) return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })

  return NextResponse.json({ intake })
}
