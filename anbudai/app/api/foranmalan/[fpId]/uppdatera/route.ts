import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ fpId: string }> }
) {
  const { fpId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ fel: 'Ej inloggad' }, { status: 401 })

  const body = await req.json()

  const { error } = await supabase
    .from('foranmalan_projekt')
    .update({
      nätbolag: body.nätbolag ?? undefined,
      kund_namn: body.kund_namn ?? undefined,
      kund_epost: body.kund_epost ?? undefined,
      kund_telefon: body.kund_telefon ?? undefined,
      notifiera_kund: body.notifiera_kund ?? undefined,
    })
    .eq('id', fpId)
    .eq('användar_id', user.id)

  if (error) return NextResponse.json({ fel: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
