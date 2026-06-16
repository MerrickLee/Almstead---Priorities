'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Role } from '@/lib/types'
import { revalidatePath } from 'next/cache'

export async function updateUserPermissions(userId: string, role: Role, branchId: string | null) {
  const supabase = await createClient()
  
  // Verify current user is admin
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) throw new Error('Unauthorized')
    
  const { data: dbUser } = await supabase.from('users').select('role').eq('id', authUser.id).single()
  if (!dbUser || dbUser.role !== 'admin') {
    throw new Error('Forbidden: Only admins can manage roles and branches')
  }

  // Update user
  const updateData: any = { role }
  if (branchId === 'unassigned') {
    updateData.branch_id = null
  } else if (branchId) {
    updateData.branch_id = branchId
  }

  const { error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId)

  if (error) {
    console.error('Failed to update user', error)
    throw new Error('Failed to update user')
  }

  revalidatePath('/settings')
  return { success: true }
}

export async function inviteUser(email: string) {
  const supabase = await createClient()
  
  // Verify current user is admin
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) throw new Error('Unauthorized')
    
  const { data: dbUser } = await supabase.from('users').select('role').eq('id', authUser.id).single()
  if (!dbUser || dbUser.role !== 'admin') {
    throw new Error('Forbidden: Only admins can invite users')
  }

  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email)
  if (error) {
    throw new Error('Failed to invite user: ' + error.message)
  }

  if (data?.user) {
    await supabaseAdmin.from('users').upsert({
      id: data.user.id,
      name: email.split('@')[0],
      email: email,
      role: 'member',
      active: true
    })
  }

  revalidatePath('/settings')
  return { success: true }
}
