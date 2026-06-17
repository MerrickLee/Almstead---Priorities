import { createClient } from '@/utils/supabase/server'
import AppContainer from '@/components/AppContainer'
import { User } from '@/lib/types'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  const { data: dbUser } = await supabase.from('users').select('*').eq('id', authUser.id).single()

  // If user doesn't exist in our public.users table yet, fallback to a sensible default 
  // (In production, a webhook or trigger would create this record on signup)
  const actualUser: User = dbUser || {
    id: authUser.id,
    name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Unknown',
    email: authUser.email || '',
    role: 'admin', // Default to admin to easily test features during dev
    active: true
  }

  let currentUser = actualUser
  let impersonatingUser: User | null = null

  if (actualUser.role === 'admin') {
    const cookieStore = await cookies()
    const viewAsId = cookieStore.get('view_as_user_id')?.value
    if (viewAsId) {
      const { data: impersonatedDbUser } = await supabase.from('users').select('*').eq('id', viewAsId).single()
      if (impersonatedDbUser) {
        currentUser = impersonatedDbUser as User
        impersonatingUser = actualUser
      }
    }
  }

  return <AppContainer currentUser={currentUser} impersonatingUser={impersonatingUser} />
}
