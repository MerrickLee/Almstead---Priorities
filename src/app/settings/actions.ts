'use server'

import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { Role } from '@/lib/types'
import { revalidatePath } from 'next/cache'

export async function updateUserPermissions(userId: string, role: Role, branchId: string | null): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Verify current user is admin
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return { success: false, error: 'Unauthorized' }
      
    const { data: dbUser } = await supabase.from('users').select('role').eq('id', authUser.id).single()
    if (!dbUser || dbUser.role !== 'admin') {
      return { success: false, error: 'Forbidden: Only admins can manage roles and branches' }
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
      return { success: false, error: 'Failed to update user' }
    }

    revalidatePath('/settings')
    return { success: true }
  } catch (e: any) {
    console.error('updateUserPermissions unexpected error:', e)
    return { success: false, error: e.message || 'An unexpected error occurred' }
  }
}

export async function inviteUser(email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Verify current user is admin
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return { success: false, error: 'Unauthorized' }
      
    const { data: dbUser } = await supabase.from('users').select('role').eq('id', authUser.id).single()
    if (!dbUser || dbUser.role !== 'admin') {
      return { success: false, error: 'Forbidden: Only admins can invite users' }
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return { success: false, error: 'Server configuration error: Service role key is not set.' }
    }

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email)
    if (error) {
      return { success: false, error: 'Failed to invite user: ' + error.message }
    }

    if (data?.user) {
      const { error: upsertError } = await supabaseAdmin.from('users').upsert({
        id: data.user.id,
        name: email.split('@')[0],
        email: email,
        role: 'member',
        active: true
      })
      if (upsertError) {
        console.error('Failed to upsert user record:', upsertError)
        // Invite was sent but DB record failed — don't block
      }
    }

    revalidatePath('/settings')
    return { success: true }
  } catch (e: any) {
    console.error('inviteUser unexpected error:', e)
    return { success: false, error: e.message || 'An unexpected error occurred' }
  }
}

export async function addUsers(
  users: { email: string; name: string }[]
): Promise<{ success: boolean; error?: string; added?: number; skipped?: number }> {
  try {
    const supabase = await createClient()

    // Verify current user is admin
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return { success: false, error: 'Unauthorized' }

    const { data: dbUser } = await supabase.from('users').select('role').eq('id', authUser.id).single()
    if (!dbUser || dbUser.role !== 'admin') {
      return { success: false, error: 'Forbidden: Only admins can add users' }
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return { success: false, error: 'Server configuration error: Service role key is not set.' }
    }

    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let added = 0
    let skipped = 0

    for (const user of users) {
      // Check if user already exists by email
      const { data: existing } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', user.email.toLowerCase())
        .single()

      if (existing) {
        skipped++
        continue
      }

      // Generate a placeholder UUID — will be replaced when they sign in via Google
      const placeholderId = crypto.randomUUID()

      const { error } = await supabaseAdmin.from('users').insert({
        id: placeholderId,
        name: user.name,
        email: user.email.toLowerCase(),
        role: 'member',
        active: true,
      })

      if (error) {
        console.error(`Failed to add user ${user.email}:`, error)
        continue
      }
      added++
    }

    revalidatePath('/settings')
    return { success: true, added, skipped }
  } catch (e: any) {
    console.error('addUsers unexpected error:', e)
    return { success: false, error: e.message || 'An unexpected error occurred' }
  }
}
