'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { Branch, List, Item, User } from '@/lib/types'
import { initAmplitude, trackEvent } from '@/utils/amplitude'
import Header from './Header'
import Sidebar from './Sidebar'
import MainList from './MainList'
import DetailPanel from './DetailPanel'

export default function AppContainer({ currentUser }: { currentUser: User }) {
  const supabase = createClient()
  const [branches, setBranches] = useState<Branch[]>([])
  const [lists, setLists] = useState<List[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [activeListId, setActiveListId] = useState<string>('all')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const isManager = currentUser.role === 'manager' || currentUser.role === 'admin'
  const isAdmin = currentUser.role === 'admin'

  useEffect(() => {
    initAmplitude()
    trackEvent('list_viewed', { list_id: 'all' })
    async function fetchData() {
      const [bRes, lRes, iRes] = await Promise.all([
        supabase.from('branches').select('*'),
        supabase.from('lists').select('*'),
        supabase.from('items').select(`
          *,
          activity:activity_log(*, actor:users(name))
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
          const { data } = await supabase.from('items').select('*, activity:activity_log(*, actor:users(name))').eq('id', payload.new.id).single()
          if (data) setItems(prev => [...prev.filter(i => i.id !== data.id), data as Item].sort((a, b) => a.sort_order - b.sort_order))
        } else if (payload.eventType === 'UPDATE') {
          const { data } = await supabase.from('items').select('*, activity:activity_log(*, actor:users(name))').eq('id', payload.new.id).single()
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
    const newStatus = item.status === 'open' ? 'completed' : 'open'
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, status: newStatus } : i))
    await supabase.from('items').update({ status: newStatus }).eq('id', item.id)
  }

  const handleAddItem = async (title: string, listId: string) => {
    if (!title.trim() || !isAdmin) return
    const tempId = crypto.randomUUID()
    const tempItem: Item = {
      id: tempId,
      list_id: listId,
      title,
      status: 'open',
      sort_order: 999999,
      pinned: false,
      source: 'manual',
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
      status: 'open'
    })
    trackEvent('item_added', { list_id: listId, source: 'manual' })
  }

  const filteredItems = items.filter(i => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return i.title.toLowerCase().includes(q) || (typeof i.notes === 'string' && i.notes.toLowerCase().includes(q))
  })

  return (
    <div className="flex flex-col h-screen w-full font-sans">
      <Header currentUser={currentUser} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          branches={branches} 
          lists={lists} 
          items={items} 
          activeListId={activeListId} 
          setActiveListId={setActiveListId} 
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
            currentUser={currentUser}
          />
        )}
      </div>
    </div>
  )
}
