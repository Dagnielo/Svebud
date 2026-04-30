'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { posthog } from '@/lib/posthog'

export type UppföljningState =
  | 'anbud_skickat'
  | 'påminnelse_1_schemalagd'
  | 'påminnelse_1_skickad'
  | 'påminnelse_2_schemalagd'
  | 'påminnelse_2_skickad'
  | 'svar_mottaget'
  | 'vunnet'
  | 'förlorat'
  | 'avbrutet'

export type UppföljningUtfall = 'vunnet' | 'förlorat' | 'inget_svar' | null

export type Uppföljning = {
  id: string
  projekt_id: string
  anbud_id: string | null
  state: UppföljningState
  sista_anbudsdag: string | null
  nästa_åtgärd: string | null
  nästa_åtgärd_typ: string | null
  påminnelse_1_skickad: string | null
  påminnelse_2_skickad: string | null
  svar_datum: string | null
  svar_text: string | null
  utfall: UppföljningUtfall
  utfall_kommentar: string | null
  skapad: string
  uppdaterad: string
  projekt_namn: string
  projekt_sista_anbudsdag: string | null
}

export type UtfallInput = 'vunnet' | 'förlorat' | 'avbrutet'

const TERMINALA_STATES: ReadonlySet<UppföljningState> = new Set([
  'vunnet',
  'förlorat',
  'avbrutet',
])

type ProjektRad = {
  id: string
  namn: string | null
  sista_anbudsdag: string | null
}

type UppföljningRad = Omit<
  Uppföljning,
  'projekt_namn' | 'projekt_sista_anbudsdag'
>

function jämförAktiva(a: Uppföljning, b: Uppföljning, nu: number): number {
  const tA = a.nästa_åtgärd ? Date.parse(a.nästa_åtgärd) : null
  const tB = b.nästa_åtgärd ? Date.parse(b.nästa_åtgärd) : null
  const förfallenA = tA !== null && tA <= nu
  const förfallenB = tB !== null && tB <= nu

  if (förfallenA && !förfallenB) return -1
  if (!förfallenA && förfallenB) return 1

  if (tA === null && tB === null) return 0
  if (tA === null) return 1
  if (tB === null) return -1
  return tA - tB
}

export function useUppföljningar() {
  const [uppföljningar, setUppföljningar] = useState<Uppföljning[]>([])
  const [loading, setLoading] = useState(true)
  const [fel, setFel] = useState<string | null>(null)
  const supabase = createClient()

  const omLäs = useCallback(async () => {
    setLoading(true)
    setFel(null)

    const { data: rows, error: e1 } = await supabase
      .from('uppföljning')
      .select('*')
      .order('skapad', { ascending: false })

    if (e1) {
      setFel(e1.message)
      setLoading(false)
      return
    }

    const uppfRader = (rows ?? []) as UppföljningRad[]
    const projektIds = Array.from(new Set(uppfRader.map(u => u.projekt_id)))

    let projektMap = new Map<string, ProjektRad>()
    if (projektIds.length > 0) {
      const { data: projektRader, error: e2 } = await supabase
        .from('projekt')
        .select('id, namn, sista_anbudsdag')
        .in('id', projektIds)

      if (e2) {
        setFel(e2.message)
        setLoading(false)
        return
      }

      projektMap = new Map(
        ((projektRader ?? []) as ProjektRad[]).map(p => [p.id, p])
      )
    }

    const sammansatta: Uppföljning[] = uppfRader.map(u => {
      const p = projektMap.get(u.projekt_id)
      return {
        ...u,
        projekt_namn: p?.namn ?? 'Okänt projekt',
        projekt_sista_anbudsdag: p?.sista_anbudsdag ?? null,
      }
    })

    const nu = Date.now()
    const aktiva: Uppföljning[] = []
    const avslutade: Uppföljning[] = []
    for (const u of sammansatta) {
      if (TERMINALA_STATES.has(u.state)) avslutade.push(u)
      else aktiva.push(u)
    }
    aktiva.sort((a, b) => jämförAktiva(a, b, nu))
    avslutade.sort(
      (a, b) => Date.parse(b.uppdaterad) - Date.parse(a.uppdaterad)
    )

    setUppföljningar([...aktiva, ...avslutade])
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    omLäs()
  }, [omLäs])

  const uppdateraUtfall = useCallback(
    async (id: string, utfall: UtfallInput) => {
      const rad = uppföljningar.find(u => u.id === id)
      if (!rad) {
        setFel('Hittade inte uppföljningen.')
        return
      }
      const från_state = rad.state
      const nyState: UppföljningState = utfall === 'avbrutet' ? 'avbrutet' : utfall
      const nyUtfall: UppföljningUtfall =
        utfall === 'avbrutet' ? 'inget_svar' : utfall

      const { error: e1 } = await supabase
        .from('uppföljning')
        .update({ state: nyState, utfall: nyUtfall })
        .eq('id', id)

      if (e1) {
        setFel(e1.message)
        return
      }

      if (utfall === 'vunnet' || utfall === 'förlorat') {
        const { error: e2 } = await supabase
          .from('projekt')
          .update({
            tilldelning_status: utfall,
            pipeline_status: 'tilldelning',
            tilldelning_datum: new Date().toISOString(),
          })
          .eq('id', rad.projekt_id)

        if (e2) {
          setFel(`Uppföljning uppdaterad men projekt failade: ${e2.message}`)
          await omLäs()
          return
        }
      }

      posthog.capture('uppföljning_utfall_markerat', {
        utfall,
        från_state,
        projektId: rad.projekt_id,
      })

      await omLäs()
    },
    [uppföljningar, supabase, omLäs]
  )

  return { uppföljningar, loading, fel, uppdateraUtfall, omLäs }
}
