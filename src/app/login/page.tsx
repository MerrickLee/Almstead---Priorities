import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { TreePine } from 'lucide-react'

export default async function LoginPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/')
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 font-sans" style={{ backgroundColor: 'var(--color-paper)', color: 'var(--color-forest)' }}>
      <div className="flex flex-col items-center bg-white p-10 rounded-2xl shadow-sm text-center max-w-sm w-full border" style={{ borderColor: 'var(--color-sage-pale)' }}>
        <TreePine size={48} className="mb-4" style={{ color: 'var(--color-brand)' }} />
        <h1 className="text-2xl font-bold tracking-tight mb-2">Almstead Priorities</h1>
        <p className="text-sm mb-8" style={{ color: 'var(--color-slate)' }}>Sign in with your Almstead Workspace account</p>
        
        <form action="/auth/google" method="post" className="w-full">
          <button className="w-full rounded-full text-white font-bold tracking-wider py-3 px-6 text-sm transition-opacity hover:opacity-90" style={{ backgroundColor: 'var(--color-brand)' }}>
            SIGN IN WITH GOOGLE
          </button>
        </form>
      </div>
    </div>
  )
}
