import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ projektId: string }> }
) {
  const { projektId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ fel: 'Ej inloggad' }, { status: 401 })

  // Verifiera att projektet tillhör användaren
  const { data: projekt } = await supabase
    .from('projekt')
    .select('id')
    .eq('id', projektId)
    .eq('användar_id', user.id)
    .single()

  if (!projekt) return NextResponse.json({ fel: 'Projektet hittades inte' }, { status: 404 })

  // Ta bort relaterad data i rätt ordning (foreign keys)
  // 1. Extraktion-loggar (via anbud)
  const { data: anbudIds } = await supabase
    .from('anbud')
    .select('id')
    .eq('projekt_id', projektId)

  if (anbudIds && anbudIds.length > 0) {
    const ids = anbudIds.map(a => a.id)
    await supabase.from('extraktion_log').delete().in('anbud_id', ids)
  }

  // 2. Kompletteringsbrev
  await supabase.from('kompletteringsbrev').delete().eq('projekt_id', projektId)

  // 3. Uppföljning-loggar + uppföljningar
  const { data: uppfIds } = await supabase
    .from('uppföljning')
    .select('id')
    .eq('projekt_id', projektId)

  if (uppfIds && uppfIds.length > 0) {
    const ids = uppfIds.map(u => u.id)
    await supabase.from('uppföljning_logg').delete().in('uppföljning_id', ids)
  }
  await supabase.from('uppföljning').delete().eq('projekt_id', projektId)

  // 4. Anbud (+ ta bort filer från storage)
  if (anbudIds && anbudIds.length > 0) {
    const { data: filer } = await supabase
      .from('anbud')
      .select('storage_path')
      .eq('projekt_id', projektId)

    if (filer) {
      const paths = filer.map(f => f.storage_path).filter(Boolean) as string[]
      if (paths.length > 0) {
        await supabase.storage.from('anbudsdokument').remove(paths)
      }
    }
  }
  await supabase.from('anbud').delete().eq('projekt_id', projektId)

  // 5. Jämförelser och rekommendationer
  await supabase.from('jämförelse').delete().eq('projekt_id', projektId)
  await supabase.from('rekommendation').delete().eq('projekt_id', projektId)

  // 6. Projektet
  const { error } = await supabase
    .from('projekt')
    .delete()
    .eq('id', projektId)
    .eq('användar_id', user.id)

  if (error) return NextResponse.json({ fel: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
