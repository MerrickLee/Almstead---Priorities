import { createClient } from '@/utils/supabase/server'
import AppContainer from '@/components/AppContainer'
import { User } from '@/lib/types'
import { redirect } from 'next/navigation'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  const { data: dbUser } = await supabase.from('users').select('*').eq('id', authUser.id).single()

  // If user doesn't exist in our public.users table yet, fallback to a sensible default 
  // (In production, a webhook or trigger would create this record on signup)
  const currentUser: User = dbUser || {
    id: authUser.id,
    name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Unknown',
    email: authUser.email || '',
    role: 'admin', // Default to admin to easily test features during dev
    active: true
  }

  return <AppContainer currentUser={currentUser} />
}
