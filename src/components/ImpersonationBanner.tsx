'use client'

import { setViewAsUser } from '@/app/actions'
import { User } from '@/lib/types'

interface Props {
  impersonatedUser: User
}

export default function ImpersonationBanner({ impersonatedUser }: Props) {
  const handleExit = async () => {
    await setViewAsUser(null)
    window.location.reload()
  }

  return (
    <div className="bg-amber-100 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-4 text-sm text-amber-800 z-50">
      <span className="font-medium">
        Viewing as {impersonatedUser.name}
      </span>
      <button 
        onClick={handleExit}
        className="text-xs bg-amber-200 hover:bg-amber-300 transition-colors px-2.5 py-1 rounded-md font-semibold text-amber-900"
      >
        Exit
      </button>
    </div>
  )
}
