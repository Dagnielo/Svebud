import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ brevId: string }> }
) {
  const { brevId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ fel: 'Ej inloggad' }, { status: 401 })
  }

  // Hämta brev och verifiera ägarskap
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: brev } = await supabase
    .from('kompletteringsbrev')
    .select('*')
    .eq('id', brevId)
    .single() as { data: any }

  if (!brev) {
    return NextResponse.json({ fel: 'Brev hittades inte' }, { status: 404 })
  }

  // Verifiera ägarskap via projekt
  const { data: projekt } = await supabase
    .from('projekt')
    .select('id, användar_id')
    .eq('id', brev.projekt_id)
    .single() as { data: { id: string; användar_id: string } | null }

  if (!projekt || projekt.användar_id !== user.id) {
    return NextResponse.json({ fel: 'Ej behörighet' }, { status: 403 })
  }

  if (brev.status !== 'utkast') {
    return NextResponse.json({ fel: 'Brevet har redan godkänts eller skickats' }, { status: 400 })
  }

  // Uppdatera status
  await supabase
    .from('kompletteringsbrev')
    .update({ status: 'godkänt' })
    .eq('id', brevId)

  return NextResponse.json({ framgång: true })
}
