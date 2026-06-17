import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { ChevronRight, ArrowUpDown, Check, Plus } from 'lucide-react'
import { Branch, List, Item, User } from '@/lib/types'
import { SortableItem, StaticItem } from './SortableItem'
import { createClient } from '@/utils/supabase/client'
import { trackEvent } from '@/utils/amplitude'

interface Props {
  currentUser: User
  listId: string
  lists: List[]
  branches: Branch[]
  items: Item[]
  showCompleted: boolean
  setShowCompleted: (val: boolean) => void
  onToggleStatus: (item: Item) => void
  onAddItem: (title: string, listId: string) => void
  onDetailClick: (id: string) => void
  setItems: React.Dispatch<React.SetStateAction<Item[]>>
}

export default function MainList({
  currentUser,
  listId,
  lists,
  branches,
  items,
  showCompleted,
  setShowCompleted,
  onToggleStatus,
  onAddItem,
  onDetailClick,
  setItems,
}: Props) {
  const [newTitle, setNewTitle] = useState('')
  const supabase = createClient()

  const isManager = currentUser.role === 'manager' || currentUser.role === 'admin'
  const isAdmin = currentUser.role === 'admin'
  const inAll = listId === 'all'

  const listName = inAll ? 'All' 
    : branches.find((b) => b.id === listId)?.name 
    || lists.find((l) => l.id === listId)?.name

  const currentList = lists.find((l) => l.id === listId)
  const isBranchMain = currentList?.type === 'branch'
  const branchId = currentList?.branch_id

  const visible = items.filter(i => {
    if (inAll) return true
    if (i.list_id === listId) return true
    if (isBranchMain && branchId) {
      const parentList = lists.find(l => l.id === i.list_id)
      if (parentList && parentList.branch_id === branchId) return true
    }
    return false
  })

  const open = visible.filter(i => i.status === 'open')
  const done = visible.filter(i => i.status === 'completed')

  const mainOpen = inAll ? open : open.filter(i => i.list_id === listId)
  const mainDone = inAll ? done : done.filter(i => i.list_id === listId)
  
  const subLists = isBranchMain ? lists.filter(l => l.branch_id === branchId && l.type === 'arborist') : []

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    if (over && active.id !== over.id) {
      const oldIndex = mainOpen.findIndex(i => i.id === active.id)
      const newIndex = mainOpen.findIndex(i => i.id === over.id)
      
      const newOpen = arrayMove(mainOpen, oldIndex, newIndex)
      
      // Calculate new sort_order (midpoint)
      let newSortOrder = 0
      if (newIndex === 0) {
        newSortOrder = newOpen[1].sort_order - 1024
      } else if (newIndex === newOpen.length - 1) {
        newSortOrder = newOpen[newOpen.length - 2].sort_order + 1024
      } else {
        const prev = newOpen[newIndex - 1].sort_order
        const next = newOpen[newIndex + 1].sort_order
        newSortOrder = (prev + next) / 2
      }

      const activeItem = mainOpen[oldIndex]

      // Optimistic update
      setItems(prev => prev.map(i => i.id === activeItem.id ? { ...i, sort_order: newSortOrder } : i).sort((a, b) => a.sort_order - b.sort_order))

      // Server update
      await supabase.from('items').update({ sort_order: newSortOrder }).eq('id', activeItem.id)
      trackEvent('item_reordered', { item_id: activeItem.id, old_rank: oldIndex + 1, new_rank: newIndex + 1 })
    }
  }

  const handleAdd = () => {
    if (newTitle.trim()) {
      onAddItem(newTitle.trim(), listId)
      setNewTitle('')
    }
  }

  return (
    <main className="flex-1 px-4 md:px-7 py-4 md:py-5 overflow-y-auto" style={{ minWidth: 0 }}>
      <div style={{ fontSize: 12, color: 'var(--color-slate)', opacity: 0.7 }}>
        All {!inAll && <><ChevronRight size={11} className="inline mx-1" /> <span style={{ color: 'var(--color-slate)', opacity: 1 }}>{listName}</span></>}
      </div>
      
      <div className="flex items-baseline justify-between mt-1">
        <h1 className="font-bold text-[22px] sm:text-[28px] tracking-tight" style={{ color: 'var(--color-forest)' }}>{listName}</h1>
        {done.length > 0 && (
          <button onClick={() => setShowCompleted(!showCompleted)} className="font-semibold text-[11px] tracking-[0.07em]" style={{ color: 'var(--color-gold)' }}>
            {done.length} COMPLETED · {showCompleted ? "HIDE" : "SHOW"}
          </button>
        )}
      </div>

      {inAll && (
        <div className="mt-2 rounded-lg px-3 py-2 text-[12px]" style={{ background: 'var(--color-sage-pale)', color: 'var(--color-pine)' }}>
          <ArrowUpDown size={12} className="inline mr-1" /> Reordering happens inside a branch or arborist list. Open one to drag.
        </div>
      )}

      <div className="mt-4 flex flex-col">
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={mainOpen.map(i => i.id)}
            strategy={verticalListSortingStrategy}
          >
            {mainOpen.map((item, idx) => {
              const canEdit = isManager || item.created_by === currentUser.id || item.assignee_id === currentUser.id
              return (
                <SortableItem
                  key={item.id}
                  item={item}
                  index={idx}
                  isManager={isManager}
                  inAll={inAll}
                  canEdit={canEdit}
                  onToggleStatus={onToggleStatus}
                  onClick={() => onDetailClick(item.id)}
                />
              )
            })}
          </SortableContext>
        </DndContext>

        {showCompleted && mainDone.map((item) => {
          const canEdit = isManager || item.created_by === currentUser.id || item.assignee_id === currentUser.id
          return (
            <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 opacity-65 mb-2">
              <span style={{ width: 16 }} />
              <button 
                onClick={() => onToggleStatus(item)} 
                disabled={!canEdit}
                className="flex items-center justify-center rounded-full shrink-0 text-white disabled:opacity-50 disabled:cursor-not-allowed" 
                style={{ width: 18, height: 18, background: 'var(--color-brand)' }} 
                aria-label="Reopen"
              >
                <Check size={11} />
              </button>
              <span className="line-through text-[13.5px]" style={{ color: '#5F7A5F' }}>{item.title}</span>
              <span className="ml-auto text-[11px]" style={{ color: '#9AAA9A' }}>
                Completed {item.completer?.name ? `· ${item.completer.name}` : ''}
              </span>
            </div>
          )
        })}

        {!inAll && (
          <div className="flex items-center gap-3 rounded-xl px-4 py-2.5 mt-2" style={{ border: "1.5px dashed #C9D4C4" }}>
            <span className="rounded-full shrink-0" style={{ width: 18, height: 18, border: "1.5px dashed #B9C5B9" }} />
            <input 
              value={newTitle} 
              onChange={(e) => setNewTitle(e.target.value)} 
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="Add a priority… joins the bottom of the list"
              className="flex-1 bg-transparent outline-none text-[13px]" 
              style={{ color: 'var(--color-forest)' }} 
            />
            <button onClick={handleAdd} aria-label="Add"><Plus size={16} style={{ color: 'var(--color-gold)' }} /></button>
          </div>
        )}
        
        {!isManager && !inAll && (
          <div className="text-[11.5px] pl-1 mt-2" style={{ color: '#9AAA9A' }}>New items always join the bottom; only managers reorder.</div>
        )}

        {subLists.map(subList => {
          const subOpen = open.filter(i => i.list_id === subList.id)
          const subDone = done.filter(i => i.list_id === subList.id)
          
          if (subOpen.length === 0 && subDone.length === 0) return null

          return (
            <div key={subList.id} className="mt-8">
              <h3 className="font-bold text-[14px] mb-3 uppercase tracking-wider" style={{ color: 'var(--color-slate)', opacity: 0.8 }}>
                {subList.name}
              </h3>
              {subOpen.map((item, idx) => {
                const canEdit = isManager || item.created_by === currentUser.id || item.assignee_id === currentUser.id
                return (
                  <StaticItem
                    key={item.id}
                    item={item}
                    index={idx}
                    isManager={isManager}
                    inAll={true} 
                    canEdit={canEdit}
                    onToggleStatus={onToggleStatus}
                    onClick={() => onDetailClick(item.id)}
                  />
                )
              })}
              {showCompleted && subDone.map((item) => {
                const canEdit = isManager || item.created_by === currentUser.id || item.assignee_id === currentUser.id
                return (
                  <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 opacity-65 mb-2">
                    <span style={{ width: 16 }} />
                    <button 
                      onClick={() => onToggleStatus(item)} 
                      disabled={!canEdit}
                      className="flex items-center justify-center rounded-full shrink-0 text-white disabled:opacity-50 disabled:cursor-not-allowed" 
                      style={{ width: 18, height: 18, background: 'var(--color-brand)' }} 
                      aria-label="Reopen"
                    >
                      <Check size={11} />
                    </button>
                    <span className="line-through text-[13.5px]" style={{ color: '#5F7A5F' }}>{item.title}</span>
                    <span className="ml-auto text-[11px]" style={{ color: '#9AAA9A' }}>
                      Completed {item.completer?.name ? `· ${item.completer.name}` : ''}
                    </span>
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </main>
  )
}
