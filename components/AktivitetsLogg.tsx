'use client'

export type LoggRad = {
  id: string
  steg: string
  status: string
  meddelande: string | null
  skapad: string
}

type AktivitetsLoggProps = {
  logg: LoggRad[]
  max?: number
}

export default function AktivitetsLogg({ logg, max = 5 }: AktivitetsLoggProps) {
  if (logg.length === 0) {
    return <div style={{ fontSize: 12, color: 'var(--slate)' }}>Ingen aktivitet ännu</div>
  }

  return (
    <>
      {logg.slice(0, max).map(l => (
        <div
          key={l.id}
          className="flex gap-2.5"
          style={{ fontSize: 12, color: 'var(--muted-custom)', marginBottom: 10 }}
        >
          <span className="font-mono flex-shrink-0" style={{ fontSize: 10, marginTop: 1 }}>
            {new Date(l.skapad).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span style={{ color: 'var(--soft)' }}>
            {l.meddelande ?? `${l.steg}: ${l.status}`}
          </span>
        </div>
      ))}
    </>
  )
}
