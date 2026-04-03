'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Suspense } from 'react'

const planer = [
  {
    id: 'bas',
    namn: 'Bas',
    månad: 490,
    år: 4704,
    priceMonthly: 'price_1TIF1KQEdjSVrQk5vNrf0wH7',
    priceYearly: 'price_1TIF1LQEdjSVrQk5BGHs0Sg3',
    beskrivning: 'För ensamföretagare',
    funktioner: [
      '5 anbud per månad',
      '1 användare',
      'AI-analys & Go/No-Go',
      'AI-anbudsgenerering',
      'PDF-export med logotyp',
    ],
    saknas: ['Team-access', 'Mallar per uppdragstyp'],
    popular: false,
  },
  {
    id: 'pro',
    namn: 'Pro',
    månad: 1290,
    år: 12384,
    priceMonthly: 'price_1TIF1eQEdjSVrQk5BBnLBUat',
    priceYearly: 'price_1TIF1eQEdjSVrQk5ZUPjJMdo',
    beskrivning: 'För firmor med 5–15 montörer',
    funktioner: [
      'Obegränsade anbud',
      'Upp till 3 användare',
      'Allt i Bas',
      'Mallar per uppdragstyp',
      'Win/Loss-statistik',
      'Versionhantering',
      'Support inom 24h',
    ],
    saknas: [],
    popular: true,
  },
  {
    id: 'business',
    namn: 'Business',
    månad: 2990,
    år: 28704,
    priceMonthly: 'price_1TIF1gQEdjSVrQk5btTLvKNJ',
    priceYearly: 'price_1TIF1hQEdjSVrQk51zXJNym7',
    beskrivning: 'För firmor med 15–50 montörer',
    funktioner: [
      'Obegränsade anbud',
      'Upp till 10 användare',
      'Allt i Pro',
      'Roller & behörigheter',
      'Custom anbudslayout',
      'Onboarding-samtal ingår',
      'Support inom 4h',
    ],
    saknas: [],
    popular: false,
  },
]

const tierOrder = ['trial', 'bas', 'pro', 'business']

function PriserInner() {
  const [årlig, setÅrlig] = useState(false)
  const [nuvarandeTier, setNuvarandeTier] = useState('trial')
  const [laddar, setLaddar] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  const cancelled = searchParams.get('cancelled')

  useEffect(() => {
    async function hämta() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profil } = await supabase
        .from('profiler')
        .select('tier')
        .eq('id', user.id)
        .single()
      if (profil) setNuvarandeTier((profil as Record<string, unknown>).tier as string ?? 'trial')
    }
    hämta()
  }, [])

  async function checkout(plan: typeof planer[0]) {
    setLaddar(plan.id)
    const priceId = årlig ? plan.priceYearly : plan.priceMonthly
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, tier: plan.id }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else if (data.fel === 'Ej inloggad') {
        router.push('/login')
      }
    } catch {
      router.push('/login')
    }
    setLaddar(null)
  }

  function getKnappText(planId: string) {
    const nuIdx = tierOrder.indexOf(nuvarandeTier)
    const planIdx = tierOrder.indexOf(planId)
    if (planId === nuvarandeTier) return 'Nuvarande plan'
    if (planIdx > nuIdx) return 'Uppgradera'
    return 'Nedgradera'
  }

  function getKnappDisabled(planId: string) {
    return planId === nuvarandeTier
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--navy)', padding: '60px 24px' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center" style={{ marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 12 }}>
            Välj din plan
          </h1>
          <p style={{ fontSize: 15, color: 'var(--muted-custom)' }}>
            14 dagars gratis trial · Inget kreditkort · Avbryt när som helst
          </p>
        </div>

        {/* Cancelled banner */}
        {cancelled && (
          <div
            style={{
              background: 'var(--orange-bg)',
              color: 'var(--orange)',
              padding: '14px 18px',
              borderRadius: 10,
              marginBottom: 24,
              fontSize: 14,
              fontWeight: 500,
              textAlign: 'center',
            }}
          >
            Du avbröt betalningen. Inga pengar har dragits.
          </div>
        )}

        {/* Toggle */}
        <div className="flex items-center justify-center gap-3" style={{ marginBottom: 32 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: !årlig ? 'var(--white)' : 'var(--muted-custom)',
            }}
          >
            Månadsvis
          </span>
          <button
            onClick={() => setÅrlig(!årlig)}
            style={{
              width: 48,
              height: 26,
              borderRadius: 13,
              background: årlig ? 'var(--yellow)' : 'var(--steel)',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.2s',
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: 'white',
                position: 'absolute',
                top: 3,
                left: årlig ? 25 : 3,
                transition: 'left 0.2s',
              }}
            />
          </button>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: årlig ? 'var(--white)' : 'var(--muted-custom)',
            }}
          >
            Årsvis
          </span>
          {årlig && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                background: 'var(--green-bg)',
                color: 'var(--green)',
                padding: '3px 8px',
                borderRadius: 20,
              }}
            >
              Spara 20%
            </span>
          )}
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {planer.map(plan => (
            <div
              key={plan.id}
              style={{
                background: 'var(--navy-mid)',
                border: `1px solid ${plan.popular ? 'var(--yellow)' : 'var(--navy-border)'}`,
                borderRadius: 16,
                padding: '28px 24px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {plan.popular && (
                <>
                  <div
                    className="absolute top-0 left-0 right-0"
                    style={{ height: 2, background: 'var(--yellow)' }}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      background: 'var(--yellow-glow)',
                      color: 'var(--yellow)',
                      padding: '3px 10px',
                      borderRadius: 20,
                      border: '1px solid rgba(245,196,0,0.3)',
                      display: 'inline-block',
                      marginBottom: 12,
                    }}
                  >
                    ⭐ Mest populär
                  </span>
                </>
              )}

              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>
                {plan.namn}
              </div>

              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.03em' }}>
                  {årlig
                    ? Math.round(plan.år / 12).toLocaleString('sv-SE')
                    : plan.månad.toLocaleString('sv-SE')}
                </span>
                <span style={{ fontSize: 14, color: 'var(--muted-custom)', marginLeft: 4 }}>
                  kr/mån{årlig ? ' · årsvis' : ''}
                </span>
              </div>

              {årlig && (
                <div style={{ fontSize: 12, color: 'var(--muted-custom)', marginBottom: 12 }}>
                  {plan.år.toLocaleString('sv-SE')} kr/år
                </div>
              )}

              <p style={{ fontSize: 13, color: 'var(--muted-custom)', marginBottom: 20 }}>
                {plan.beskrivning}
              </p>

              <ul style={{ listStyle: 'none', padding: 0, marginBottom: 24 }}>
                {plan.funktioner.map(f => (
                  <li
                    key={f}
                    className="flex items-center gap-2"
                    style={{ fontSize: 13, marginBottom: 8, color: 'var(--soft)' }}
                  >
                    <span style={{ color: 'var(--green)', fontSize: 12 }}>✓</span>
                    {f}
                  </li>
                ))}
                {plan.saknas.map(f => (
                  <li
                    key={f}
                    className="flex items-center gap-2"
                    style={{ fontSize: 13, marginBottom: 8, color: 'var(--slate)' }}
                  >
                    <span style={{ fontSize: 12 }}>—</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => checkout(plan)}
                disabled={getKnappDisabled(plan.id) || laddar === plan.id}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: 8,
                  border: 'none',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: getKnappDisabled(plan.id) ? 'default' : 'pointer',
                  background: plan.popular
                    ? 'var(--yellow)'
                    : getKnappDisabled(plan.id)
                      ? 'var(--steel)'
                      : 'var(--navy-light)',
                  color: plan.popular ? 'var(--navy)' : 'var(--white)',
                  opacity: getKnappDisabled(plan.id) ? 0.5 : 1,
                }}
              >
                {laddar === plan.id
                  ? 'Laddar...'
                  : getKnappText(plan.id)}
              </button>
            </div>
          ))}
        </div>

        <p
          className="text-center"
          style={{ fontSize: 12, color: 'var(--muted-custom)', marginTop: 20 }}
        >
          14 dagar gratis på Bas · Inget kreditkort · Avbryt när som helst · Moms tillkommer
        </p>
      </div>
    </div>
  )
}

export default function PriserPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ background: 'var(--navy)' }} />}>
      <PriserInner />
    </Suspense>
  )
}
