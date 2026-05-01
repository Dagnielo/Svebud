import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import type { UserProfil } from '@/lib/types/user'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  const { data: profil } = await supabase
    .from('profiler')
    .select('*')
    .eq('id', authUser.id)
    .single()

  const namn = (profil as Record<string, unknown> | null)?.fullnamn as string | null
  const företag = (profil as Record<string, unknown> | null)?.företag as string | null
  const tier = (profil as Record<string, unknown> | null)?.tier as string | null

  const user: UserProfil = {
    fullnamn: namn,
    företag,
    tier,
    initialer: namn
      ? namn.split(' ').map(d => d[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
      : '?',
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} />
      <main className="flex-1 ml-[220px]">
        {children}
      </main>
    </div>
  )
}
