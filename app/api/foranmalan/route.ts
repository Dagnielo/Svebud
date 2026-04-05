import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ fel: 'Ej inloggad' }, { status: 401 })

  const body = await req.json()
  const { projekt_id, jobbtyp, nätbolag, kund_namn, kund_epost, kund_telefon } = body

  // Verifiera ägarskap av projektet
  const { data: projekt } = await supabase
    .from('projekt')
    .select('id')
    .eq('id', projekt_id)
    .eq('användar_id', user.id)
    .single()

  if (!projekt) return NextResponse.json({ fel: 'Projekt ej hittat' }, { status: 404 })

  // Skapa föranmälan-projekt
  const { data: fp, error } = await supabase
    .from('foranmalan_projekt')
    .insert({
      projekt_id,
      användar_id: user.id,
      jobbtyp,
      nätbolag,
      kund_namn,
      kund_epost,
      kund_telefon,
      nuvarande_steg: 'vunnet'
    })
    .select()
    .single()

  if (error) return NextResponse.json({ fel: error.message }, { status: 500 })

  // Logga första steget
  await supabase.from('foranmalan_steg_logg').insert({
    fp_id: fp.id,
    steg: 'vunnet',
    kommentar: 'Anbud markerat som vunnet'
  })

  return NextResponse.json({ fp })
}

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ fel: 'Ej inloggad' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const projekt_id = searchParams.get('projekt_id')

  let query = supabase
    .from('foranmalan_projekt')
    .select(`
      *,
      foranmalan_steg_logg(id, steg, kommentar, notis_skickad, skapad)
    `)
    .eq('användar_id', user.id)
    .order('skapad', { ascending: false })

  if (projekt_id) query = query.eq('projekt_id', projekt_id)

  const { data, error } = await query
  if (error) return NextResponse.json({ fel: error.message }, { status: 500 })

  return NextResponse.json({ data })
}
