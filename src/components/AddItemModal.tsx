import { useState } from 'react'
import { Branch, List } from '@/lib/types'

interface Props {
  branches: Branch[]
  lists: List[]
  onClose: () => void
  onAdd: (title: string, listId: string) => void
}

export default function AddItemModal({ branches, lists, onClose, onAdd }: Props) {
  const [title, setTitle] = useState('')
  const [listId, setListId] = useState('')

  const handleAdd = () => {
    if (title.trim() && listId) {
      onAdd(title.trim(), listId)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-black/5 bg-gray-50/50">
          <h2 className="text-sm font-bold tracking-widest text-[#2C4A3A]/60 uppercase">ADD PRIORITY</h2>
        </div>
        
        <div className="p-6 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold tracking-wider text-[#2C4A3A]/70 uppercase">Title</label>
            <input 
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              autoFocus
              className="px-3 py-2.5 bg-gray-50 border border-black/10 rounded-lg outline-none focus:border-[var(--color-brand)] text-[14px] text-[#1a2f24]"
            />
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold tracking-wider text-[#2C4A3A]/70 uppercase">Assign to List</label>
            <select 
              value={listId}
              onChange={e => setListId(e.target.value)}
              className="px-3 py-2.5 bg-gray-50 border border-black/10 rounded-lg outline-none focus:border-[var(--color-brand)] text-[14px] text-[#1a2f24] appearance-none"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%231a2f24' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
            >
              <option value="" disabled>Select a list...</option>
              {branches.map(b => (
                <optgroup key={b.id} label={b.name}>
                  {lists.filter(l => l.branch_id === b.id).map(l => (
                    <option key={l.id} value={l.id}>{l.name} {l.type === 'branch' ? '(Main)' : ''}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-black/5 bg-gray-50/50 flex items-center justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-[#2C4A3A]/60 hover:bg-black/5 transition-colors">
            Cancel
          </button>
          <button 
            onClick={handleAdd} 
            disabled={!title.trim() || !listId}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: 'var(--color-brand)' }}
          >
            Create Item
          </button>
        </div>
      </div>
    </div>
  )
}
