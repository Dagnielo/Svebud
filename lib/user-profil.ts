import { createClient } from '@/lib/supabase/client'

export type UserProfil = {
  fullnamn: string | null
  företag: string | null
  tier: string | null
  initialer: string
}

export async function hämtaUserProfil(): Promise<{ profil: UserProfil | null; authUserId: string | null }> {
  const supabase = createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return { profil: null, authUserId: null }

  const { data: profil } = await supabase
    .from('profiler')
    .select('*')
    .eq('id', authUser.id)
    .single()

  if (!profil) return { profil: null, authUserId: authUser.id }

  const p = profil as Record<string, unknown>
  const namn = p.fullnamn as string | null

  return {
    profil: {
      fullnamn: namn,
      företag: p.företag as string | null,
      tier: p.tier as string | null,
      initialer: namn
        ? namn.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
        : '?',
    },
    authUserId: authUser.id,
  }
}
