'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Props = {
  user: {
    fullnamn: string | null
    företag: string | null
    tier: string | null
    initialer: string
  } | null
}

const navItems = [
  { href: '/dashboard', icon: '⚡', label: 'Pipeline' },
  { href: '/dashboard?ny=1', icon: '➕', label: 'Nytt projekt' },
  { href: '/dashboard?alla=1', icon: '📁', label: 'Alla projekt' },
  { href: '/dashboard?profil=1', icon: '🏢', label: 'Företagsprofil' },
  { href: '/dashboard?cert=1', icon: '📜', label: 'Certifikat' },
  { href: '/dashboard?inst=1', icon: '⚙️', label: 'Inställningar' },
]

export default function Sidebar({ user }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function loggaUt() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <aside
      className="fixed top-0 left-0 z-50 flex flex-col"
      style={{
        width: 220,
        minHeight: '100vh',
        background: 'var(--navy-mid)',
        borderRight: '1px solid var(--navy-border)',
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-2.5"
        style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--navy-border)' }}
      >
        <div
          className="flex items-center justify-center flex-shrink-0"
          style={{
            width: 34,
            height: 34,
            background: 'var(--yellow)',
            borderRadius: 8,
            fontSize: 18,
          }}
        >
          ⚡
        </div>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.03em' }}>
            <span className="text-white">Anbud</span>
            <span style={{ color: 'var(--yellow)' }}>AI</span>
          </div>
          <div
            className="font-mono"
            style={{ fontSize: 10, color: 'var(--muted-custom)', marginTop: 1 }}
          >
            v1.0 BETA
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '16px 12px 8px' }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            color: 'var(--slate)',
            padding: '0 8px',
            marginBottom: 6,
          }}
        >
          Meny
        </div>
        {navItems.map(item => {
          const isActive = item.href === '/dashboard' && pathname === '/dashboard'
          return (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-2.5 relative"
              style={{
                padding: '9px 10px',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                color: isActive ? 'var(--yellow)' : 'var(--muted-custom)',
                background: isActive ? 'var(--yellow-glow)' : 'transparent',
                marginBottom: 2,
                textDecoration: 'none',
              }}
            >
              {isActive && (
                <span
                  className="absolute left-0"
                  style={{
                    top: 6,
                    bottom: 6,
                    width: 3,
                    background: 'var(--yellow)',
                    borderRadius: '0 2px 2px 0',
                  }}
                />
              )}
              <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* User card */}
      <div
        className="mt-auto"
        style={{ padding: '16px 12px', borderTop: '1px solid var(--navy-border)' }}
      >
        <div
          className="flex items-center gap-2.5"
          style={{ padding: 10, borderRadius: 8 }}
        >
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{
              width: 32,
              height: 32,
              background: 'var(--yellow)',
              color: 'var(--navy)',
              borderRadius: '50%',
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            {user?.initialer ?? '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 13, fontWeight: 600 }} className="truncate">
              {user?.fullnamn ?? 'Användare'}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted-custom)' }} className="truncate">
              {user?.företag ?? ''}
            </div>
          </div>
          {user?.tier && user.tier !== 'trial' && (
            <span
              className="font-mono"
              style={{
                fontSize: 9,
                fontWeight: 600,
                background: 'var(--yellow-glow)',
                color: 'var(--yellow)',
                padding: '2px 6px',
                borderRadius: 4,
                border: '1px solid rgba(245,196,0,0.3)',
                textTransform: 'uppercase',
              }}
            >
              {user.tier}
            </span>
          )}
        </div>
        <button
          onClick={loggaUt}
          style={{
            width: '100%',
            marginTop: 8,
            padding: '8px 10px',
            borderRadius: 8,
            border: '1px solid var(--navy-border)',
            background: 'transparent',
            color: 'var(--muted-custom)',
            fontSize: 12,
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Logga ut
        </button>
      </div>
    </aside>
  )
}
