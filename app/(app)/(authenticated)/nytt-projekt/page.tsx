'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

export default function NyttProjektPage() {
  const [namn, setNamn] = useState('')
  const [beskrivning, setBeskrivning] = useState('')
  const [skapar, setSkapar] = useState(false)
  const router = useRouter()
  const supabase = createClient()

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
    <div className="flex flex-col min-h-screen" style={{ background: 'var(--light-cream)' }}>
      {/* Topbar */}
      <div
        className="flex items-center sticky top-0 z-40"
        style={{
          height: 60,
          background: 'var(--light-bg)',
          borderBottom: '1px solid var(--light-border)',
          padding: '0 32px',
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--light-t1)' }}>Nytt projekt</span>
      </div>

      {/* Content */}
      <div style={{ padding: '28px 32px', flex: 1, background: 'var(--light-cream)' }}>
        <div style={{ maxWidth: 560 }}>
          <div
            style={{
              background: 'var(--light-bg)',
              border: '1px solid var(--light-border)',
              borderRadius: 12,
              padding: '24px 28px',
              boxShadow: '0 1px 2px rgba(14,27,46,.04)',
            }}
          >
            <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4, color: 'var(--light-t1)' }}>Skapa nytt projekt</h2>
            <p style={{ fontSize: 13, color: 'var(--light-t2)', marginBottom: 24 }}>
              Ge projektet ett namn och en kort beskrivning. Du kan ladda upp förfrågningsunderlaget i nästa steg.
            </p>

            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--light-t3)',
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
                  background: 'var(--light-off)',
                  border: '1px solid var(--light-border)',
                  color: 'var(--light-t1)',
                  fontSize: 14,
                }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--light-t3)',
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
                  background: 'var(--light-off)',
                  border: '1px solid var(--light-border)',
                  color: 'var(--light-t1)',
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
                style={{ background: 'var(--light-amber)', color: 'var(--light-navy)', padding: '10px 20px' }}
              >
                {/* "→" typografisk pil (UX-konvention, ej ikon) */}
                {skapar ? 'Skapar...' : 'Skapa projekt →'}
              </Button>
              <Button
                onClick={() => router.push('/dashboard')}
                variant="outline-light-neutral"
                style={{ fontSize: 12 }}
              >
                Avbryt
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
