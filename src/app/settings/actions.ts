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
): Promise<{ success: boolean; error?: string; added?: number; skipped?: number; errors?: string[] }> {
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
    const errorMessages: string[] = []

    for (const user of users) {
      const email = user.email.toLowerCase()

      // Check if user already exists in public.users by email
      const { data: existingDbUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', email)
        .single()

      if (existingDbUser) {
        skipped++
        continue
      }

      // Create the user in Supabase Auth (no invite email sent)
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: user.name },
      })

      if (authError) {
        // User might already exist in auth but not in public.users
        if (authError.message?.includes('already been registered') || authError.message?.includes('already exists')) {
          try {
            // Look up existing auth user by email using filtered list
            const { data: listData } = await supabaseAdmin.auth.admin.listUsers({
              page: 1,
              perPage: 1000
            })
            const existingAuth = listData?.users?.find(u => u.email?.toLowerCase() === email)
            
            if (existingAuth) {
              // Check if they already have a public.users record
              const { data: existingPublic } = await supabaseAdmin
                .from('users')
                .select('id')
                .eq('id', existingAuth.id)
                .single()

              if (existingPublic) {
                skipped++
              } else {
                const { error: insertError } = await supabaseAdmin.from('users').insert({
                  id: existingAuth.id,
                  name: user.name,
                  email,
                  role: 'member',
                  active: true,
                })
                if (insertError) {
                  errorMessages.push(`${email}: ${insertError.message}`)
                } else {
                  added++
                }
              }
            } else {
              errorMessages.push(`${email}: already registered in auth but could not be found`)
            }
          } catch (lookupError: any) {
            errorMessages.push(`${email}: ${lookupError.message || 'failed to look up existing user'}`)
          }
        } else {
          errorMessages.push(`${email}: ${authError.message}`)
        }
        continue
      }

      // Insert into public.users with the real auth ID
      if (authData?.user) {
        const { error: insertError } = await supabaseAdmin.from('users').insert({
          id: authData.user.id,
          name: user.name,
          email,
          role: 'member',
          active: true,
        })
        if (insertError) {
          errorMessages.push(`${email}: ${insertError.message}`)
        } else {
          added++
        }
      }
    }

    revalidatePath('/settings')
    return { success: true, added, skipped, errors: errorMessages.length > 0 ? errorMessages : undefined }
  } catch (e: any) {
    console.error('addUsers unexpected error:', e)
    return { success: false, error: e.message || 'An unexpected error occurred' }
  }
}
