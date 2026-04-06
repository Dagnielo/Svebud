'use client'

type Props = {
  antalExtraherade: number
  jämförelseStatus: string
  rekommendationStatus: string
  antalAktivaBrev: number
}

type StegStatus = 'klar' | 'aktivt' | 'väntar' | 'åtgärd'

function getStegStatus(props: Props): Array<{ label: string; icon: string; status: StegStatus }> {
  const { antalExtraherade, jämförelseStatus, rekommendationStatus, antalAktivaBrev } = props

  return [
    {
      label: 'Dokument',
      icon: '📄',
      status: antalExtraherade >= 1 ? 'klar' : 'väntar',
    },
    {
      label: 'Extraktion',
      icon: '🔍',
      status: antalExtraherade >= 2 ? 'klar' : antalExtraherade === 1 ? 'aktivt' : 'väntar',
    },
    {
      label: 'Jämförelse',
      icon: '⚖️',
      status:
        jämförelseStatus === 'klar' ? 'klar' :
        jämförelseStatus === 'pågår' ? 'aktivt' : 'väntar',
    },
    {
      label: 'Rekommendation',
      icon: '🎯',
      status:
        rekommendationStatus === 'klar' ? 'klar' :
        rekommendationStatus === 'pågår' ? 'aktivt' : 'väntar',
    },
    {
      label: 'Uppföljning',
      icon: '📬',
      status: antalAktivaBrev > 0 ? 'åtgärd' : rekommendationStatus === 'klar' ? 'klar' : 'väntar',
    },
  ]
}

const statusColors: Record<StegStatus, string> = {
  klar: 'var(--green)',
  aktivt: 'var(--yellow)',
  väntar: 'var(--steel)',
  åtgärd: 'var(--red)',
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" className="animate-spin">
      <circle cx="7" cy="7" r="5.5" fill="none" stroke="var(--yellow)" strokeWidth="2" strokeDasharray="20 12" />
    </svg>
  )
}

export default function AgentStatusBar(props: Props) {
  const steg = getStegStatus(props)

  return (
    <div
      className="flex items-center"
      style={{
        background: 'var(--navy-mid)',
        border: '1px solid var(--navy-border)',
        borderRadius: 12,
        padding: '14px 20px',
        gap: 0,
      }}
    >
      {steg.map((s, i) => (
        <div key={s.label} className="flex items-center" style={{ flex: 1 }}>
          {/* Step */}
          <div className="flex items-center gap-2">
            <div
              className="flex items-center justify-center"
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                border: `2px solid ${statusColors[s.status]}`,
                background: s.status === 'klar' ? statusColors[s.status] : 'transparent',
                flexShrink: 0,
              }}
            >
              {s.status === 'klar' ? (
                <span style={{ fontSize: 12, color: 'var(--navy)' }}>✓</span>
              ) : s.status === 'aktivt' ? (
                <Spinner />
              ) : s.status === 'åtgärd' ? (
                <span style={{ fontSize: 10, color: 'var(--red)' }}>!</span>
              ) : (
                <span style={{ fontSize: 11 }}>{s.icon}</span>
              )}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: statusColors[s.status] }}>
                {s.label}
              </div>
              <div style={{ fontSize: 9, color: 'var(--muted-custom)' }}>
                {s.status === 'klar' ? 'Klar' : s.status === 'aktivt' ? 'Pågår...' : s.status === 'åtgärd' ? 'Åtgärd krävs' : 'Väntar'}
              </div>
            </div>
          </div>

          {/* Connector */}
          {i < steg.length - 1 && (
            <div
              className="flex-1 mx-2"
              style={{
                height: 2,
                background: s.status === 'klar' ? 'var(--green)' : 'var(--steel)',
                minWidth: 12,
              }}
            />
          )}
        </div>
      ))}
    </div>
  )
}
