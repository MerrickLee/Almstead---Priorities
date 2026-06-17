'use client'

import { useState } from 'react'
import Header from '@/components/Header'
import { Branch, User } from '@/lib/types'
import UserRow from './UserRow'
import { inviteUser } from './actions'

interface Props {
  currentUser: User
  users: User[]
  branches: Branch[]
}

export default function SettingsContainer({ currentUser, users, branches }: Props) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isInviting, setIsInviting] = useState(false)

  const handleInvite = async () => {
    const email = window.prompt("Enter the email address of the teammate to invite:")
    if (!email) return

    setIsInviting(true)
    try {
      const result = await inviteUser(email)
      if (result.success) {
        alert("Invitation sent successfully!")
      } else {
        alert(result.error || "Failed to invite user")
      }
    } catch (e: any) {
      alert(e.message || "An unexpected error occurred")
    } finally {
      setIsInviting(false)
    }
  }

  const filteredUsers = users.filter(u => 
    !searchQuery || 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex flex-col min-h-screen w-full font-sans" style={{ background: 'var(--color-paper)' }}>
      <Header currentUser={currentUser} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />
      
      <main className="flex-1 max-w-5xl mx-auto w-full p-8 pt-12">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h3 className="text-[11px] font-bold tracking-widest text-[#2C4A3A]/60 uppercase mb-2">SETTINGS</h3>
            <h1 className="text-3xl font-bold text-[#1a2f24] mb-3">Team & permissions</h1>
            <p className="text-[#2C4A3A]/70">Approve new teammates, manage roles, and assign branches.</p>
          </div>
          <button 
            onClick={handleInvite}
            disabled={isInviting}
            className="px-5 py-2 rounded-full text-sm font-semibold text-white transition-colors disabled:opacity-50"
            style={{ background: 'var(--color-brand)' }}
          >
            {isInviting ? 'Inviting...' : '+ Invite Teammate'}
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-black/5 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-black/5 bg-gray-50/50">
            <h2 className="text-xs font-bold tracking-widest text-[#2C4A3A]/60 uppercase">ACTIVE TEAM</h2>
            <span className="text-sm text-[#2C4A3A]/60">{filteredUsers.length} members</span>
          </div>
          <div className="divide-y divide-black/5">
            {filteredUsers.map(user => (
              <UserRow key={user.id} user={user} branches={branches} currentUser={currentUser} />
            ))}
            {filteredUsers.length === 0 && (
              <div className="px-6 py-8 text-center text-[#2C4A3A]/50 text-sm">
                No teammates found.
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
