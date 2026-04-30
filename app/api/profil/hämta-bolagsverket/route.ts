/**
 * POST /api/profil/hämta-bolagsverket
 *
 * Tar emot { orgnr } i body, hämtar företagsdata via bolagsverket-agent
 * och upserts till firma_profil + firma_egenskap_källa.
 *
 * Spec: docs/PROMPT_profil_v1.md (Etapp A, rad 134-152)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { hämtaFöretagsdata } from '@/lib/bolagsverket-agent'
import type { BolagsverketData, EgenskapsKälla } from '@/lib/types/firma'

export const maxDuration = 30

type RequestBody = {
  orgnr: string
}

export async function POST(req: NextRequest) {
  // 1. Auth-check
  const supabase = await createClient()
  const { data: { user }, error: authFel } = await supabase.auth.getUser()

  if (authFel || !user) {
    return NextResponse.json(
      { fel: 'Ej inloggad' },
      { status: 401 }
    )
  }

  // 2. Parsa body
  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { fel: 'Ogiltig JSON i request body' },
      { status: 400 }
    )
  }

  if (!body.orgnr || typeof body.orgnr !== 'string') {
    return NextResponse.json(
      { fel: 'Fältet "orgnr" krävs och måste vara en sträng' },
      { status: 400 }
    )
  }

  // 3. Hämta från Bolagsverket (via Firecrawl-fallback)
  let data: BolagsverketData | null
  try {
    data = await hämtaFöretagsdata(body.orgnr)
  } catch (err) {
    const meddelande = err instanceof Error ? err.message : 'Okänt fel'
    return NextResponse.json(
      { fel: `Hämtning misslyckades: ${meddelande}` },
      { status: 422 }
    )
  }

  if (!data) {
    return NextResponse.json(
      { fel: 'Inget företag hittades med detta organisationsnummer' },
      { status: 404 }
    )
  }

  // 4. Upsert till firma_profil
  // Vi behåller manuellt inmatade fält intakta — BolagsverketData är
  // endast Pick<FirmaProfil, ...> av auto-fält.
  const upsertData = {
    användar_id: user.id,
    ...data,
    bolagsverket_senast_hämtat: new Date().toISOString(),
  }

  const { data: profil, error: upsertFel } = await supabase
    .from('firma_profil')
    .upsert(upsertData, { onConflict: 'användar_id' })
    .select()
    .single()

  if (upsertFel || !profil) {
    console.error('[hämta-bolagsverket] upsert fel:', upsertFel)
    return NextResponse.json(
      { fel: 'Kunde inte spara företagsdata' },
      { status: 500 }
    )
  }

  // 5. Skriv källa-rader för varje hämtat fält
  // Tar bort eventuella tidigare källa-rader för samma fält först
  // (re-hämtning ska överskriva källan).
  const fältNamn = Object.keys(data) as (keyof BolagsverketData)[]
  const källRader = fältNamn.map(fält => ({
    firma_id: profil.id,
    fält_namn: fält,
    källa: 'bolagsverket' as EgenskapsKälla,
    hämtat: new Date().toISOString(),
  }))

  const { error: källaFel } = await supabase
    .from('firma_egenskap_källa')
    .upsert(källRader, { onConflict: 'firma_id,fält_namn' })

  if (källaFel) {
    // Inte kritiskt — profilen är sparad, källtaggar saknas bara för UI
    console.warn('[hämta-bolagsverket] källa-rader fel:', källaFel)
  }

  return NextResponse.json({ profil }, { status: 200 })
}
