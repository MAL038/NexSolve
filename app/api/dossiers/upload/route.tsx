import { NextRequest, NextResponse } from 'next/server'

import { requireApiContext } from "@/lib/apiContext";
export async function POST(req: NextRequest) {
    const ctx = await requireApiContext();
  if (!ctx.ok) return ctx.res;
  const { supabase, user, orgId: ctxOrgId, orgRole, isSuperuser } = ctx;
  const formData = await req.formData()
  const file = formData.get('file') as File

  if (!file) {
    return NextResponse.json({ error: 'Geen bestand' }, { status: 400 })
  }

  // Max 10MB
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Bestand te groot (max 10MB)' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`

  const { data, error } = await supabase.storage
    .from('dossiers')  // maak deze bucket aan in Supabase dashboard
    .upload(path, file, {
      contentType: file.type,
      upsert: false,
    })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { data: { publicUrl } } = supabase.storage
    .from('dossiers')
    .getPublicUrl(data.path)

  return NextResponse.json({
    file_url: publicUrl,
    file_name: file.name,
    file_size: file.size,
  })
}