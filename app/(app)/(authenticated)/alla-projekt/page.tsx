'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getPipelineKolumn, type Projekt } from '@/components/ProjektKort'
import { hämtaAnbudsläge, bedömningsVisning } from '@/lib/verdict'
import {
  FolderOpen,
  FileText,
  Warning,
  Fire,
  Calendar,
  CaretUp,
  CaretDown,
  CaretUpDown,
  MagnifyingGlass,
  ArrowRight,
} from '@phosphor-icons/react'

type AnbudInfo = {
  projekt_id: string
  kund_typ: string | null
  extraherad_data: Record<string, { värde: unknown }> | null
}

type SorteringNyckel = 'skapad' | 'värde' | 'deadline'
type SorteringOrdning = 'asc' | 'desc'

type AiStatus = {
  label: string
  färg: string
  bgFärg: string
  ärAnbudsläge: boolean
}

const kundTypLabel: Record<string, string> = {
  brf: 'BRF',
  konsument: 'Konsument',
  naringsidkare: 'Företag',
}

function formatKr(v: number | null): string {
  if (v == null || v === 0) return '—'
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)} M kr`
  if (v >= 1_000) return `${Math.round(v / 1_000)}k kr`
  return `${v.toLocaleString('sv-SE')} kr`
}

function formatteraDatumKort(datum: string): string {
  return new Date(datum).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
}

type DeadlineVisning = {
  text: string
  färg: string
  Ikon: typeof Calendar
}

function formatteraDeadline(deadline: string): DeadlineVisning {
  const dagar = Math.floor((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  if (dagar < 0) {
    return {
      text: `${Math.abs(dagar)}d försenad`,
      färg: 'var(--light-red)',
      Ikon: Warning,
    }
  }
  if (dagar <= 3) {
    return {
      text: dagar === 0 ? 'Idag' : dagar === 1 ? 'Imorgon' : `${dagar}d kvar`,
      färg: 'var(--light-red)',
      Ikon: Fire,
    }
  }
  if (dagar <= 7) {
    return {
      text: `${dagar}d kvar`,
      färg: 'var(--light-orange)',
      Ikon: Warning,
    }
  }
  return {
    text: `${dagar}d kvar`,
    färg: 'var(--light-t3)',
    Ikon: Calendar,
  }
}

function getAiStatus(p: Projekt): AiStatus {
  const kravmatch = p.kravmatchning
  const läge = kravmatch ? hämtaAnbudsläge(kravmatch) : null

  if (läge) {
    const v = bedömningsVisning(läge)
    return {
      label: v.kort,
      färg: v.färg,
      bgFärg: v.bgFärg,
      ärAnbudsläge: true,
    }
  }
  if (p.rekommendation_status === 'pågår') {
    return { label: 'Analyserar...', färg: 'var(--light-t3)', bgFärg: '', ärAnbudsläge: false }
  }
  if (p.analys_komplett) {
    return { label: 'Analyserad', färg: 'var(--light-t2)', bgFärg: '', ärAnbudsläge: false }
  }
  if (p.jämförelse_status === 'klar') {
    return { label: 'Analyserad', färg: 'var(--light-t2)', bgFärg: '', ärAnbudsläge: false }
  }
  return { label: 'Ej analyserad', färg: 'var(--light-t4)', bgFärg: '', ärAnbudsläge: false }
}

function SorterbarHeader({
  label,
  nyckel,
  aktivNyckel,
  ordning,
  onClick,
}: {
  label: string
  nyckel: SorteringNyckel
  aktivNyckel: SorteringNyckel
  ordning: SorteringOrdning
  onClick: (nyckel: SorteringNyckel) => void
}) {
  const aktiv = aktivNyckel === nyckel
  const Ikon = aktiv ? (ordning === 'asc' ? CaretUp : CaretDown) : CaretUpDown

  return (
    <button
      type="button"
      onClick={() => onClick(nyckel)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        fontSize: 'inherit',
        fontWeight: 'inherit',
        textTransform: 'inherit',
        letterSpacing: 'inherit',
        color: aktiv ? 'var(--light-t1)' : 'var(--light-t4)',
      }}
    >
      {label}
      <Ikon size={11} weight="bold" />
    </button>
  )
}

function PipelinePill({ kolumn }: { kolumn: string }) {
  const config: Record<string, { label: string; färg: string; bg: string }> = {
    inkorg: { label: 'Inkorg', färg: 'var(--light-amber)', bg: 'var(--light-amber-glow)' },
    under_arbete: { label: 'Under arbete', färg: 'var(--light-blue)', bg: 'var(--light-blue-bg)' },
    inskickat: { label: 'Inskickat', färg: 'var(--light-green)', bg: 'var(--light-green-bg)' },
    tilldelning: { label: 'Tilldelning', färg: 'var(--light-orange)', bg: 'var(--light-orange-bg)' },
  }
  const c = config[kolumn] ?? { label: kolumn, färg: 'var(--light-t3)', bg: 'var(--light-cream)' }

  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '.06em',
        padding: '3px 8px',
        borderRadius: 4,
        color: c.färg,
        background: c.bg,
      }}
    >
      {c.label}
    </span>
  )
}

function ProjektRad({
  projekt,
  värde,
  deadline,
  kundtyp,
  aiStatus,
  pipeline,
  anbudCount,
  ärSista,
}: {
  projekt: Projekt
  värde: number | null
  deadline: string | null
  kundtyp: string | null
  aiStatus: AiStatus
  pipeline: string
  anbudCount: number
  ärSista: boolean
}) {
  const router = useRouter()
  const [hover, setHover] = useState(false)

  const deadlineInfo = deadline ? formatteraDeadline(deadline) : null

  return (
    <div
      onClick={() => router.push(`/projekt/${projekt.id}`)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: '2fr 100px 130px 100px 130px 130px 90px 50px',
        padding: '14px 20px',
        borderBottom: ärSista ? 'none' : '1px solid var(--light-border)',
        background: hover ? 'var(--light-off)' : 'var(--light-bg)',
        cursor: 'pointer',
        alignItems: 'center',
        transition: 'background .1s ease',
        gap: 12,
      }}
    >
      {/* Projekt namn + dokumenträknare */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--light-t1)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {projekt.namn}
          </div>
          {projekt.beskrivning && (
            <div
              style={{
                fontSize: 12,
                color: 'var(--light-t4)',
                marginTop: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {projekt.beskrivning}
            </div>
          )}
        </div>
        {anbudCount > 0 && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: 11,
              color: 'var(--light-t3)',
              flexShrink: 0,
            }}
            title={`${anbudCount} dokument`}
          >
            <FileText size={12} weight="bold" />
            {anbudCount}
          </span>
        )}
      </div>

      {/* Värde */}
      <div
        style={{
          fontSize: 13,
          color: värde ? 'var(--light-t1)' : 'var(--light-t4)',
          fontWeight: värde ? 600 : 400,
        }}
      >
        {formatKr(värde)}
      </div>

      {/* Deadline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, minWidth: 0 }}>
        {deadlineInfo ? (
          <>
            <deadlineInfo.Ikon size={12} weight="bold" color={deadlineInfo.färg} />
            <span style={{ color: deadlineInfo.färg, fontWeight: 500, whiteSpace: 'nowrap' }}>
              {deadlineInfo.text}
            </span>
          </>
        ) : (
          <span style={{ color: 'var(--light-t4)' }}>—</span>
        )}
      </div>

      {/* Kundtyp */}
      <div style={{ fontSize: 13, color: kundtyp ? 'var(--light-t2)' : 'var(--light-t4)' }}>
        {kundtyp ?? '—'}
      </div>

      {/* AI-status — pill om anbudsläge, text om process-state */}
      <div>
        {aiStatus.ärAnbudsläge ? (
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '.06em',
              padding: '3px 8px',
              borderRadius: 4,
              color: aiStatus.färg,
              background: aiStatus.bgFärg,
            }}
          >
            {aiStatus.label}
          </span>
        ) : (
          <span style={{ fontSize: 12, color: aiStatus.färg }}>{aiStatus.label}</span>
        )}
      </div>

      {/* Pipeline-pill */}
      <div>
        <PipelinePill kolumn={pipeline} />
      </div>

      {/* Skapad */}
      <div style={{ fontSize: 12, color: 'var(--light-t3)' }}>
        {formatteraDatumKort(projekt.skapad)}
      </div>

      {/* Pil-ikon */}
      <div style={{ textAlign: 'right', color: 'var(--light-t4)' }}>
        <ArrowRight size={14} weight="bold" />
      </div>
    </div>
  )
}

export default function AllaProjektPage() {
  const [projekt, setProjekt] = useState<Projekt[]>([])
  const [anbudMap, setAnbudMap] = useState<Record<string, AnbudInfo>>({})
  const [anbudCount, setAnbudCount] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('alla')
  const [sök, setSök] = useState('')
  const [sortNyckel, setSortNyckel] = useState<SorteringNyckel>('skapad')
  const [sortOrdning, setSortOrdning] = useState<SorteringOrdning>('desc')
  const supabase = createClient()

  const hämtaData = useCallback(async () => {
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return

    const { data: projektData } = await supabase
      .from('projekt')
      .select('*')
      .eq('användar_id', authUser.id)
      .order('skapad', { ascending: false })

    if (projektData) setProjekt(projektData as unknown as Projekt[])

    const { data: anbudData } = await supabase
      .from('anbud')
      .select('projekt_id, kund_typ, extraherad_data')

    if (anbudData) {
      const map: Record<string, AnbudInfo> = {}
      const count: Record<string, number> = {}
      for (const a of anbudData as unknown as AnbudInfo[]) {
        map[a.projekt_id] = a
        count[a.projekt_id] = (count[a.projekt_id] ?? 0) + 1
      }
      setAnbudMap(map)
      setAnbudCount(count)
    }

    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    hämtaData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Closure-helpers (stänger över anbudMap)
  const getProjektVärde = (p: Projekt): number | null => {
    const v = anbudMap[p.id]?.extraherad_data?.['värde_kr']?.värde
    return typeof v === 'number' ? v : null
  }

  const getProjektDeadline = (p: Projekt): string | null => {
    if (p.deadline) return p.deadline
    const d = anbudMap[p.id]?.extraherad_data?.['sista_anbudsdag']?.värde
    return typeof d === 'string' ? d : null
  }

  const getKundtyp = (p: Projekt): string | null => {
    const kt = anbudMap[p.id]?.kund_typ
    if (!kt) return null
    return kundTypLabel[kt] ?? kt
  }

  function hanteraSortering(nyNyckel: SorteringNyckel) {
    if (sortNyckel === nyNyckel) {
      setSortOrdning(sortOrdning === 'asc' ? 'desc' : 'asc')
    } else {
      setSortNyckel(nyNyckel)
      setSortOrdning('desc')
    }
  }

  const filtreradeOchSorterade = useMemo(() => {
    const filtrerade = projekt.filter(p => {
      const kolumn = getPipelineKolumn(p)
      if (filter !== 'alla' && kolumn !== filter) return false
      if (sök.trim()) {
        const s = sök.toLowerCase()
        return (p.namn?.toLowerCase().includes(s) ?? false) ||
          (p.beskrivning?.toLowerCase().includes(s) ?? false)
      }
      return true
    })

    return [...filtrerade].sort((a, b) => {
      switch (sortNyckel) {
        case 'skapad': {
          const diff = new Date(a.skapad).getTime() - new Date(b.skapad).getTime()
          return sortOrdning === 'asc' ? diff : -diff
        }
        case 'värde': {
          const aV = getProjektVärde(a) ?? 0
          const bV = getProjektVärde(b) ?? 0
          const diff = aV - bV
          return sortOrdning === 'asc' ? diff : -diff
        }
        case 'deadline': {
          const aD = getProjektDeadline(a)
          const bD = getProjektDeadline(b)
          if (!aD && !bD) return 0
          if (!aD) return 1   // a alltid sist
          if (!bD) return -1  // b alltid sist
          const diff = new Date(aD).getTime() - new Date(bD).getTime()
          return sortOrdning === 'asc' ? diff : -diff
        }
        default:
          return 0
      }
    })
  }, [projekt, sök, filter, sortNyckel, sortOrdning, anbudMap]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ background: 'var(--light-cream)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div
        style={{
          background: 'var(--light-bg)',
          borderBottom: '1px solid var(--light-border)',
          boxShadow: '0 1px 3px rgba(14,27,46,.04)',
          padding: '24px 32px',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 24,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: 'var(--light-t1)',
              margin: 0,
              letterSpacing: '-.02em',
            }}
          >
            Alla projekt
          </h1>
          <div style={{ fontSize: 13, color: 'var(--light-t4)', marginTop: 4 }}>
            {filtreradeOchSorterade.length} av {projekt.length} projekt
          </div>
        </div>

        {/* Sökruta */}
        <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
          <MagnifyingGlass
            size={16}
            weight="bold"
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--light-t4)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Sök projektnamn eller beskrivning..."
            value={sök}
            onChange={(e) => setSök(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 38px',
              background: 'var(--light-bg)',
              border: '1px solid var(--light-border)',
              borderRadius: 8,
              fontSize: 13,
              color: 'var(--light-t1)',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Filter-rad */}
      <div
        style={{
          padding: '16px 32px',
          display: 'flex',
          gap: 6,
          flexWrap: 'wrap',
        }}
      >
        {[
          { värde: 'alla', label: 'Alla' },
          { värde: 'inkorg', label: 'Inkorg' },
          { värde: 'under_arbete', label: 'Under arbete' },
          { värde: 'inskickat', label: 'Inskickat' },
          { värde: 'tilldelning', label: 'Tilldelning' },
        ].map((f) => {
          const aktiv = filter === f.värde
          return (
            <button
              key={f.värde}
              type="button"
              onClick={() => setFilter(f.värde)}
              style={{
                padding: '8px 14px',
                fontSize: 13,
                fontWeight: 500,
                background: aktiv ? 'var(--light-amber-glow)' : 'var(--light-bg)',
                border: `1px solid ${aktiv ? 'var(--light-amber-border)' : 'var(--light-border)'}`,
                color: aktiv ? 'var(--light-amber)' : 'var(--light-t2)',
                borderRadius: 8,
                cursor: 'pointer',
                transition: 'all .12s ease',
              }}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      {/* Tabell */}
      <div style={{ padding: '0 32px 32px 32px', flex: 1 }}>
        {loading ? (
          <div className="animate-pulse" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{ height: 56, borderRadius: 8, background: 'var(--light-bg)' }} />
            ))}
          </div>
        ) : (
          <div
            style={{
              background: 'var(--light-bg)',
              border: '1px solid var(--light-border)',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 1px 2px rgba(14,27,46,.04)',
            }}
          >
            {/* Header-rad */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 100px 130px 100px 130px 130px 90px 50px',
                padding: '12px 20px',
                borderBottom: '1px solid var(--light-border)',
                background: 'var(--light-off)',
                fontSize: 11,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '.06em',
                color: 'var(--light-t4)',
                gap: 12,
              }}
            >
              <div>Projekt</div>
              <SorterbarHeader
                label="Värde"
                nyckel="värde"
                aktivNyckel={sortNyckel}
                ordning={sortOrdning}
                onClick={hanteraSortering}
              />
              <SorterbarHeader
                label="Deadline"
                nyckel="deadline"
                aktivNyckel={sortNyckel}
                ordning={sortOrdning}
                onClick={hanteraSortering}
              />
              <div>Kundtyp</div>
              <div>AI-status</div>
              <div>Pipeline</div>
              <SorterbarHeader
                label="Skapad"
                nyckel="skapad"
                aktivNyckel={sortNyckel}
                ordning={sortOrdning}
                onClick={hanteraSortering}
              />
              <div></div>
            </div>

            {filtreradeOchSorterade.length === 0 ? (
              <div style={{ padding: '64px 20px', textAlign: 'center' }}>
                <FolderOpen
                  size={48}
                  weight="bold"
                  color="var(--light-t4)"
                  style={{ marginBottom: 12 }}
                />
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--light-t2)', marginBottom: 4 }}>
                  Inga projekt matchar
                </div>
                <div style={{ fontSize: 13, color: 'var(--light-t4)' }}>
                  {sök ? 'Justera sökningen eller filtret' : 'Skapa ditt första projekt för att komma igång'}
                </div>
              </div>
            ) : (
              filtreradeOchSorterade.map((p, i) => (
                <ProjektRad
                  key={p.id}
                  projekt={p}
                  värde={getProjektVärde(p)}
                  deadline={getProjektDeadline(p)}
                  kundtyp={getKundtyp(p)}
                  aiStatus={getAiStatus(p)}
                  pipeline={getPipelineKolumn(p)}
                  anbudCount={anbudCount[p.id] ?? 0}
                  ärSista={i === filtreradeOchSorterade.length - 1}
                />
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
