'use client'

import Link from 'next/link'
import { Bell } from '@phosphor-icons/react'
import { useUppföljningar } from '@/lib/hooks/useUppföljningar'

const TERMINALA = new Set(['vunnet', 'förlorat', 'avbrutet'])

export default function NotifikationsBell() {
  const { uppföljningar, loading } = useUppföljningar()

  if (loading) return null

  const nu = Date.now()
  const förfallna = uppföljningar.filter(u => {
    if (TERMINALA.has(u.state)) return false
    const t = u.nästa_åtgärd ? Date.parse(u.nästa_åtgärd) : null
    return t !== null && t <= nu
  })
  const count = förfallna.length

  return (
    <Link
      href="/uppfoljning"
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 36,
        height: 36,
        borderRadius: 8,
        background: count > 0 ? 'var(--light-amber-glow)' : 'transparent',
        border: '1px solid var(--light-border)',
        textDecoration: 'none',
        color: count > 0 ? 'var(--light-amber)' : 'var(--light-t3)',
      }}
      aria-label={count > 0 ? `${count} förfallna uppföljningar` : 'Inga notifikationer'}
    >
      <Bell size={18} weight="bold" />
      {count > 0 && (
        <span
          style={{
            position: 'absolute',
            top: -4,
            right: -4,
            background: 'var(--light-red)',
            color: 'white',
            fontSize: 10,
            fontWeight: 700,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            padding: '0 4px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  )
}
