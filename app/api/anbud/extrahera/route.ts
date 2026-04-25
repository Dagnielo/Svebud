import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { analyseraOchMatcha } from '@/lib/extraction-agent'
import { genereraSnabboffert, detekteraFörfråganTyp } from '@/lib/snabboffert-agent'
import { samlaFUDokument } from '@/lib/fu-agent'

export async function POST(request: NextRequest) {
  const { projektId, tvingaTyp } = await request.json()

  if (!projektId) {
    return NextResponse.json({ fel: 'projektId krävs' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  try {
    // Samla dokument för att detektera typ
    const dokument = await samlaFUDokument(projektId)

    // Auto-detektera eller använd tvingad typ
    const analystyp = tvingaTyp ?? detekteraFörfråganTyp(dokument)

    if (analystyp === 'snabb') {
      const resultat = await genereraSnabboffert(projektId)
      return NextResponse.json({ resultat, analystyp: 'snabb' })
    } else {
      const resultat = await analyseraOchMatcha(projektId, user?.id)
      return NextResponse.json({ resultat, analystyp: 'formell' })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    console.error('[extrahera] FEL:', message)
    return NextResponse.json({ fel: message }, { status: 500 })
  }
}
