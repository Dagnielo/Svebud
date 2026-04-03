'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [magicLinkSkickad, setMagicLinkSkickad] = useState(false)
  const [fel, setFel] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setFel(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setFel(error.message === 'Invalid login credentials'
        ? 'Fel e-post eller lösenord'
        : error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  async function handleMagicLink() {
    if (!email) {
      setFel('Fyll i din e-postadress först')
      return
    }

    setLoading(true)
    setFel(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    })

    if (error) {
      setFel(error.message)
      setLoading(false)
      return
    }

    setMagicLinkSkickad(true)
    setLoading(false)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: '#0E1B2E' }}
    >
      <Card className="w-full max-w-[400px] border-0" style={{ backgroundColor: '#172233' }}>
        <CardHeader className="text-center pb-2">
          <div className="mb-6">
            <span className="text-2xl font-extrabold text-white" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              Anbud
            </span>
            <span className="text-2xl font-extrabold" style={{ color: '#F5C400', fontFamily: 'DM Sans, sans-serif' }}>
              AI
            </span>
          </div>
          <p className="text-sm text-slate-400">Logga in på ditt konto</p>
        </CardHeader>

        <CardContent>
          {magicLinkSkickad ? (
            <div className="text-center py-4">
              <p className="text-white mb-2">Kolla din e-post!</p>
              <p className="text-sm text-slate-400">
                Vi har skickat en inloggningslänk till <strong className="text-white">{email}</strong>
              </p>
              <Button
                variant="ghost"
                className="mt-4 text-slate-400 hover:text-white"
                onClick={() => setMagicLinkSkickad(false)}
              >
                Tillbaka
              </Button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 block mb-1">E-post</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-md bg-[#0E1B2E] border border-slate-600 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#F5C400]"
                  placeholder="namn@företag.se"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 block mb-1">Lösenord</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-[#0E1B2E] border border-slate-600 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#F5C400]"
                  placeholder="••••••••"
                />
              </div>

              {fel && (
                <p className="text-sm text-red-400">{fel}</p>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full font-semibold"
                style={{ backgroundColor: '#F5C400', color: '#0E1B2E' }}
              >
                {loading ? 'Loggar in...' : 'Logga in'}
              </Button>

              <Button
                type="button"
                variant="ghost"
                disabled={loading}
                onClick={handleMagicLink}
                className="w-full text-slate-400 hover:text-white border border-slate-600"
              >
                Skicka Magic Link
              </Button>

              <p className="text-center text-sm text-slate-400">
                Inget konto?{' '}
                <Link href="/registrera" className="hover:underline" style={{ color: '#F5C400' }}>
                  Registrera dig →
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
