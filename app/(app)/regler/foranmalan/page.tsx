import { FORANMALAN_JOBBTYPER } from '@/lib/foranmalan-regler'

export const metadata = {
  title: 'Vilka elarbeten kräver föranmälan? | SveBud',
  description: 'Komplett lista över elinstallationer som kräver föranmälan till nätbolaget per ELNÄT 2025 K. Uppdaterad januari 2026.'
}

export default function ForanmalanRegler() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--navy)', padding: '40px 24px' }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.02em' }}>
            Vilka elarbeten kräver föranmälan?
          </h1>
          <p style={{ fontSize: 14, color: 'var(--muted-custom)', lineHeight: 1.7 }}>
            Enligt <strong style={{ color: 'var(--white)' }}>ELNÄT 2025 K punkt 5.9</strong> (gäller fr.o.m. 1 januari 2026)
            ska alla elinstallationer som innebär en väsentlig förändring av kundens anläggning
            föranmälas till nätbolaget — och <em>godkännas</em> innan arbetet får påbörjas.
            Anmälan görs av elfirman, inte kunden.
          </p>
          <a
            href="https://www.elinstallatoren.se/2026/01/nu-behover-laddbox-och-varmepump-foranmalas-och-godkannas/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 13, color: 'var(--blue-accent)', textDecoration: 'none', marginTop: 8, display: 'inline-block' }}
          >
            Källa: Elinstallatören.se — ELNÄT 2025 K ↗
          </a>
        </div>

        <div
          style={{
            background: 'var(--navy-mid)',
            border: '1px solid var(--navy-border)',
            borderRadius: 12,
            overflow: 'hidden',
          }}
        >
          {FORANMALAN_JOBBTYPER.map((jobb, i) => (
            <div
              key={jobb.id}
              className="flex items-start gap-4"
              style={{
                padding: '16px 20px',
                borderBottom: i < FORANMALAN_JOBBTYPER.length - 1 ? '1px solid var(--navy-border)' : 'none',
              }}
            >
              <span style={{ fontSize: 24, flexShrink: 0, marginTop: 2 }}>{jobb.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{jobb.label}</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: 20,
                      background: jobb.kravs ? 'var(--red-bg)' : 'var(--green-bg)',
                      color: jobb.kravs ? 'var(--red)' : 'var(--green)',
                    }}
                  >
                    {jobb.kravs ? '⚠ Föranmälan krävs' : '✓ Ej föranmälan'}
                  </span>
                  {jobb.typiskHandlaggningstid && (
                    <span style={{ fontSize: 11, color: 'var(--slate)' }}>
                      {jobb.typiskHandlaggningstid}
                    </span>
                  )}
                </div>
                <p style={{ fontSize: 12, color: 'var(--muted-custom)', marginTop: 4, lineHeight: 1.6 }}>
                  {jobb.notering}
                </p>
                {jobb.regelLank && (
                  <a
                    href={jobb.regelLank}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontSize: 11, color: 'var(--blue-accent)', textDecoration: 'none', marginTop: 4, display: 'inline-block' }}
                  >
                    Läs regeln ↗
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        <p style={{ fontSize: 11, color: 'var(--slate)', marginTop: 16, borderTop: '1px solid var(--navy-border)', paddingTop: 16 }}>
          Senast uppdaterad: januari 2026 · Regler kan ändras — kontrollera alltid med
          ditt nätbolag. Källa: ELNÄT 2025 K av Energiföretagen Sverige och Konsumentverket.
        </p>
      </div>
    </div>
  )
}
