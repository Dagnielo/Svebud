import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { extraheraFrånText } from '@/lib/extraction-agent'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  const { anbudId } = await request.json()

  if (!anbudId) {
    return NextResponse.json({ fel: 'anbudId krävs' }, { status: 400 })
  }

  // Hämta anbud med rå text
  const { data: anbud, error } = await supabase
    .from('anbud')
    .select('*')
    .eq('id', anbudId)
    .single()

  if (error || !anbud) {
    return NextResponse.json({ fel: 'Anbud hittades inte' }, { status: 404 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const råText = (anbud as any)['rå_text'] as string | null

  if (!råText || råText.length < 10) {
    return NextResponse.json({ fel: 'Ingen text att extrahera' }, { status: 400 })
  }

  try {
    const resultat = await extraheraFrånText(anbudId, råText)
    return NextResponse.json({ resultat })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json({ fel: message }, { status: 500 })
  }
}
