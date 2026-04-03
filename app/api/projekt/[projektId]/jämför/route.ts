import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { matchaKrav } from '@/lib/comparison-agent'

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

  // Verifiera ägarskap
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
    const resultat = await matchaKrav(projektId)
    return NextResponse.json({ resultat })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ fel: message }, { status: 500 })
  }
}
