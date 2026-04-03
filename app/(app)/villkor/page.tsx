import Link from 'next/link'

export default function VillkorPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--navy)', padding: '60px 24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <Link href="/" style={{ fontSize: 13, color: 'var(--muted-custom)', textDecoration: 'none' }}>← Tillbaka</Link>

        <h1 style={{ fontSize: 28, fontWeight: 800, marginTop: 24, marginBottom: 32 }}>Användarvillkor</h1>

        <Section title="Tjänstens syfte">
          <p style={{ fontSize: 14, color: 'var(--soft)', lineHeight: 1.7 }}>
            SveBud är ett analysverktyg för anbud inom elbranschen.
            Vi ger <strong style={{ color: 'var(--white)' }}>inga juridiska råd</strong> – alla beslut fattar du själv.
          </p>
        </Section>

        <Section title="Användaransvar">
          <Item label="Korrekt information" text="Du ansvarar för dokument du laddar upp" />
          <Item label="Beslut" text="AI:n ger förslag, du fattar affärsbeslut" />
          <Item label="Certifikat" text="Du ansvarar för att dina auktorisationer är giltiga" />
        </Section>

        <Section title="Prenumeration">
          <Item label="Betalning" text="Månadsvis/årsvis, automatisk förnyelse" />
          <Item label="Uppsägning" text="När som helst i appen, upphör nästa period" />
          <Item label="Ångerrätt" text="14 dagar för nya kunder (ej om tjänsten använts)" />
        </Section>

        <Section title="Ansvarsbegränsning">
          <p style={{ fontSize: 14, color: 'var(--soft)', lineHeight: 1.7, marginBottom: 12 }}>
            SveBud ansvarar ej för:
          </p>
          <ul style={{ listStyle: 'disc', paddingLeft: 20 }}>
            <li style={{ fontSize: 14, color: 'var(--soft)', marginBottom: 6 }}>Beslut baserade på AI-analyser</li>
            <li style={{ fontSize: 14, color: 'var(--soft)', marginBottom: 6 }}>Förlorade affärer eller projekt</li>
            <li style={{ fontSize: 14, color: 'var(--soft)', marginBottom: 6 }}>Tekniska störningar utanför vår kontroll</li>
          </ul>
          <p style={{ fontSize: 14, color: 'var(--soft)', marginTop: 16 }}>
            <strong style={{ color: 'var(--white)' }}>Support:</strong> support@svebud.se
          </p>
        </Section>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14, color: 'var(--white)' }}>{title}</h2>
      {children}
    </div>
  )
}

function Item({ label, text }: { label: string; text: string }) {
  return (
    <p style={{ fontSize: 14, color: 'var(--soft)', marginBottom: 10, lineHeight: 1.6 }}>
      <strong style={{ color: 'var(--white)' }}>{label}:</strong> {text}
    </p>
  )
}
