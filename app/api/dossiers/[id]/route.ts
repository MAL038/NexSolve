import { NextRequest, NextResponse } from 'next/server'

import { requireApiContext } from "@/lib/apiContext";
export async function GET(_: NextRequest, { params }: { params: Promise<Record<string, string>> }) {
  const { id } = await params
    const ctx = await requireApiContext();
  if (!ctx.ok) return ctx.res;
  const { supabase, user, orgId: ctxOrgId, orgRole, isSuperuser } = ctx;
  const { data, error } = await supabase
    .from('dossiers_with_details')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })
  }

  return NextResponse.json({ data })
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<Record<string, string>> }) {
  const { id } = await params
    const ctx = await requireApiContext();
  if (!ctx.ok) return ctx.res;
  const { supabase, user, orgId: ctxOrgId } = ctx;

  // Haal het dossier op om eigenaarschap te controleren
  const { data: dossier, error: fetchError } = await supabase
    .from('dossiers')
    .select('id, submitted_by, file_url')
    .eq('id', id)
    .single()

  if (fetchError || !dossier) {
    return NextResponse.json({ error: 'Niet gevonden' }, { status: 404 })
  }

  // Check of de gebruiker admin is
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  // Alleen eigenaar of admin mag verwijderen
  if (dossier.submitted_by !== user.id && !isAdmin) {
    return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
  }

  // Als er een bestand is gekoppeld, verwijder het ook uit storage
  if (dossier.file_url) {
    try {
      // Haal het pad op uit de public URL
      // URL formaat: .../storage/v1/object/public/dossiers/{userId}/{uuid}.{ext}
      const url = new URL(dossier.file_url)
      const pathParts = url.pathname.split('/dossiers/')
      if (pathParts[1]) {
        await supabase.storage
          .from('dossiers')
          .remove([pathParts[1]])
      }
    } catch {
      // Storage verwijdering is best-effort — log maar blokkeer niet
      console.warn(`[DELETE /api/dossiers/${id}] Storage cleanup mislukt voor:`, dossier.file_url)
    }
  }

  const { error: deleteError } = await supabase
    .from('dossiers')
    .delete()
    .eq('id', id)

  if (deleteError) {
    console.error(`[DELETE /api/dossiers/${id}]`, deleteError)
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}
