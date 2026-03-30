import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY!)

type UppföljningsÅtgärd = {
  uppföljningId: string
  projektNamn: string
  åtgärd: 'påminnelse_1' | 'påminnelse_2' | 'deadline_passerad'
  mottagareEpost: string
  mottagareNamn: string
}

export async function körDagligUppföljning(): Promise<{
  behandlade: number
  skickade: number
  fel: string[]
}> {
  const nu = new Date()
  const fel: string[] = []
  let skickade = 0

  // Hämta alla aktiva uppföljningar som behöver åtgärd
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: uppföljningar, error } = await supabase
    .from('uppföljning')
    .select('*')
    .not('state', 'in', '("vunnet","förlorat","avbrutet")')
    .lte('nästa_åtgärd', nu.toISOString()) as { data: any[] | null; error: any }

  if (error) {
    throw new Error(`Kunde inte hämta uppföljningar: ${error.message}`)
  }

  if (!uppföljningar || uppföljningar.length === 0) {
    return { behandlade: 0, skickade: 0, fel: [] }
  }

  for (const u of uppföljningar) {
    try {
      // Hämta projekt separat
      const { data: projekt } = await supabase
        .from('projekt')
        .select('namn, användar_id')
        .eq('id', u.projekt_id)
        .single() as { data: { namn: string; användar_id: string } | null; error: any }

      if (!projekt) continue

      // Hämta användarens e-post
      const { data: profil } = await supabase
        .from('profiler')
        .select('*')
        .eq('id', projekt.användar_id)
        .single() as { data: { epost: string | null; fullnamn: string | null } | null; error: any }

      if (!profil?.epost) {
        fel.push(`Uppföljning ${u.id}: Ingen e-post för användare`)
        continue
      }

      const åtgärd = bestämÅtgärd(u.state, u.sista_anbudsdag)
      if (!åtgärd) continue

      // Skicka e-post
      await skickaPåminnelse({
        uppföljningId: u.id,
        projektNamn: projekt.namn,
        åtgärd: åtgärd.typ,
        mottagareEpost: profil.epost,
        mottagareNamn: profil.fullnamn ?? 'Användare',
      })

      // Uppdatera state
      const nyState = åtgärd.typ === 'påminnelse_1'
        ? 'påminnelse_1_skickad'
        : åtgärd.typ === 'påminnelse_2'
          ? 'påminnelse_2_skickad'
          : 'påminnelse_2_skickad'

      const uppdatering: Record<string, unknown> = {
        state: nyState,
        nästa_åtgärd: åtgärd.nästaÅtgärdDatum?.toISOString() ?? null,
        nästa_åtgärd_typ: åtgärd.nästaÅtgärdTyp ?? null,
      }

      if (åtgärd.typ === 'påminnelse_1') {
        uppdatering.påminnelse_1_skickad = nu.toISOString()
      } else if (åtgärd.typ === 'påminnelse_2') {
        uppdatering.påminnelse_2_skickad = nu.toISOString()
      }

      await supabase
        .from('uppföljning')
        .update(uppdatering)
        .eq('id', u.id)

      // Logga
      await supabase.from('uppföljning_logg').insert({
        uppföljning_id: u.id,
        händelse: `${åtgärd.typ}_skickad`,
        detaljer: { mottagare: profil.epost },
        epost_skickad_till: profil.epost,
      })

      skickade++
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Okänt fel'
      fel.push(`Uppföljning ${u.id}: ${message}`)
    }
  }

  return { behandlade: uppföljningar.length, skickade, fel }
}

function bestämÅtgärd(
  state: string,
  sistaAnbudsdag: string | null
): {
  typ: 'påminnelse_1' | 'påminnelse_2' | 'deadline_passerad'
  nästaÅtgärdDatum: Date | null
  nästaÅtgärdTyp: string | null
} | null {
  const nu = new Date()

  if (state === 'anbud_skickat' || state === 'påminnelse_1_schemalagd') {
    // Skicka första påminnelsen, planera andra om 3 dagar
    const nästa = new Date(nu)
    nästa.setDate(nästa.getDate() + 3)
    return {
      typ: 'påminnelse_1',
      nästaÅtgärdDatum: nästa,
      nästaÅtgärdTyp: 'påminnelse_2',
    }
  }

  if (state === 'påminnelse_1_skickad' || state === 'påminnelse_2_schemalagd') {
    // Skicka andra påminnelsen
    return {
      typ: 'påminnelse_2',
      nästaÅtgärdDatum: sistaAnbudsdag ? new Date(sistaAnbudsdag) : null,
      nästaÅtgärdTyp: sistaAnbudsdag ? 'deadline_passerad' : null,
    }
  }

  if (state === 'påminnelse_2_skickad' && sistaAnbudsdag) {
    const deadline = new Date(sistaAnbudsdag)
    if (nu > deadline) {
      return {
        typ: 'deadline_passerad',
        nästaÅtgärdDatum: null,
        nästaÅtgärdTyp: null,
      }
    }
  }

  return null
}

async function skickaPåminnelse(åtgärd: UppföljningsÅtgärd): Promise<void> {
  const ämne = åtgärd.åtgärd === 'påminnelse_1'
    ? `Påminnelse: Anbud för "${åtgärd.projektNamn}" väntar på svar`
    : åtgärd.åtgärd === 'påminnelse_2'
      ? `Sista påminnelse: Anbud för "${åtgärd.projektNamn}"`
      : `Deadline passerad: Anbud för "${åtgärd.projektNamn}"`

  const brödtext = åtgärd.åtgärd === 'deadline_passerad'
    ? `Hej ${åtgärd.mottagareNamn},\n\nAnbudsdeadline för "${åtgärd.projektNamn}" har passerat utan svar. Uppdatera statusen i AnbudAI – markera som vunnet, förlorat eller avbrutet.\n\nMed vänlig hälsning,\nAnbudAI`
    : `Hej ${åtgärd.mottagareNamn},\n\nDitt anbud för "${åtgärd.projektNamn}" har inte fått svar ännu. Kontrollera om beställaren behöver kompletterande information.\n\nLogga in i AnbudAI för att se detaljer och eventuellt skicka ett kompletteringsbrev.\n\nMed vänlig hälsning,\nAnbudAI`

  await resend.emails.send({
    from: process.env.AVSANDARE_EPOST ?? 'noreply@anbudai.se',
    to: åtgärd.mottagareEpost,
    subject: ämne,
    text: brödtext,
  })
}
