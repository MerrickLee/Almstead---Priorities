'use client'

import { useTransition, useState } from 'react'
import { Branch, Role, User } from '@/lib/types'
import { updateUserPermissions } from './actions'

interface Props {
  user: User
  branches: Branch[]
  currentUser: User
}

export default function UserRow({ user, branches, currentUser }: Props) {
  const [isPending, startTransition] = useTransition()
  const [optimisticRole, setOptimisticRole] = useState<Role>(user.role)
  const [optimisticBranch, setOptimisticBranch] = useState<string | null>(user.branch_id || null)

  const handleRoleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRole = e.target.value as Role
    setOptimisticRole(newRole)
    startTransition(() => {
      updateUserPermissions(user.id, newRole, optimisticBranch)
    })
  }

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newBranchId = e.target.value === 'unassigned' ? null : e.target.value
    setOptimisticBranch(newBranchId)
    startTransition(() => {
      updateUserPermissions(user.id, optimisticRole, newBranchId)
    })
  }

  const isSelf = user.id === currentUser.id

  const initials = user.name.substring(0, 2).toUpperCase()
  
  return (
    <div className={`flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors ${isPending ? 'opacity-50' : ''}`}>
      <div className="flex items-center gap-4 flex-1">
        <div className="flex items-center justify-center rounded-full font-bold text-[#1a2f24] bg-[#E8EFEA]" 
             style={{ width: 40, height: 40, fontSize: 14 }}>
          {initials}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#1a2f24]">{user.name}</span>
            {isSelf && <span className="text-[10px] font-bold text-[#2C4A3A]/40 uppercase tracking-wider">(YOU)</span>}
          </div>
          <div className="text-sm text-[#2C4A3A]/60">{user.email}</div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Branch Selector */}
        <select 
          value={optimisticBranch || 'unassigned'}
          onChange={handleBranchChange}
          disabled={isPending}
          className="bg-[#E8EFEA] hover:bg-[#D1E0D5] text-[#1a2f24] text-xs font-semibold px-3 py-1.5 rounded-full outline-none transition-colors appearance-none cursor-pointer pr-8 relative"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%231a2f24' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
        >
          <option value="unassigned">No Branch</option>
          {branches.map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        {/* Role Selector */}
        <select 
          value={optimisticRole}
          onChange={handleRoleChange}
          disabled={isSelf || isPending}
          className={`text-white text-xs font-semibold px-3 py-1.5 rounded-full outline-none transition-colors appearance-none cursor-pointer pr-8 ${isSelf ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{ 
            background: optimisticRole === 'admin' ? 'var(--color-forest)' : '#2C4A3A',
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`, 
            backgroundRepeat: 'no-repeat', 
            backgroundPosition: 'right 10px center' 
          }}
        >
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="member">Member</option>
        </select>
      </div>
    </div>
  )
}
