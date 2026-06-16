import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabase = await createClient()

  const requestUrl = new URL(request.url)
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${requestUrl.origin}/auth/callback`,
      queryParams: {
        hd: 'almstead.com'
      }
    },
  })

  if (error) {
    return NextResponse.redirect(`${requestUrl.origin}/login?error=Could not authenticate with Google`)
  }

  if (data.url) {
    redirect(data.url)
  }
}
