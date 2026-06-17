'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Branch, List, Item, User } from '@/lib/types'
import { initAmplitude, trackEvent } from '@/utils/amplitude'
import Header from './Header'
import Sidebar from './Sidebar'
import MainList from './MainList'
import DetailPanel from './DetailPanel'
import AddItemModal from './AddItemModal'
import ImpersonationBanner from './ImpersonationBanner'
import EmlImportModal from './EmlImportModal'
import { UploadCloud } from 'lucide-react'

export default function AppContainer({ currentUser, impersonatingUser }: { currentUser: User, impersonatingUser?: User | null }) {
  const supabase = createClient()
  const [branches, setBranches] = useState<Branch[]>([])
  const [lists, setLists] = useState<List[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [activeListId, setActiveListId] = useState<string>('all')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isDragOverPage, setIsDragOverPage] = useState(false)
  const [emlData, setEmlData] = useState<{
    title: string
    notes: string
    listId: string
    images: {
      filename: string
      mimeType: string
      content: ArrayBuffer
      size: number
      previewUrl: string
      selected: boolean
    }[]
  } | null>(null)

  useEffect(() => {
    const handleDragOverWindow = (e: DragEvent) => {
      e.preventDefault()
      if (e.dataTransfer?.types.includes('Files')) {
        setIsDragOverPage(true)
      }
    }

    const handleDropWindow = (e: DragEvent) => {
      e.preventDefault()
      setIsDragOverPage(false)
    }

    window.addEventListener('dragover', handleDragOverWindow)
    window.addEventListener('drop', handleDropWindow)

    return () => {
      window.removeEventListener('dragover', handleDragOverWindow)
      window.removeEventListener('drop', handleDropWindow)
    }
  }, [])

  const handleDropEml = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOverPage(false)

    const file = e.dataTransfer.files[0]
    if (!file) return

    if (!file.name.endsWith('.eml')) {
      alert('Please drop an email (.eml) file.')
      return
    }

    try {
      const PostalMime = (await import('postal-mime')).default
      const parser = new PostalMime()
      const parsed = await parser.parse(file)

      // Clean subject prefix (Fwd:, Re:, etc.)
      const cleanSubject = parsed.subject ? parsed.subject.replace(/^(fwd|re|fw|reply|forward):\s*/i, '') : 'Untitled Priority'
      
      const bodyText = parsed.text || ''

      const imageAttachments = parsed.attachments
        .filter(a => a.mimeType.startsWith('image/'))
        .map(a => {
          const blob = new Blob([a.content as any], { type: a.mimeType })
          const url = URL.createObjectURL(blob)
          return {
            filename: a.filename || 'image.png',
            mimeType: a.mimeType,
            content: a.content as any,
            size: (a.content as any).byteLength || (a.content as any).length || 0,
            previewUrl: url,
            selected: ((a.content as any).byteLength || (a.content as any).length || 0) > 20000 // default selected if size > 20KB
          }
        })

      setEmlData({
        title: cleanSubject,
        notes: bodyText,
        listId: activeListId !== 'all' ? activeListId : '',
        images: imageAttachments
      })
    } catch (err: any) {
      console.error(err)
      alert('Failed to parse email file: ' + err.message)
    }
  }

  const handleAddEmlComplete = (newItem: Item) => {
    setItems(prev => [...prev.filter(i => i.id !== newItem.id), newItem].sort((a, b) => a.sort_order - b.sort_order))
  }

  const isManager = currentUser.role === 'manager' || currentUser.role === 'admin'
  const isAdmin = currentUser.role === 'admin'

  useEffect(() => {
    initAmplitude()
    trackEvent('list_viewed', { list_id: 'all' })
    async function fetchData() {
      const [bRes, lRes, iRes] = await Promise.all([
        supabase.from('branches').select('*').order('sort_order', { ascending: true }),
        supabase.from('lists').select('*').order('sort_order', { ascending: true }),
        supabase.from('items').select(`
          *,
          activity:activity_log(*, actor:users(name)),
          images:item_images(*)
        `).order('sort_order', { ascending: true })
      ])

      if (bRes.data) setBranches(bRes.data as Branch[])
      if (lRes.data) setLists(lRes.data as List[])
      if (iRes.data) setItems(iRes.data as Item[])
    }
    fetchData()
  }, [])

  useEffect(() => {
    const channel = supabase.channel('items_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, async (payload) => {
        if (payload.eventType === 'INSERT') {
          const { data } = await supabase.from('items').select('*, activity:activity_log(*, actor:users(name)), images:item_images(*)').eq('id', payload.new.id).single()
          if (data) setItems(prev => [...prev.filter(i => i.id !== data.id), data as Item].sort((a, b) => a.sort_order - b.sort_order))
        } else if (payload.eventType === 'UPDATE') {
          const { data } = await supabase.from('items').select('*, activity:activity_log(*, actor:users(name)), images:item_images(*)').eq('id', payload.new.id).single()
          if (data) setItems(prev => prev.map(i => i.id === data.id ? data as Item : i).sort((a, b) => a.sort_order - b.sort_order))
        } else if (payload.eventType === 'DELETE') {
          setItems(prev => prev.filter(i => i.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const handleToggleStatus = async (item: Item) => {
    const isManager = currentUser.role === 'manager' || currentUser.role === 'admin'
    const canEdit = isManager || item.created_by === currentUser.id || item.assignee_id === currentUser.id
    if (!canEdit) return

    const newStatus = item.status === 'open' ? 'completed' : 'open'
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: newStatus } : i))
    await supabase.from('items').update({ status: newStatus }).eq('id', item.id)
  }

  const handleUpdateItem = async (id: string, updates: Partial<Item>) => {
    const item = items.find(i => i.id === id)
    if (!item) return
    const isManager = currentUser.role === 'manager' || currentUser.role === 'admin'
    const canEdit = isManager || item.created_by === currentUser.id || item.assignee_id === currentUser.id
    if (!canEdit) return

    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i))
    await supabase.from('items').update(updates).eq('id', id)
  }

  const handleAddItem = async (title: string, listId: string) => {
    if (!title.trim()) return
    const tempId = crypto.randomUUID()
    const tempItem: Item = {
      id: tempId,
      list_id: listId,
      title,
      status: 'open',
      sort_order: 999999,
      pinned: false,
      source: 'manual',
      created_by: currentUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      images: [],
      links: [],
      tags: [],
      activity: []
    }
    setItems(prev => [...prev, tempItem])
    
    await supabase.from('items').insert({
      title,
      list_id: listId,
      status: 'open',
      created_by: currentUser.id
    })
    trackEvent('item_added', { list_id: listId, source: 'manual' })
  }

  const handleAddBranch = async (name: string) => {
    if (!name.trim() || !isAdmin) return
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).slice(2, 6)
    const sort_order = branches.length > 0 ? Math.max(...branches.map(b => b.sort_order || 0)) + 1024 : 1024
    const newBranch: Branch = { id, name, sort_order }
    setBranches(prev => [...prev, newBranch])
    await supabase.from('branches').insert({ id, name, sort_order })
    
    // Auto-create a main list for the branch
    const listId = id + '-main'
    const mainList: List = { id: listId, branch_id: id, type: 'branch', name: name + ' Main', archived: false, sort_order: 0 }
    setLists(prev => [...prev, mainList])
    await supabase.from('lists').insert({ id: listId, branch_id: id, type: 'branch', name: name + ' Main', archived: false, sort_order: 0 })
  }

  const handleAddList = async (name: string, branchId: string) => {
    if (!name.trim() || !isAdmin) return
    const id = branchId + '-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Math.random().toString(36).slice(2, 6)
    const branchLists = lists.filter(l => l.branch_id === branchId)
    const sort_order = branchLists.length > 0 ? Math.max(...branchLists.map(l => l.sort_order || 0)) + 1024 : 1024
    const newList: List = { id, branch_id: branchId, type: 'arborist', name, archived: false, sort_order }
    setLists(prev => [...prev, newList])
    await supabase.from('lists').insert({ id, branch_id: branchId, type: 'arborist', name, archived: false, sort_order })
  }

  const handleEditBranch = async (id: string, newName: string) => {
    if (!newName.trim() || !isAdmin) return
    setBranches(prev => prev.map(b => b.id === id ? { ...b, name: newName } : b))
    await supabase.from('branches').update({ name: newName }).eq('id', id)
  }

  const handleEditList = async (id: string, newName: string) => {
    if (!newName.trim() || !isAdmin) return
    setLists(prev => prev.map(l => l.id === id ? { ...l, name: newName } : l))
    await supabase.from('lists').update({ name: newName }).eq('id', id)
  }

  const filteredItems = items.filter(i => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return i.title.toLowerCase().includes(q) || (typeof i.notes === 'string' && i.notes.toLowerCase().includes(q))
  })

  return (
    <div className="flex flex-col h-screen w-full font-sans">
      {isDragOverPage && (
        <div 
          onDragLeave={() => setIsDragOverPage(false)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDropEml}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#0C2A1E]/85 backdrop-blur-md border-4 border-dashed border-[#B8860B] m-4 rounded-2xl animate-pulse"
        >
          <div className="text-center p-8 bg-white/10 rounded-3xl max-w-md">
            <UploadCloud size={64} className="mx-auto text-[#B8860B] mb-4 animate-bounce" />
            <h2 className="text-2xl font-bold text-white mb-2 font-sans">Drop EML File Here</h2>
            <p className="text-white/80 text-sm">We'll automatically extract the subject, synopsis, and images to create a priority task.</p>
          </div>
        </div>
      )}
      {impersonatingUser && <ImpersonationBanner impersonatedUser={currentUser} />}
      <Header currentUser={currentUser} searchQuery={searchQuery} setSearchQuery={setSearchQuery} onAddItemClick={() => setIsAddItemModalOpen(true)} onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar 
          isOpen={isSidebarOpen}
          setIsOpen={setIsSidebarOpen}
          branches={branches} 
          setBranches={setBranches}
          lists={lists} 
          setLists={setLists}
          items={items} 
          activeListId={activeListId} 
          setActiveListId={setActiveListId} 
          isAdmin={isAdmin}
          onAddBranch={handleAddBranch}
          onAddList={handleAddList}
          onEditBranch={handleEditBranch}
          onEditList={handleEditList}
        />
        <MainList 
          currentUser={currentUser}
          listId={activeListId}
          lists={lists}
          branches={branches}
          items={filteredItems}
          showCompleted={showCompleted}
          setShowCompleted={setShowCompleted}
          onToggleStatus={handleToggleStatus}
          onAddItem={handleAddItem}
          onDetailClick={setDetailId}
          setItems={setItems}
        />
        {detailId && (
          <DetailPanel 
            itemId={detailId} 
            items={items} 
            onClose={() => setDetailId(null)}
            onToggleStatus={handleToggleStatus}
            onUpdateItem={handleUpdateItem}
            currentUser={currentUser}
          />
        )}
      </div>

      {isAddItemModalOpen && (
        <AddItemModal 
          branches={branches}
          lists={lists}
          onClose={() => setIsAddItemModalOpen(false)}
          onAdd={handleAddItem}
        />
      )}

      {emlData && (
        <EmlImportModal 
          branches={branches}
          lists={lists}
          currentUser={currentUser}
          emlData={emlData}
          onClose={() => setEmlData(null)}
          onAddComplete={handleAddEmlComplete}
        />
      )}
    </div>
  )
}
