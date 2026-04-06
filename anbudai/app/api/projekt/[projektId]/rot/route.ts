import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ projektId: string }> }
) {
  const { projektId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ fel: 'Ej inloggad' }, { status: 401 })

  const body = await req.json()

  // Bara uppdatera fält som faktiskt skickades (undvik att nollställa)
  const uppdatering: Record<string, unknown> = {}
  if (body.rot_aktiverat !== undefined) uppdatering.rot_aktiverat = body.rot_aktiverat
  if (body.rot_typ !== undefined) uppdatering.rot_typ = body.rot_typ
  if (body.rot_antal_agare !== undefined) uppdatering.rot_antal_agare = body.rot_antal_agare
  if (body.rot_tidigare_utnyttjat !== undefined) uppdatering.rot_tidigare_utnyttjat = body.rot_tidigare_utnyttjat
  if (body.rot_fastighetstyp !== undefined) uppdatering.rot_fastighetstyp = body.rot_fastighetstyp
  if (body.rot_belopp !== undefined) uppdatering.rot_belopp = body.rot_belopp
  if (body.rot_kund_betalar !== undefined) uppdatering.rot_kund_betalar = body.rot_kund_betalar

  const { error } = await supabase
    .from('projekt')
    .update(uppdatering)
    .eq('id', projektId)
    .eq('användar_id', user.id)

  if (error) return NextResponse.json({ fel: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
