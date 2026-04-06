import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { FORANMALAN_STEG, nästaSteg } from '@/lib/foranmalan-regler'
import type { StegId } from '@/lib/foranmalan-regler'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ fpId: string }> }
) {
  const { fpId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ fel: 'Ej inloggad' }, { status: 401 })

  const { kommentar } = await req.json()

  const { data: fp } = await supabase
    .from('foranmalan_projekt')
    .select('*')
    .eq('id', fpId)
    .eq('användar_id', user.id)
    .single()

  if (!fp) return NextResponse.json({ fel: 'Projekt ej hittat' }, { status: 404 })

  const nyttSteg = nästaSteg(fp.nuvarande_steg as StegId)
  if (!nyttSteg) return NextResponse.json({ fel: 'Redan på sista steget' }, { status: 400 })

  const stegInfo = FORANMALAN_STEG.find(s => s.id === nyttSteg)

  // Uppdatera steg
  await supabase
    .from('foranmalan_projekt')
    .update({ nuvarande_steg: nyttSteg })
    .eq('id', fpId)

  // Logga
  await supabase.from('foranmalan_steg_logg').insert({
    fp_id: fpId,
    steg: nyttSteg,
    kommentar: kommentar || null,
    notis_skickad: false
  })

  return NextResponse.json({
    nyttSteg,
    stegLabel: stegInfo?.label
  })
}
