'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function RegistreraPage() {
  const [fullnamn, setFullnamn] = useState('')
  const [företag, setFöretag] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [fel, setFel] = useState<string | null>(null)
  const [klart, setKlart] = useState(false)
  const supabase = createClient()

  async function handleRegistrera(e: React.FormEvent) {
    e.preventDefault()
    setFel(null)

    if (password.length < 8) {
      setFel('Lösenordet måste vara minst 8 tecken')
      return
    }

    setLoading(true)

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { fullnamn, företag },
      },
    })

    if (error) {
      setFel(error.message)
      setLoading(false)
      return
    }

    if (data.user) {
      await supabase.from('profiler').insert({
        id: data.user.id,
        fullnamn,
        företag,
        epost: email,
      })
    }

    setKlart(true)
    setLoading(false)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: '#0F1C2E' }}
    >
      <Card className="w-full max-w-[400px] border-0" style={{ backgroundColor: '#172233' }}>
        <CardHeader className="text-center pb-2">
          <div className="mb-6">
            <span className="text-2xl font-extrabold text-white" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              Sve
            </span>
            <span className="text-2xl font-extrabold" style={{ color: '#F5C400', fontFamily: 'DM Sans, sans-serif' }}>
              Bud
            </span>
          </div>
          <p className="text-sm text-slate-400">Skapa ditt konto</p>
        </CardHeader>

        <CardContent>
          {klart ? (
            <div className="text-center py-4">
              <p className="text-white mb-2">Kontrollera din e-post!</p>
              <p className="text-sm text-slate-400">
                Vi har skickat en bekräftelselänk till <strong className="text-white">{email}</strong>
              </p>
              <Link href="/login">
                <Button
                  variant="ghost"
                  className="mt-4 text-slate-400 hover:text-white"
                >
                  Tillbaka till inloggning
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleRegistrera} className="space-y-4">
              <div>
                <label className="text-sm text-slate-400 block mb-1">Fullnamn *</label>
                <input
                  type="text"
                  value={fullnamn}
                  onChange={e => setFullnamn(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-md bg-[#0F1C2E] border border-slate-600 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#F5C400]"
                  placeholder="Anna Andersson"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 block mb-1">Företag</label>
                <input
                  type="text"
                  value={företag}
                  onChange={e => setFöretag(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-[#0F1C2E] border border-slate-600 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#F5C400]"
                  placeholder="Elfirma AB"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 block mb-1">E-post *</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-md bg-[#0F1C2E] border border-slate-600 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#F5C400]"
                  placeholder="namn@företag.se"
                />
              </div>

              <div>
                <label className="text-sm text-slate-400 block mb-1">Lösenord * (minst 8 tecken)</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                  className="w-full px-3 py-2 rounded-md bg-[#0F1C2E] border border-slate-600 text-white placeholder:text-slate-500 focus:outline-none focus:border-[#F5C400]"
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
                style={{ backgroundColor: '#F5C400', color: '#0F1C2E' }}
              >
                {loading ? 'Skapar konto...' : 'Skapa konto'}
              </Button>

              <p className="text-center text-sm text-slate-400">
                Har du redan konto?{' '}
                <Link href="/login" className="hover:underline" style={{ color: '#F5C400' }}>
                  Logga in →
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
