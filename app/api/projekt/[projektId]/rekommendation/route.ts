import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { genereraRekommendation } from '@/lib/recommendation-agent'

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

  // Verifiera ägarskap och tier
  const { data: projekt } = await supabase
    .from('projekt')
    .select('id, tier')
    .eq('id', projektId)
    .eq('användar_id', user.id)
    .single()

  if (!projekt) {
    return NextResponse.json({ fel: 'Projektet hittades inte' }, { status: 404 })
  }

  const { data: profil } = await supabase
    .from('profiler')
    .select('tier')
    .eq('id', user.id)
    .single()

  if (!profil || !['pro', 'business'].includes(profil.tier ?? '')) {
    return NextResponse.json(
      { fel: 'Rekommendation kräver Pro- eller Business-plan' },
      { status: 403 }
    )
  }

  try {
    const resultat = await genereraRekommendation(projektId)
    return NextResponse.json({ resultat })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ fel: message }, { status: 500 })
  }
}
