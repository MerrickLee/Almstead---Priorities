'use client'

import { useState } from 'react'
import { Branch, List, Item } from '@/lib/types'
import { ChevronRight, ChevronDown, Mail, GripVertical, Pencil } from 'lucide-react'
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
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { createClient } from '@/utils/supabase/client'

export default function Sidebar({
  branches,
  setBranches,
  lists,
  setLists,
  items,
  activeListId,
  setActiveListId,
  isAdmin,
  onAddBranch,
  onAddList,
}: {
  branches: Branch[]
  setBranches?: React.Dispatch<React.SetStateAction<Branch[]>>
  lists: List[]
  setLists?: React.Dispatch<React.SetStateAction<List[]>>
  items: Item[]
  activeListId: string
  setActiveListId: (id: string) => void
  isAdmin?: boolean
  onAddBranch?: (name: string) => void
  onAddList?: (name: string, branchId: string) => void
  onEditBranch?: (id: string, newName: string) => void
  onEditList?: (id: string, newName: string) => void
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const supabase = createClient()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const countFor = (id: string) => {
    return items.filter(i => {
      if (i.status !== 'open') return false
      if (id === 'all') return true
      if (i.list_id === id) return true
      const branchLists = lists.filter(l => l.branch_id === id)
      return branchLists.some(l => l.id === i.list_id)
    }).length
  }

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id || !isAdmin) return

    const activeIdStr = String(active.id)
    const overIdStr = String(over.id)

    if (active.data.current?.type === 'branch') {
      const oldIndex = branches.findIndex(b => b.id === activeIdStr)
      const newIndex = branches.findIndex(b => b.id === overIdStr)
      if (oldIndex !== -1 && newIndex !== -1) {
        const newArr = arrayMove(branches, oldIndex, newIndex)
        let newSortOrder = 0
        if (newIndex === 0) newSortOrder = newArr[1].sort_order - 1024
        else if (newIndex === newArr.length - 1) newSortOrder = newArr[newArr.length - 2].sort_order + 1024
        else newSortOrder = (newArr[newIndex - 1].sort_order + newArr[newIndex + 1].sort_order) / 2

        const activeBranch = branches[oldIndex]
        if (setBranches) {
          setBranches(prev => prev.map(b => b.id === activeBranch.id ? { ...b, sort_order: newSortOrder } : b).sort((a, b) => a.sort_order - b.sort_order))
        }
        await supabase.from('branches').update({ sort_order: newSortOrder }).eq('id', activeBranch.id)
      }
    } 
    else if (active.data.current?.type === 'list') {
      const branchId = active.data.current.branchId
      const branchLists = lists.filter(l => l.branch_id === branchId && l.type === 'arborist')
      const oldIndex = branchLists.findIndex(l => l.id === activeIdStr)
      const newIndex = branchLists.findIndex(l => l.id === overIdStr)
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newArr = arrayMove(branchLists, oldIndex, newIndex)
        let newSortOrder = 0
        if (newIndex === 0) newSortOrder = newArr[1].sort_order - 1024
        else if (newIndex === newArr.length - 1) newSortOrder = newArr[newArr.length - 2].sort_order + 1024
        else newSortOrder = (newArr[newIndex - 1].sort_order + newArr[newIndex + 1].sort_order) / 2

        const activeList = branchLists[oldIndex]
        if (setLists) {
          setLists(prev => prev.map(l => l.id === activeList.id ? { ...l, sort_order: newSortOrder } : l).sort((a, b) => a.sort_order - b.sort_order))
        }
        await supabase.from('lists').update({ sort_order: newSortOrder }).eq('id', activeList.id)
      }
    }
  }

  return (
    <aside className="shrink-0 py-4 flex flex-col overflow-y-auto" style={{ width: 210, background: 'var(--color-cream)', borderRight: '1px solid #E3E1D4' }}>
      <SidebarRow 
        label="All" 
        count={countFor('all')} 
        active={activeListId === 'all'} 
        onClick={() => setActiveListId('all')} 
      />
      
      <div className="px-4 pt-4 pb-1 font-semibold flex items-center justify-between" style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--color-slate)', opacity: 0.7 }}>
        <span>BRANCHES</span>
        {isAdmin && onAddBranch && (
          <button 
            onClick={() => {
              const name = window.prompt("Enter new branch name:")
              if (name) onAddBranch(name)
            }}
            className="hover:text-[var(--color-forest)] transition-colors"
            title="Add Branch"
          >
            +
          </button>
        )}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={branches.map(b => b.id)} strategy={verticalListSortingStrategy}>
          {branches.map(b => {
            const branchLists = lists.filter(l => l.branch_id === b.id)
            const mainList = branchLists.find(l => l.type === 'branch')
            const arboristLists = branchLists.filter(l => l.type === 'arborist')
            const listId = mainList ? mainList.id : b.id
            
            return (
              <SortableSidebarBranch
                key={b.id}
                branch={b}
                listId={listId}
                count={countFor(b.id)}
                activeListId={activeListId}
                setActiveListId={setActiveListId}
                arboristLists={arboristLists}
                expanded={!!expanded[b.id]}
                toggleExpand={toggleExpand}
                isAdmin={isAdmin}
                onAddList={onAddList}
                onEditBranch={onEditBranch}
                onEditList={onEditList}
                countFor={countFor}
              />
            )
          })}
        </SortableContext>
      </DndContext>

      <div className="mx-3 mt-auto mb-4 rounded-xl bg-white p-3" style={{ border: '1px solid #E3E1D4', fontSize: 11.5, color: '#5F7A5F', lineHeight: 1.5 }}>
        <Mail size={13} className="mb-1" style={{ color: 'var(--color-gold)' }} />
        <div>Weekly digest · Mon 7:00 AM</div>
        <div style={{ color: '#9AAA9A' }}>Subscribed to 2 lists</div>
      </div>
    </aside>
  )
}

function SortableSidebarBranch({ branch, listId, count, activeListId, setActiveListId, arboristLists, expanded, toggleExpand, isAdmin, onAddList, onEditBranch, onEditList, countFor }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: branch.id,
    data: { type: 'branch' },
    disabled: !isAdmin
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
    position: 'relative' as const,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <SidebarRow 
        label={branch.name} 
        count={count} 
        active={activeListId === listId}
        onClick={() => setActiveListId(listId)}
        caret={arboristLists.length > 0}
        expandedCaret={expanded}
        onCaret={(e: React.MouseEvent) => toggleExpand(branch.id, e)}
        isAdmin={isAdmin}
        onAddList={() => {
          const name = window.prompt(`Enter arborist/list name for ${branch.name}:`)
          if (name && onAddList) onAddList(name, branch.id)
        }}
        onEditName={() => {
          const newName = window.prompt("Edit branch name:", branch.name)
          if (newName && onEditBranch) onEditBranch(branch.id, newName)
        }}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
      
      {expanded && (
        <SortableContext items={arboristLists.map((l: List) => l.id)} strategy={verticalListSortingStrategy}>
          {arboristLists.map((al: List) => (
            <SortableSidebarList
              key={al.id}
              list={al}
              count={countFor(al.id)}
              activeListId={activeListId}
              setActiveListId={setActiveListId}
              isAdmin={isAdmin}
              onEditList={onEditList}
            />
          ))}
        </SortableContext>
      )}
    </div>
  )
}

function SortableSidebarList({ list, count, activeListId, setActiveListId, isAdmin, onEditList }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: list.id,
    data: { type: 'list', branchId: list.branch_id },
    disabled: !isAdmin
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style}>
      <SidebarRow 
        label={list.name} 
        count={count} 
        active={activeListId === list.id} 
        nested 
        onClick={() => setActiveListId(list.id)} 
        isAdmin={isAdmin}
        onEditName={() => {
          const newName = window.prompt("Edit list name:", list.name)
          if (newName && onEditList) onEditList(list.id, newName)
        }}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}

function SidebarRow({ label, count, active, onClick, nested, caret, expandedCaret, onCaret, isAdmin, onAddList, onEditName, dragHandleProps }: any) {
  const [isHovered, setIsHovered] = useState(false)
  
  return (
    <div className="flex items-center justify-between cursor-pointer group"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        padding: nested ? '6px 16px 6px 34px' : '7px 16px 7px 13px',
        fontSize: nested ? 12.5 : 13,
        fontWeight: active ? 600 : 400,
        color: active ? 'var(--color-forest)' : nested ? '#4A5C4A' : 'var(--color-slate)',
        background: active ? 'var(--color-sage-pale)' : 'transparent',
        borderLeft: active ? '3px solid var(--color-brand)' : '3px solid transparent',
      }}>
      <span className="flex items-center gap-1 -ml-2">
        {isAdmin && dragHandleProps ? (
          <div {...dragHandleProps} className="opacity-0 group-hover:opacity-40 hover:!opacity-100 cursor-grab active:cursor-grabbing p-1 transition-opacity" onClick={(e) => e.stopPropagation()}>
            <GripVertical size={13} />
          </div>
        ) : (
          <div className="w-[21px]" />
        )}
        {caret && (
          <button onClick={onCaret} aria-label="Expand" className="text-[var(--color-slate)]/60 hover:text-[var(--color-slate)] -ml-1 mr-1">
            {expandedCaret ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
        )}
        {label}
      </span>
      <div className="flex items-center gap-2">
        {isAdmin && onEditName && isHovered && (
          <button 
            onClick={(e) => { e.stopPropagation(); onEditName() }} 
            className="text-[var(--color-slate)] hover:text-black opacity-40 hover:opacity-100 transition-opacity leading-none"
            title="Edit Name"
          >
            <Pencil size={11} />
          </button>
        )}
        {isAdmin && onAddList && !nested && isHovered && (
          <button 
            onClick={(e) => { e.stopPropagation(); onAddList() }} 
            className="text-[var(--color-gold)] hover:text-yellow-600 text-[14px] leading-none"
            title="Add List"
          >
            +
          </button>
        )}
        <span style={{ color: '#9AAA9A', fontWeight: 400 }}>{count}</span>
      </div>
    </div>
  )
}
