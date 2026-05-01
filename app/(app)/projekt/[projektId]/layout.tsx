import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function ProjektDetaljLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  // Stripped layout — ingen Sidebar, full bredd för fokus på anbud-bygge
  return (
    <div className="min-h-screen w-full">
      {children}
    </div>
  )
}
