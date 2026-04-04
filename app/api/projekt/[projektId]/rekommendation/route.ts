import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { genereraAnbud } from '@/lib/recommendation-agent'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projektId: string }> }
) {
  const { projektId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ fel: 'Ej inloggad' }, { status: 401 })
  }

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
    const resultat = await genereraAnbud(projektId)
    return NextResponse.json({ resultat })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    const stack = err instanceof Error ? err.stack : ''
    console.error('[rekommendation] FEL:', message, stack)
    return NextResponse.json({ fel: message }, { status: 500 })
  }
}
