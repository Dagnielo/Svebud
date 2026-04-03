'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type Krav = {
  krav: string
  typ: 'ska' | 'bör'
  uppfyllt: boolean | null
  konfidens: number
  kommentar: string
  källa: string
}

type KravmatchData = {
  sammanfattning: string
  go_no_go: 'GO' | 'NO-GO' | 'GO_MED_RESERVATION'
  ska_krav: Krav[]
  bör_krav: Krav[]
  saknade_certifikat: string[]
  matchade_certifikat: string[]
  matchad_erfarenhet: string[]
  risker: string[]
  möjligheter: string[]
  rekommendation: string
}

type Props = {
  projektId: string
  data?: KravmatchData | null
  onKörMatchning?: () => void
  laddar?: boolean
}

function GoNoGoBadge({ beslut }: { beslut: string }) {
  const config = {
    GO: { bg: 'var(--green-bg)', color: 'var(--green)', text: 'GO – Lämna anbud' },
    'NO-GO': { bg: 'var(--red-bg)', color: 'var(--red)', text: 'NO-GO – Avvakta' },
    GO_MED_RESERVATION: { bg: 'var(--orange-bg)', color: 'var(--orange)', text: 'GO MED RESERVATION' },
  }[beslut] ?? { bg: 'var(--steel)', color: 'var(--muted-custom)', text: beslut }

  return (
    <span style={{ fontSize: 12, fontWeight: 800, padding: '5px 12px', borderRadius: 6, background: config.bg, color: config.color }}>
      {config.text}
    </span>
  )
}

function KravRad({ krav }: { krav: Krav }) {
  return (
    <div
      className="flex items-start gap-3"
      style={{
        padding: '10px 14px',
        borderBottom: '1px solid var(--navy-border)',
        fontSize: 13,
      }}
    >
      <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>
        {krav.uppfyllt === true ? '✅' : krav.uppfyllt === false ? '❌' : '❓'}
      </span>
      <div className="flex-1">
        <div style={{ fontWeight: 600, color: 'var(--white)' }}>{krav.krav}</div>
        <div style={{ fontSize: 12, color: 'var(--muted-custom)', marginTop: 2 }}>{krav.kommentar}</div>
        {krav.källa && (
          <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 2 }}>Källa: {krav.källa}</div>
        )}
      </div>
      <Badge
        style={{
          fontSize: 10,
          background: krav.typ === 'ska' ? 'var(--red-bg)' : 'var(--yellow-glow)',
          color: krav.typ === 'ska' ? 'var(--red)' : 'var(--yellow)',
          border: 'none',
        }}
      >
        {krav.typ === 'ska' ? 'SKA-KRAV' : 'BÖR-KRAV'}
      </Badge>
    </div>
  )
}

export default function JämförelseVy({ projektId, data, onKörMatchning, laddar }: Props) {
  if (!data) {
    return (
      <div
        style={{
          background: 'var(--navy-mid)',
          border: '1px solid var(--navy-border)',
          borderRadius: 12,
          padding: '32px 18px',
          textAlign: 'center',
        }}
      >
        <p style={{ fontSize: 14, color: 'var(--muted-custom)', marginBottom: 16 }}>
          Ladda upp förfrågningsunderlaget och kör AI-analys för att matcha kraven mot er företagsprofil.
        </p>
        <Button
          onClick={onKörMatchning}
          disabled={laddar}
          style={{ background: 'var(--yellow)', color: 'var(--navy)' }}
        >
          {laddar ? 'Analyserar krav...' : '⚡ Kör kravmatchning'}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Go/No-Go */}
      <div
        style={{
          background: 'var(--navy-mid)',
          border: `1px solid ${data.go_no_go === 'GO' ? 'rgba(0,198,122,0.3)' : data.go_no_go === 'NO-GO' ? 'rgba(255,77,77,0.3)' : 'rgba(255,140,66,0.3)'}`,
          borderRadius: 12,
          padding: '18px 20px',
        }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 800 }}>Bedömning</span>
          <GoNoGoBadge beslut={data.go_no_go} />
        </div>
        <p style={{ fontSize: 13, color: 'var(--soft)', lineHeight: 1.6 }}>{data.sammanfattning}</p>
        <p style={{ fontSize: 13, color: 'var(--soft)', lineHeight: 1.6, marginTop: 8 }}>{data.rekommendation}</p>
      </div>

      {/* Ska-krav */}
      <Card style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)' }}>
        <CardHeader style={{ borderBottom: '1px solid var(--navy-border)', padding: '14px 18px' }}>
          <CardTitle className="flex items-center justify-between" style={{ fontSize: 14 }}>
            <span>Ska-krav ({data.ska_krav.filter(k => k.uppfyllt).length}/{data.ska_krav.length} uppfyllda)</span>
            <Badge style={{ background: 'var(--red-bg)', color: 'var(--red)', border: 'none', fontSize: 10 }}>
              Obligatoriska
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent style={{ padding: 0 }}>
          {data.ska_krav.map((k, i) => <KravRad key={i} krav={k} />)}
        </CardContent>
      </Card>

      {/* Bör-krav */}
      {data.bör_krav.length > 0 && (
        <Card style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)' }}>
          <CardHeader style={{ borderBottom: '1px solid var(--navy-border)', padding: '14px 18px' }}>
            <CardTitle className="flex items-center justify-between" style={{ fontSize: 14 }}>
              <span>Bör-krav ({data.bör_krav.filter(k => k.uppfyllt).length}/{data.bör_krav.length} uppfyllda)</span>
              <Badge style={{ background: 'var(--yellow-glow)', color: 'var(--yellow)', border: 'none', fontSize: 10 }}>
                Meriterande
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent style={{ padding: 0 }}>
            {data.bör_krav.map((k, i) => <KravRad key={i} krav={k} />)}
          </CardContent>
        </Card>
      )}

      {/* Certifikat-matchning */}
      <div className="grid grid-cols-2 gap-4">
        <Card style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)' }}>
          <CardHeader style={{ padding: '14px 18px' }}>
            <CardTitle style={{ fontSize: 13 }}>Matchade certifikat</CardTitle>
          </CardHeader>
          <CardContent>
            {data.matchade_certifikat.length === 0
              ? <p style={{ fontSize: 12, color: 'var(--slate)' }}>Inga matchade</p>
              : data.matchade_certifikat.map((c, i) => (
                  <div key={i} className="flex items-center gap-2" style={{ fontSize: 12, marginBottom: 6 }}>
                    <span style={{ color: 'var(--green)' }}>✓</span>
                    <span style={{ color: 'var(--soft)' }}>{c}</span>
                  </div>
                ))
            }
          </CardContent>
        </Card>

        <Card style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)' }}>
          <CardHeader style={{ padding: '14px 18px' }}>
            <CardTitle style={{ fontSize: 13 }}>Saknade certifikat</CardTitle>
          </CardHeader>
          <CardContent>
            {data.saknade_certifikat.length === 0
              ? <p style={{ fontSize: 12, color: 'var(--green)' }}>Alla krav uppfyllda!</p>
              : data.saknade_certifikat.map((c, i) => (
                  <div key={i} className="flex items-center gap-2" style={{ fontSize: 12, marginBottom: 6 }}>
                    <span style={{ color: 'var(--red)' }}>✗</span>
                    <span style={{ color: 'var(--soft)' }}>{c}</span>
                  </div>
                ))
            }
          </CardContent>
        </Card>
      </div>

      {/* Risker & möjligheter */}
      <div className="grid grid-cols-2 gap-4">
        {data.risker.length > 0 && (
          <Card style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)' }}>
            <CardHeader style={{ padding: '14px 18px' }}>
              <CardTitle style={{ fontSize: 13, color: 'var(--orange)' }}>Risker</CardTitle>
            </CardHeader>
            <CardContent>
              {data.risker.map((r, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--soft)', marginBottom: 6 }}>• {r}</div>
              ))}
            </CardContent>
          </Card>
        )}
        {data.möjligheter.length > 0 && (
          <Card style={{ background: 'var(--navy-mid)', border: '1px solid var(--navy-border)' }}>
            <CardHeader style={{ padding: '14px 18px' }}>
              <CardTitle style={{ fontSize: 13, color: 'var(--green)' }}>Möjligheter</CardTitle>
            </CardHeader>
            <CardContent>
              {data.möjligheter.map((m, i) => (
                <div key={i} style={{ fontSize: 12, color: 'var(--soft)', marginBottom: 6 }}>• {m}</div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
