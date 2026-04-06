import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { formateraMarkdown } from '@/lib/recommendation-agent'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projektId: string }> }
) {
  const { projektId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ fel: 'Ej inloggad' }, { status: 401 })
  }

  // Hämta projekt och rekommendation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: projekt } = await supabase
    .from('projekt')
    .select('*')
    .eq('id', projektId)
    .eq('användar_id', user.id)
    .single() as { data: any }

  if (!projekt || !projekt.rekommendation) {
    return NextResponse.json({ fel: 'Ingen rekommendation funnen' }, { status: 404 })
  }

  // Formatera som markdown
  const markdown = formateraMarkdown(projekt.rekommendation)
  const safeNamn = (projekt.namn as string).replace(/[^a-z0-9åäö]/gi, '_')
  const fileName = `rekommendation_${safeNamn}_${Date.now()}.md`
  const storagePath = `projekt/${projektId}/${fileName}`

  // Ladda upp med service role (för storage-åtkomst)
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { error } = await serviceSupabase.storage
    .from('anbudsdokument')
    .upload(storagePath, markdown, { contentType: 'text/markdown' })

  if (error) {
    return NextResponse.json({ fel: 'Kunde ej spara fil' }, { status: 500 })
  }

  // Skapa signerad URL (24h)
  const { data: signedData } = await serviceSupabase.storage
    .from('anbudsdokument')
    .createSignedUrl(storagePath, 24 * 60 * 60)

  return NextResponse.json({
    url: signedData?.signedUrl,
    fileName,
  })
}
