'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { User } from '@/lib/types'
import { setViewAsUser } from '@/app/actions'
import { X, Search } from 'lucide-react'

interface Props {
  onClose: () => void
}

export default function ViewAsModal({ onClose }: Props) {
  const [users, setUsers] = useState<User[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function fetchUsers() {
      const { data } = await supabase
        .from('users')
        .select('*')
        .in('role', ['member', 'manager', 'admin'])
        .eq('active', true)
        .order('name')
      
      if (data) {
        setUsers(data as User[])
      }
      setLoading(false)
    }
    fetchUsers()
  }, [])

  const handleSelect = async (userId: string) => {
    await setViewAsUser(userId)
    window.location.reload()
  }

  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-[var(--color-forest)]">View as Teammate</h2>
          <button onClick={onClose} className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-gray-50 border border-gray-200">
            <Search size={16} className="text-gray-400" />
            <input 
              autoFocus
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search teammates..."
              className="bg-transparent outline-none w-full text-sm text-[var(--color-forest)]"
            />
          </div>
        </div>

        <div className="overflow-y-auto p-2 flex-1">
          {loading ? (
            <div className="p-4 text-center text-sm text-gray-500">Loading teammates...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">No teammates found.</div>
          ) : (
            <div className="space-y-1">
              {filteredUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => handleSelect(user.id)}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors text-left group"
                >
                  <div className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white uppercase" 
                      style={{ width: 32, height: 32, background: 'var(--color-brand)', fontSize: 12 }}>
                    {user.name.substring(0, 2)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-[var(--color-forest)] group-hover:text-black">{user.name}</div>
                    <div className="text-xs text-gray-500 capitalize">{user.role}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
