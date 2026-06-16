import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import SettingsContainer from './SettingsContainer'
import { Branch, User } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user: authUser } } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login')
  }

  const { data: dbUser } = await supabase.from('users').select('*').eq('id', authUser.id).single()

  const currentUser: User = dbUser || {
    id: authUser.id,
    name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Unknown',
    email: authUser.email || '',
    role: 'admin',
    active: true
  }

  if (currentUser.role !== 'admin') {
    redirect('/')
  }

  const [usersRes, branchesRes] = await Promise.all([
    supabase.from('users').select('*').order('name'),
    supabase.from('branches').select('*').order('name')
  ])

  const users = (usersRes.data || []) as User[]
  const branches = (branchesRes.data || []) as Branch[]

  return <SettingsContainer currentUser={currentUser} users={users} branches={branches} />
}
