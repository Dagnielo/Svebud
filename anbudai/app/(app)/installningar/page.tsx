'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Sidebar from '@/components/Sidebar'
import { Button } from '@/components/ui/button'

type UserProfil = {
  fullnamn: string | null
  företag: string | null
  tier: string | null
  initialer: string
}

const tierInfo: Record<string, { namn: string; färg: string; beskrivning: string }> = {
  trial: { namn: 'Prov', färg: 'var(--muted-custom)', beskrivning: 'Gratisperiod – begränsad funktionalitet' },
  starter: { namn: 'Starter', färg: 'var(--blue-accent)', beskrivning: 'Upp till 5 projekt/månad' },
  pro: { namn: 'Pro', färg: 'var(--yellow)', beskrivning: 'Obegränsade projekt + prioriterad AI-analys' },
  enterprise: { namn: 'Enterprise', färg: 'var(--green)', beskrivning: 'Anpassad lösning med teamfunktioner' },
}

export default function InstallningarPage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<UserProfil | null>(null)
  const [epost, setEpost] = useState('')
  const [tier, setTier] = useState('trial')
  const [sparar, setSparar] = useState(false)
  const [sparat, setSparat] = useState(false)
  const [nyttLösenord, setNyttLösenord] = useState('')
  const [bekräftaLösenord, setBekräftaLösenord] = useState('')
  const [lösenordFel, setLösenordFel] = useState('')
  const [lösenordSparat, setLösenordSparat] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function hämta() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.push('/login'); return }

      setEpost(authUser.email ?? '')

      const { data: profil } = await supabase
        .from('profiler')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (profil) {
        const p = profil as Record<string, unknown>
        const namn = p.fullnamn as string | null
        const t = (p.tier as string) ?? 'trial'
        setTier(t)
        setUser({
          fullnamn: namn,
          företag: p.företag as string | null,
          tier: t,
          initialer: namn
            ? namn.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
            : '?',
        })
      }
      setLoading(false)
    }
    hämta()
  }, [])

  async function bytLösenord() {
    setLösenordFel('')
    setLösenordSparat(false)

    if (nyttLösenord.length < 6) {
      setLösenordFel('Lösenordet måste vara minst 6 tecken')
      return
    }
    if (nyttLösenord !== bekräftaLösenord) {
      setLösenordFel('Lösenorden matchar inte')
      return
    }

    setSparar(true)
    const { error } = await supabase.auth.updateUser({ password: nyttLösenord })

    if (error) {
      setLösenordFel(error.message)
    } else {
      setNyttLösenord('')
      setBekräftaLösenord('')
      setLösenordSparat(true)
      setTimeout(() => setLösenordSparat(false), 3000)
    }
    setSparar(false)
  }

  const currentTier = tierInfo[tier] ?? tierInfo.trial

  const inputStyle = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: 8,
    background: 'var(--navy)',
    border: '1px solid var(--navy-border)',
    color: 'var(--white)',
    fontSize: 13,
  }

  const labelStyle = {
    fontSize: 12,
    fontWeight: 600 as const,
    color: 'var(--muted-custom)',
    marginBottom: 4,
    display: 'block' as const,
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--navy)' }}>
      <Sidebar user={user} />

      <div className="flex-1 flex flex-col" style={{ marginLeft: 220 }}>
        {/* Topbar */}
        <div
          className="flex items-center sticky top-0 z-40"
          style={{
            height: 60,
            background: 'var(--navy-mid)',
            borderBottom: '1px solid var(--navy-border)',
            padding: '0 32px',
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 700 }}>Inställningar</span>
        </div>

        {/* Content */}
        <div style={{ padding: '28px 32px', flex: 1 }}>
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 rounded-xl" style={{ background: 'var(--navy-mid)' }} />
              ))}
            </div>
          ) : (
            <div style={{ maxWidth: 600 }}>
              {/* Prenumeration */}
              <div
                style={{
                  background: 'var(--navy-mid)',
                  border: '1px solid var(--navy-border)',
                  borderRadius: 12,
                  padding: '20px 24px',
                  marginBottom: 16,
                }}
              >
                <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Prenumeration</h2>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                      <span
                        className="font-mono"
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: '3px 10px',
                          borderRadius: 6,
                          background: `${currentTier.färg}20`,
                          color: currentTier.färg,
                          textTransform: 'uppercase',
                        }}
                      >
                        {currentTier.namn}
                      </span>
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--muted-custom)', marginTop: 4 }}>
                      {currentTier.beskrivning}
                    </p>
                  </div>
                  <Button
                    onClick={() => router.push('/priser')}
                    variant="outline"
                    style={{
                      borderColor: 'var(--yellow)',
                      color: 'var(--yellow)',
                      fontSize: 12,
                    }}
                  >
                    {tier === 'trial' ? 'Uppgradera' : 'Hantera plan'}
                  </Button>
                </div>
              </div>

              {/* Konto */}
              <div
                style={{
                  background: 'var(--navy-mid)',
                  border: '1px solid var(--navy-border)',
                  borderRadius: 12,
                  padding: '20px 24px',
                  marginBottom: 16,
                }}
              >
                <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Konto</h2>
                <div style={{ marginBottom: 16 }}>
                  <label style={labelStyle}>E-postadress</label>
                  <input
                    style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }}
                    value={epost}
                    readOnly
                  />
                  <p style={{ fontSize: 11, color: 'var(--slate)', marginTop: 4 }}>
                    Kontakta support för att ändra e-postadress
                  </p>
                </div>
              </div>

              {/* Lösenord */}
              <div
                style={{
                  background: 'var(--navy-mid)',
                  border: '1px solid var(--navy-border)',
                  borderRadius: 12,
                  padding: '20px 24px',
                  marginBottom: 16,
                }}
              >
                <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Byt lösenord</h2>
                <div className="space-y-4">
                  <div>
                    <label style={labelStyle}>Nytt lösenord</label>
                    <input
                      style={inputStyle}
                      type="password"
                      value={nyttLösenord}
                      onChange={e => setNyttLösenord(e.target.value)}
                      placeholder="Minst 6 tecken"
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Bekräfta lösenord</label>
                    <input
                      style={inputStyle}
                      type="password"
                      value={bekräftaLösenord}
                      onChange={e => setBekräftaLösenord(e.target.value)}
                      placeholder="Upprepa lösenordet"
                    />
                  </div>
                  {lösenordFel && (
                    <p style={{ fontSize: 12, color: 'var(--red)' }}>{lösenordFel}</p>
                  )}
                  {lösenordSparat && (
                    <p style={{ fontSize: 12, color: 'var(--green)' }}>Lösenordet har ändrats!</p>
                  )}
                  <Button
                    onClick={bytLösenord}
                    disabled={sparar || !nyttLösenord}
                    className="font-semibold"
                    style={{ background: 'var(--yellow)', color: 'var(--navy)' }}
                  >
                    {sparar ? 'Sparar...' : 'Byt lösenord'}
                  </Button>
                </div>
              </div>

              {/* Support */}
              <div
                style={{
                  background: 'var(--navy-mid)',
                  border: '1px solid var(--navy-border)',
                  borderRadius: 12,
                  padding: '20px 24px',
                }}
              >
                <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>Support</h2>
                <p style={{ fontSize: 13, color: 'var(--muted-custom)', marginBottom: 12 }}>
                  Har du frågor eller behöver hjälp? Kontakta oss.
                </p>
                <a
                  href="mailto:support@svebud.se"
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--yellow)',
                    textDecoration: 'none',
                  }}
                >
                  support@svebud.se →
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
