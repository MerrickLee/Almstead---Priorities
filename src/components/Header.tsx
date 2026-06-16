import { Search, Settings } from 'lucide-react'
import { User } from '@/lib/types'
import Image from 'next/image'
import Link from 'next/link'

interface Props {
  currentUser: User
  searchQuery: string
  setSearchQuery: (query: string) => void
  onAddItemClick?: () => void
}

export default function Header({ currentUser, searchQuery, setSearchQuery, onAddItemClick }: Props) {
  return (
    <header className="flex items-center justify-between px-6 py-3 shrink-0 bg-white" style={{ borderBottom: '1px solid var(--color-sage-pale)' }}>
      <div className="flex items-center gap-3">
        <Image src="/horizontal-almstead-logo.png" alt="Almstead" width={140} height={28} style={{ objectFit: 'contain' }} />
        <span style={{ color: 'var(--color-forest)', fontSize: 13, borderLeft: '1px solid var(--color-sage-pale)', paddingLeft: 12, fontWeight: 500 }}>Priorities</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full px-3 py-1.5" style={{ background: 'var(--color-sage-pale)' }}>
          <Search size={14} style={{ color: 'var(--color-forest)' }} />
          <input 
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
             placeholder="Search priorities"
             className="bg-transparent outline-none placeholder-gray-400"
             style={{ color: 'var(--color-forest)', fontSize: 12, width: 140 }}
          />
        </div>
        {currentUser.role === 'admin' && (
          <>
            <Link href="/settings" className="transition-colors hover:opacity-70" style={{ color: 'var(--color-forest)' }} title="Settings">
              <Settings size={18} />
            </Link>
            <button 
              onClick={onAddItemClick}
              className="rounded-full font-semibold tracking-wider text-white px-4 py-1.5"
              style={{ background: 'var(--color-gold)', fontSize: 10.5, letterSpacing: '0.08em' }}>
              ADD ITEM
            </button>
          </>
        )}
        <div className="flex items-center justify-center rounded-full font-semibold text-white uppercase" 
             style={{ width: 30, height: 30, background: 'var(--color-brand)', fontSize: 12 }}>
          {currentUser.name.substring(0, 2)}
        </div>
      </div>
    </header>
  )
}

