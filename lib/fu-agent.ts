import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/**
 * Samlar text från ALLA uppladdade dokument i ett projekt
 * och sätter ihop dem till en samlad FU-text.
 */
export async function samlaFUText(projektId: string): Promise<string | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: anbud } = await supabase
    .from('anbud')
    .select('*')
    .eq('projekt_id', projektId)
    .order('skapad', { ascending: true }) as { data: any[] | null }

  if (!anbud || anbud.length === 0) return null

  const delar: string[] = []

  for (const a of anbud) {
    const text = a['rå_text'] as string | null
    if (text && text.length > 10) {
      delar.push(`=== DOKUMENT: ${a.filnamn} ===\n\n${text}`)
    }
  }

  if (delar.length === 0) return null

  const samladText = delar.join('\n\n---\n\n')

  // Spara samlad text på projektet
  await supabase
    .from('projekt')
    .update({ förfrågningsunderlag_text: samladText })
    .eq('id', projektId)

  return samladText
}

/**
 * Kör extraktion på samlad FU-text för hela projektet.
 * Anropas efter att alla dokument laddats upp, eller efter varje nytt dokument.
 */
export async function körFUExtraktion(projektId: string): Promise<void> {
  const { extraheraFrånProjekt } = await import('@/lib/extraction-agent')
  await extraheraFrånProjekt(projektId)
}
