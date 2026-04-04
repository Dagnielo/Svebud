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

  const { error } = await supabase
    .from('projekt')
    .update({
      rot_aktiverat:         body.rot_aktiverat,
      rot_typ:               body.rot_typ,
      rot_antal_agare:       body.rot_antal_agare,
      rot_tidigare_utnyttjat: body.rot_tidigare_utnyttjat,
      rot_fastighetstyp:     body.rot_fastighetstyp,
      rot_belopp:            body.rot_belopp,
      rot_kund_betalar:      body.rot_kund_betalar,
    })
    .eq('id', projektId)
    .eq('användar_id', user.id)

  if (error) return NextResponse.json({ fel: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
