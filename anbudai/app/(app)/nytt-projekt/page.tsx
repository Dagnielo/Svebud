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

export default function NyttProjektPage() {
  const [namn, setNamn] = useState('')
  const [beskrivning, setBeskrivning] = useState('')
  const [skapar, setSkapar] = useState(false)
  const [user, setUser] = useState<UserProfil | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function hämta() {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.push('/login'); return }

      const { data: profil } = await supabase
        .from('profiler')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (profil) {
        const p = profil as Record<string, unknown>
        const n = p.fullnamn as string | null
        setUser({
          fullnamn: n,
          företag: p.företag as string | null,
          tier: p.tier as string | null,
          initialer: n
            ? n.split(' ').map((c: string) => c[0]).join('').toUpperCase().slice(0, 2)
            : '?',
        })
      }
    }
    hämta()
  }, [])

  async function skapaProjekt() {
    if (!namn.trim()) return
    setSkapar(true)

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return

    const { data, error } = await supabase
      .from('projekt')
      .insert({
        namn: namn.trim(),
        beskrivning: beskrivning.trim() || null,
        användar_id: authUser.id,
      })
      .select('id')
      .single()

    if (data && !error) {
      router.push(`/projekt/${data.id}`)
    }
    setSkapar(false)
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
          <span style={{ fontSize: 16, fontWeight: 700 }}>Nytt projekt</span>
        </div>

        {/* Content */}
        <div style={{ padding: '28px 32px', flex: 1 }}>
          <div style={{ maxWidth: 560 }}>
            <div
              style={{
                background: 'var(--navy-mid)',
                border: '1px solid var(--navy-border)',
                borderRadius: 12,
                padding: '24px 28px',
              }}
            >
              <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Skapa nytt projekt</h2>
              <p style={{ fontSize: 13, color: 'var(--muted-custom)', marginBottom: 24 }}>
                Ge projektet ett namn och en kort beskrivning. Du kan ladda upp förfrågningsunderlaget i nästa steg.
              </p>

              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--muted-custom)',
                    marginBottom: 4,
                    display: 'block',
                  }}
                >
                  Projektnamn *
                </label>
                <input
                  value={namn}
                  onChange={e => setNamn(e.target.value)}
                  placeholder="T.ex. BRF Solstrålen – elinstallation"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: 'var(--navy)',
                    border: '1px solid var(--navy-border)',
                    color: 'var(--white)',
                    fontSize: 14,
                  }}
                />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--muted-custom)',
                    marginBottom: 4,
                    display: 'block',
                  }}
                >
                  Beskrivning
                </label>
                <textarea
                  value={beskrivning}
                  onChange={e => setBeskrivning(e.target.value)}
                  rows={4}
                  placeholder="Valfri beskrivning av projektet..."
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 8,
                    background: 'var(--navy)',
                    border: '1px solid var(--navy-border)',
                    color: 'var(--white)',
                    fontSize: 14,
                    resize: 'none',
                  }}
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={skapaProjekt}
                  disabled={skapar || !namn.trim()}
                  className="flex-1 font-semibold"
                  style={{ background: 'var(--yellow)', color: 'var(--navy)', padding: '10px 20px' }}
                >
                  {skapar ? 'Skapar...' : 'Skapa projekt →'}
                </Button>
                <Button
                  onClick={() => router.push('/dashboard')}
                  variant="outline"
                  style={{ borderColor: 'var(--navy-border)', color: 'var(--muted-custom)' }}
                >
                  Avbryt
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
