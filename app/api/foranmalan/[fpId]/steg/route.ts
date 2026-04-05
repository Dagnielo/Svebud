import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { FORANMALAN_STEG, nästaSteg, FORANMALAN_JOBBTYPER } from '@/lib/foranmalan-regler'
import type { StegId } from '@/lib/foranmalan-regler'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ fpId: string }> }
) {
  const { fpId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ fel: 'Ej inloggad' }, { status: 401 })

  const { kommentar, skickaNotis = true } = await req.json()

  // Hämta projektet
  const { data: fp } = await supabase
    .from('foranmalan_projekt')
    .select('*')
    .eq('id', fpId)
    .eq('användar_id', user.id)
    .single()

  if (!fp) return NextResponse.json({ fel: 'Projekt ej hittat' }, { status: 404 })

  const nyttSteg = nästaSteg(fp.nuvarande_steg as StegId)
  if (!nyttSteg) return NextResponse.json({ fel: 'Redan på sista steget' }, { status: 400 })

  const stegInfo = FORANMALAN_STEG.find(s => s.id === nyttSteg)
  const jobbInfo = FORANMALAN_JOBBTYPER.find(j => j.id === fp.jobbtyp)

  // Uppdatera steg
  await supabase
    .from('foranmalan_projekt')
    .update({ nuvarande_steg: nyttSteg })
    .eq('id', fpId)

  // Logga
  await supabase.from('foranmalan_steg_logg').insert({
    fp_id: fpId,
    steg: nyttSteg,
    kommentar: kommentar || null,
    notis_skickad: false
  })

  // Skicka kundnotis om valt, aktiverat och kund har epost
  let notisskickad = false
  if (skickaNotis && fp.notifiera_kund && fp.kund_epost && stegInfo) {
    const projektInfo = await supabase
      .from('projekt')
      .select('namn')
      .eq('id', fp.projekt_id)
      .single()

    const projektNamn = projektInfo.data?.namn || 'Ditt elprojekt'
    const handlaggningstid = jobbInfo?.typiskHandlaggningstid

    const meddelanden: Record<string, string> = {
      fore: `Vi har nu skickat in föranmälan till ${fp.nätbolag || 'nätbolaget'}. ${handlaggningstid ? `Normal handläggningstid är ${handlaggningstid}.` : ''} Vi meddelar dig så snart installationsmedgivande kommit.`,
      medgivande: `Goda nyheter! ${fp.nätbolag || 'Nätbolaget'} har godkänt föranmälan och utfärdat installationsmedgivande. Vi bokar in installationsdatum inom kort.`,
      installation: `Installationsarbetet har startat. Vi arbetar på att slutföra projektet enligt plan.`,
      fardig: `Installationen är klar! Vi har skickat in färdiganmälan till ${fp.nätbolag || 'nätbolaget'}. De behöver normalt byta elmätare — räkna med 1–5 arbetsdagar.`,
      klar: `Projektet är nu helt klart! ${fp.nätbolag || 'Nätbolaget'} har godkänt allt. Anläggningen är driftsatt.`
    }

    try {
      await resend.emails.send({
        from: process.env.AVSANDARE_EPOST!,
        to: fp.kund_epost,
        subject: `Uppdatering: ${projektNamn} — ${stegInfo.label}`,
        html: `
          <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
            <div style="background: #0E1B2E; padding: 16px 20px; border-radius: 8px; margin-bottom: 20px;">
              <span style="color: #F5C400; font-weight: 800; font-size: 18px;">⚡ SveBud</span>
            </div>
            <h2 style="color: #111; margin-bottom: 8px;">Statusuppdatering</h2>
            <p style="color: #555; margin-bottom: 20px;">${projektNamn}</p>

            <div style="background: #f0fdf4; border-left: 4px solid #00C67A; padding: 14px 16px; border-radius: 4px; margin-bottom: 20px;">
              <div style="font-weight: 700; color: #111; margin-bottom: 6px;">
                ${stegInfo.emoji} ${stegInfo.label}
              </div>
              <p style="color: #444; margin: 0; line-height: 1.6;">
                ${meddelanden[nyttSteg] || 'Projektet har uppdaterats.'}
              </p>
            </div>

            ${kommentar ? `
            <div style="background: #f9f9f9; padding: 12px 16px; border-radius: 4px; margin-bottom: 20px;">
              <div style="font-size: 12px; color: #888; margin-bottom: 4px;">NOTERING FRÅN ELFIRMAN</div>
              <p style="color: #444; margin: 0;">${kommentar}</p>
            </div>
            ` : ''}

            <p style="color: #888; font-size: 12px; margin-top: 24px; border-top: 1px solid #eee; padding-top: 16px;">
              Har du frågor? Svara på detta mail så återkommer vi.
            </p>
          </div>
        `
      })
      notisskickad = true

      // Uppdatera logg med notis-status
      await supabase
        .from('foranmalan_steg_logg')
        .update({ notis_skickad: true })
        .eq('fp_id', fpId)
        .eq('steg', nyttSteg)
        .order('skapad', { ascending: false })
        .limit(1)

    } catch (e) {
      console.error('Resend-fel:', e)
    }
  }

  return NextResponse.json({
    nyttSteg,
    notisskickad,
    stegLabel: stegInfo?.label
  })
}
