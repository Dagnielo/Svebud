import Link from 'next/link'

export default function CookiepolicyPage() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--navy)', padding: '60px 24px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <Link href="/" style={{ fontSize: 13, color: 'var(--muted-custom)', textDecoration: 'none' }}>← Tillbaka</Link>

        <h1 style={{ fontSize: 28, fontWeight: 800, marginTop: 24, marginBottom: 32 }}>Cookiepolicy</h1>

        <Section title="Nödvändiga cookies">
          <Item label="Supabase auth" text="Session-cookies för inloggning (ej spårning)" />
          <Item label="Livslängd" text="Tills du loggar ut" />
        </Section>

        <Section title="Tredjepartscookies">
          <Item label="Stripe" text="Säkra betalningar (sätts endast vid checkout)" />
          <Item label="Inga" text="Google Analytics, Facebook Pixel eller andra spårare" />
        </Section>

        <Section title="Ditt val">
          <p style={{ fontSize: 14, color: 'var(--soft)', lineHeight: 1.7 }}>
            Du kan inte avaktivera nödvändiga cookies och fortfarande använda tjänsten.
            Stripe-cookies sätts endast när du väljer att betala.
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
