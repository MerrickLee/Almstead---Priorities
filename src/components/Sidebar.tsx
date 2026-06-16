import { useState } from 'react'
import { Branch, List, Item } from '@/lib/types'
import { ChevronRight, ChevronDown, Mail } from 'lucide-react'

export default function Sidebar({
  branches,
  lists,
  items,
  activeListId,
  setActiveListId,
}: {
  branches: Branch[]
  lists: List[]
  items: Item[]
  activeListId: string
  setActiveListId: (id: string) => void
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const countFor = (id: string) => {
    return items.filter(i => {
      if (i.status !== 'open') return false
      if (id === 'all') return true
      if (i.list_id === id) return true
      
      // If it's a branch, sum all its arborist sublists and its own main list
      const branchLists = lists.filter(l => l.branch_id === id)
      return branchLists.some(l => l.id === i.list_id)
    }).length
  }

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <aside className="shrink-0 py-4 flex flex-col overflow-y-auto" style={{ width: 210, background: 'var(--color-cream)', borderRight: '1px solid #E3E1D4' }}>
      <SidebarRow 
        label="All" 
        count={countFor('all')} 
        active={activeListId === 'all'} 
        onClick={() => setActiveListId('all')} 
      />
      <div className="px-4 pt-4 pb-1 font-semibold" style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--color-slate)', opacity: 0.7 }}>
        BRANCHES
      </div>
      
      {branches.map(b => {
        const branchLists = lists.filter(l => l.branch_id === b.id)
        const mainList = branchLists.find(l => l.type === 'branch')
        const arboristLists = branchLists.filter(l => l.type === 'arborist')
        
        // Use the main list ID if it exists, otherwise branch ID as a fallback bucket
        const listId = mainList ? mainList.id : b.id
        
        return (
          <div key={b.id}>
            <SidebarRow 
              label={b.name} 
              count={countFor(b.id)} 
              active={activeListId === listId}
              onClick={() => setActiveListId(listId)}
              caret={arboristLists.length > 0}
              expandedCaret={!!expanded[b.id]}
              onCaret={(e: React.MouseEvent) => toggleExpand(b.id, e)}
            />
            {expanded[b.id] && arboristLists.map(al => (
              <SidebarRow 
                key={al.id} 
                label={al.name} 
                count={countFor(al.id)} 
                active={activeListId === al.id} 
                nested 
                onClick={() => setActiveListId(al.id)} 
              />
            ))}
          </div>
        )
      })}

      <div className="mx-3 mt-auto mb-4 rounded-xl bg-white p-3" style={{ border: '1px solid #E3E1D4', fontSize: 11.5, color: '#5F7A5F', lineHeight: 1.5 }}>
        <Mail size={13} className="mb-1" style={{ color: 'var(--color-gold)' }} />
        <div>Weekly digest · Mon 7:00 AM</div>
        <div style={{ color: '#9AAA9A' }}>Subscribed to 2 lists</div>
      </div>
    </aside>
  )
}

function SidebarRow({ label, count, active, onClick, nested, caret, expandedCaret, onCaret }: any) {
  return (
    <div className="flex items-center justify-between cursor-pointer"
      onClick={onClick}
      style={{
        padding: nested ? '6px 16px 6px 34px' : '7px 16px 7px 13px',
        fontSize: nested ? 12.5 : 13,
        fontWeight: active ? 600 : 400,
        color: active ? 'var(--color-forest)' : nested ? '#4A5C4A' : 'var(--color-slate)',
        background: active ? 'var(--color-sage-pale)' : 'transparent',
        borderLeft: active ? '3px solid var(--color-brand)' : '3px solid transparent',
      }}>
      <span className="flex items-center gap-1">
        {caret && (
          <button onClick={onCaret} aria-label="Expand" className="text-slate/60 hover:text-slate">
            {expandedCaret ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        )}
        {label}
      </span>
      <span style={{ color: '#9AAA9A', fontWeight: 400 }}>{count}</span>
    </div>
  )
}
