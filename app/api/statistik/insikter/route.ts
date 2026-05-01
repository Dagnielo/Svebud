import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { parseClaudeJSON } from '@/lib/utils'
import type { Projekt as ProjektFull } from '@/lib/types/projekt'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const SYSTEM_PROMPT = `Du är en affärsanalytiker för svenska elfirmor.
Analysera dessa anbud-data och ge max 5 korta, konkreta insikter på svenska.
Format: JSON-array med { ikon, rubrik, text }. Basera BARA på faktisk data.
Om under 5 avslutade anbud: returnera tom array.`

const CACHE_TIMME_LIVSLÄNGD = 24
const FORCE_LIMIT_PER_DAG = 10

type Insikt = { ikon: string; rubrik: string; text: string }

type Projekt = Pick<
  ProjektFull,
  | 'id'
  | 'namn'
  | 'beskrivning'
  | 'tilldelning_status'
  | 'tilldelning_datum'
  | 'tilldelning_notering'
  | 'vinnande_pris'
  | 'skickat_datum'
  | 'pipeline_status'
  | 'skapad'
>


/** Returnerar ISO-sträng för 00:00 idag i Europe/Stockholm-tidzon. */
function stockholmDayStartIso(): string {
  const now = new Date()
  const dateStr = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Stockholm',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now)
  const offsetStr = new Intl.DateTimeFormat('en', {
    timeZone: 'Europe/Stockholm',
    timeZoneName: 'longOffset',
  }).formatToParts(now).find(p => p.type === 'timeZoneName')?.value
  const offset = offsetStr?.replace('GMT', '') || '+01:00'
  return `${dateStr}T00:00:00${offset}`
}

function sammanfattaProjekt(projekt: Projekt[]): string {
  const avslutade = projekt.filter(p => p.tilldelning_status === 'vunnet' || p.tilldelning_status === 'förlorat')
  return avslutade.map(p => {
    const namn = p.namn ?? '(namnlöst)'
    const utfall = p.tilldelning_status
    const pris = p.vinnande_pris ? `${p.vinnande_pris} kr` : 'pris ej angivet'
    const skickat = p.skickat_datum ? `skickat ${p.skickat_datum.slice(0, 10)}` : ''
    const beslut = p.tilldelning_datum ? `beslut ${p.tilldelning_datum.slice(0, 10)}` : ''
    const not = p.tilldelning_notering ? ` not: "${p.tilldelning_notering.slice(0, 200)}"` : ''
    const beskr = p.beskrivning ? ` (${p.beskrivning.slice(0, 100)})` : ''
    return `- ${namn}${beskr} | ${utfall} | ${pris} | ${skickat} ${beslut}${not}`
  }).join('\n')
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ fel: 'Ej inloggad' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const force = Boolean(body?.force)

  // Hämta avslutade anbud för user
  const { data: projektData } = await supabase
    .from('projekt')
    .select('id, namn, beskrivning, tilldelning_status, tilldelning_datum, tilldelning_notering, vinnande_pris, skickat_datum, pipeline_status, skapad')
    .eq('användar_id', user.id)

  const projekt = (projektData ?? []) as Projekt[]
  const antalAvslutade = projekt.filter(p =>
    p.tilldelning_status === 'vunnet' || p.tilldelning_status === 'förlorat'
  ).length

  // Hämta senaste cache-rad
  const { data: senasteCache } = await supabase
    .from('ai_insikter_cache')
    .select('*')
    .eq('användar_id', user.id)
    .order('skapad', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Returnera cached om < 24h gammal OCH samma antal avslutade och inte force
  if (!force && senasteCache) {
    const ålder = (Date.now() - new Date(senasteCache.skapad as string).getTime()) / (1000 * 60 * 60)
    const sammaAntal = senasteCache.antal_avslutade_anbud === antalAvslutade
    if (ålder < CACHE_TIMME_LIVSLÄNGD && sammaAntal) {
      return NextResponse.json({
        insikter: senasteCache.insikter as Insikt[],
        från_cache: true,
        skapad: senasteCache.skapad,
      })
    }
  }

  // Force-limit: max 10 force-genereringar per kalenderdag (Stockholm-tid)
  if (force) {
    const dagStart = stockholmDayStartIso()
    const { count } = await supabase
      .from('ai_insikter_cache')
      .select('*', { count: 'exact', head: true })
      .eq('användar_id', user.id)
      .eq('tvingad', true)
      .gte('skapad', dagStart)
    if ((count ?? 0) >= FORCE_LIMIT_PER_DAG) {
      return NextResponse.json(
        { fel: 'Daglig gräns nådd. Försök igen imorgon.' },
        { status: 429 }
      )
    }
  }

  // Anropa Claude
  let insikter: Insikt[] = []
  if (antalAvslutade >= 5) {
    const sammanfattning = sammanfattaProjekt(projekt)
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `Antal avslutade anbud: ${antalAvslutade}\n\nDATA:\n${sammanfattning}`,
      }],
    })
    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')
    try {
      insikter = parseClaudeJSON<Insikt[]>(text) ?? []
    } catch {
      insikter = []
    }
  }

  // Spara till cache
  await supabase.from('ai_insikter_cache').insert({
    användar_id: user.id,
    insikter,
    antal_avslutade_anbud: antalAvslutade,
    tvingad: force,
  })

  return NextResponse.json({
    insikter,
    från_cache: false,
    skapad: new Date().toISOString(),
  })
}
