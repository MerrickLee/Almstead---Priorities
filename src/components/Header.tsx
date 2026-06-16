import { TreePine, Search } from 'lucide-react'
import { User } from '@/lib/types'

interface Props {
  currentUser: User
  searchQuery: string
  setSearchQuery: (query: string) => void
}

export default function Header({ currentUser, searchQuery, setSearchQuery }: Props) {
  return (
    <header className="flex items-center justify-between px-6 py-3 shrink-0" style={{ background: 'var(--color-forest)' }}>
      <div className="flex items-center gap-3">
        <TreePine size={20} style={{ color: 'var(--color-gold)' }} />
        <span className="font-semibold tracking-wider" style={{ color: 'var(--color-paper)', fontSize: 16, letterSpacing: '0.05em' }}>ALMSTEAD</span>
        <span style={{ color: '#9DBCA4', fontSize: 13, borderLeft: '1px solid #2C4A3A', paddingLeft: 12 }}>Priorities</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full px-3 py-1.5" style={{ background: '#163828' }}>
          <Search size={14} style={{ color: '#9DBCA4' }} />
          <input 
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
             placeholder="Search priorities"
             className="bg-transparent outline-none"
             style={{ color: '#9DBCA4', fontSize: 12, width: 140 }}
          />
        </div>
        {currentUser.role === 'admin' && (
          <button className="rounded-full font-semibold tracking-wider text-white px-4 py-1.5"
            style={{ background: 'var(--color-gold)', fontSize: 10.5, letterSpacing: '0.08em' }}>
            ADD ITEM
          </button>
        )}
        <div className="flex items-center justify-center rounded-full font-semibold text-white uppercase" 
             style={{ width: 30, height: 30, background: 'var(--color-brand)', fontSize: 12 }}>
          {currentUser.name.substring(0, 2)}
        </div>
      </div>
    </header>
  )
}

