import { NextRequest, NextResponse } from 'next/server'
import { analyseraOchMatcha } from '@/lib/extraction-agent'
import { genereraSnabboffert, detekteraFörfråganTyp } from '@/lib/snabboffert-agent'
import { samlaFUDokument } from '@/lib/fu-agent'

export async function POST(request: NextRequest) {
  const { projektId, tvingaTyp } = await request.json()

  if (!projektId) {
    return NextResponse.json({ fel: 'projektId krävs' }, { status: 400 })
  }

  try {
    // Samla dokument för att detektera typ
    const dokument = await samlaFUDokument(projektId)

    // Auto-detektera eller använd tvingad typ
    const analystyp = tvingaTyp ?? detekteraFörfråganTyp(dokument)

    if (analystyp === 'snabb') {
      const resultat = await genereraSnabboffert(projektId)
      return NextResponse.json({ resultat, analystyp: 'snabb' })
    } else {
      const resultat = await analyseraOchMatcha(projektId)
      return NextResponse.json({ resultat, analystyp: 'formell' })
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    console.error('[extrahera] FEL:', message)
    return NextResponse.json({ fel: message }, { status: 500 })
  }
}
