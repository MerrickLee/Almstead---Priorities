import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Link pre-added users: if a user was added by email with a placeholder ID,
      // update their record to use their real Supabase auth ID
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser?.email && process.env.SUPABASE_SERVICE_ROLE_KEY) {
          const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
          )
          
          // Check if user already exists with their real auth ID
          const { data: existingById } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('id', authUser.id)
            .single()

          if (!existingById) {
            // No record with this auth ID — check if there's a pre-added record by email
            const { data: existingByEmail } = await supabaseAdmin
              .from('users')
              .select('id')
              .eq('email', authUser.email.toLowerCase())
              .single()

            if (existingByEmail) {
              // Update the placeholder ID to the real auth ID
              // We need to insert a new row with the correct ID and delete the old one
              // because `id` is the primary key
              const { data: oldRecord } = await supabaseAdmin
                .from('users')
                .select('*')
                .eq('id', existingByEmail.id)
                .single()

              if (oldRecord) {
                await supabaseAdmin.from('users').delete().eq('id', existingByEmail.id)
                await supabaseAdmin.from('users').insert({
                  ...oldRecord,
                  id: authUser.id,
                  name: authUser.user_metadata?.full_name || oldRecord.name,
                })
              }
            } else {
              // Brand new user signing in — create a record
              await supabaseAdmin.from('users').insert({
                id: authUser.id,
                name: authUser.user_metadata?.full_name || authUser.email.split('@')[0],
                email: authUser.email.toLowerCase(),
                role: 'member',
                active: true,
              })
            }
          }
        }
      } catch (e) {
        console.error('Error linking user on sign-in:', e)
        // Non-blocking — user can still sign in
      }

      return NextResponse.redirect(`${requestUrl.origin}${next}`)
    }
  }

  return NextResponse.redirect(`${requestUrl.origin}/login?error=Authentication failed`)
}

