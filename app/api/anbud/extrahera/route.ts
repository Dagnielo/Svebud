import { NextRequest, NextResponse } from 'next/server'
import { analyseraOchMatcha } from '@/lib/extraction-agent'

export async function POST(request: NextRequest) {
  const { projektId } = await request.json()

  if (!projektId) {
    return NextResponse.json({ fel: 'projektId krävs' }, { status: 400 })
  }

  try {
    const resultat = await analyseraOchMatcha(projektId)
    return NextResponse.json({ resultat })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ fel: message }, { status: 500 })
  }
}
