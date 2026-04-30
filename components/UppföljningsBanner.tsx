'use client'

import Link from 'next/link'
import { useUppföljningar } from '@/lib/hooks/useUppföljningar'
import { posthog } from '@/lib/posthog'

export default function UppföljningsBanner() {
  const { uppföljningar, loading, fel } = useUppföljningar()

  if (loading) {
    return (
      <div
        className="animate-pulse"
        style={{
          height: 48,
          marginBottom: 24,
          borderRadius: 10,
          background: 'var(--navy-mid)',
        }}
      />
    )
  }

  if (fel) return null

  const nu = Date.now()
  const förfallna = uppföljningar.filter(u => {
    const aktiv = !['vunnet', 'förlorat', 'avbrutet'].includes(u.state)
    if (!aktiv || !u.nästa_åtgärd) return false
    return Date.parse(u.nästa_åtgärd) <= nu
  })
  const count = förfallna.length
  if (count === 0) return null

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3"
      style={{
        background: 'var(--yellow-glow)',
        border: '1px solid rgba(245,196,0,0.3)',
        borderRadius: 10,
        padding: '12px 18px',
        marginBottom: 24,
      }}
    >
      <div className="flex items-center gap-3">
        <span style={{ fontSize: 18 }}>🔔</span>
        <span style={{ fontSize: 14, color: 'var(--dt1)' }}>
          <strong>{count}</strong> anbud kräver åtgärd
        </span>
      </div>
      <Link
        href="/uppföljning"
        onClick={() => posthog.capture('uppföljning_banner_klickad', { count })}
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: 'var(--yellow)',
          textDecoration: 'none',
        }}
      >
        Visa →
      </Link>
    </div>
  )
}
