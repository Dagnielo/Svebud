import Link from 'next/link'

export default function IntegritetspolicyPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--navy)', padding: '60px 24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <Link href="/" style={{ fontSize: 13, color: 'var(--muted-custom)', textDecoration: 'none' }}>← Tillbaka</Link>

        <h1 style={{ fontSize: 28, fontWeight: 800, marginTop: 24, marginBottom: 32 }}>Integritetspolicy – SveBud</h1>

        <Section title="Vilka uppgifter samlar vi in?">
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <Li label="Kontaktuppgifter" text="E-post, namn, företag" />
            <Li label="Användningsdata" text="Inloggningar, funktionsanvändning" />
            <Li label="Anbudsdokument" text="PDF/Word-filer du laddar upp för analys" />
            <Li label="Betalningsdata" text="Hanteras av Stripe (vi sparar ej kortuppgifter)" />
          </ul>
        </Section>

        <Section title="Laglig grund (GDPR)">
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <Li label="Avtalsuppfyllelse" text="För att tillhandahålla tjänsten" />
            <Li label="Berättigat intresse" text="Förbättra produkten och säkerhet" />
          </ul>
        </Section>

        <Section title="Datalagring">
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <Li label="Plats" text="EU (Frankfurt) via Supabase" />
            <Li label="Tid" text="Så länge kontot är aktivt + 2 år, sedan raderas" />
            <Li label="Säkerhet" text="Kryptering, begränsad åtkomst, regelbundna backuper" />
          </ul>
        </Section>

        <Section title="Dina rättigheter (GDPR art. 15–22)">
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <Li label="Tillgång" text="Se vilka data vi har om dig" />
            <Li label="Rättelse" text="Korrigera felaktiga uppgifter" />
            <Li label="Radering" text="Rätt att bli glömd" />
            <Li label="Invändning" text="Säg nej till viss behandling" />
            <Li label="Portabilitet" text="Få ut dina data i maskinläsbart format" />
          </ul>
          <p style={{ fontSize: 14, color: 'var(--soft)', marginTop: 16 }}>
            <strong>Utöva rättigheter:</strong> support@svebud.se
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

function Li({ label, text }: { label: string; text: string }) {
  return (
    <li style={{ fontSize: 14, color: 'var(--soft)', marginBottom: 10, lineHeight: 1.6 }}>
      <strong style={{ color: 'var(--white)' }}>{label}:</strong> {text}
    </li>
  )
}
