import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { laddaUppOchLäs } from '@/lib/document-agent'
import { getPosthog } from '@/lib/posthog-server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ fel: 'Ej inloggad' }, { status: 401 })
  }

  const formData = await request.formData()
  const fil = formData.get('fil') as File | null
  const projektId = formData.get('projektId') as string | null

  if (!fil || !projektId) {
    return NextResponse.json({ fel: 'Fil och projektId krävs' }, { status: 400 })
  }

  // Verifiera att projektet tillhör användaren
  const { data: projekt } = await supabase
    .from('projekt')
    .select('id')
    .eq('id', projektId)
    .eq('användar_id', user.id)
    .single()

  if (!projekt) {
    return NextResponse.json({ fel: 'Projektet hittades inte' }, { status: 404 })
  }

  try {
    const { anbudId, resultat } = await laddaUppOchLäs(projektId, user.id, fil)

    if (resultat.fel) {
      return NextResponse.json({
        anbudId,
        varning: resultat.fel,
        metod: resultat.metod,
      })
    }

    const ph = getPosthog()
    if (ph) {
      ph.capture({
        distinctId: user.id,
        event: 'pdf_uploaded',
        properties: {
          filtyp: fil.type,
          storlek_mb: Number((fil.size / 1024 / 1024).toFixed(2)),
        },
      })
      await ph.flush()
    }

    return NextResponse.json({
      anbudId,
      metod: resultat.metod,
      antalSidor: resultat.antalSidor,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ fel: message }, { status: 500 })
  }
}
