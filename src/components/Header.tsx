'use client'

import { Search, Settings, Menu } from 'lucide-react'
import { User } from '@/lib/types'
import Image from 'next/image'
import Link from 'next/link'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import ViewAsModal from './ViewAsModal'
interface Props {
  currentUser: User
  searchQuery: string
  setSearchQuery: (query: string) => void
  onAddItemClick?: () => void
  onToggleSidebar?: () => void
}

export default function Header({ currentUser, searchQuery, setSearchQuery, onAddItemClick, onToggleSidebar }: Props) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isViewAsOpen, setIsViewAsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }
  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-3 shrink-0 bg-white" style={{ borderBottom: '1px solid var(--color-sage-pale)' }}>
      <div className="flex items-center gap-2 md:gap-3">
        <button onClick={onToggleSidebar} className="md:hidden text-forest hover:opacity-70 p-1">
          <Menu size={20} />
        </button>
        <Image src="/horizontal-almstead-logo.png" alt="Almstead" width={140} height={28} className="w-[110px] h-[22px] md:w-[140px] md:h-[28px] object-contain" />
        <span className="hidden md:inline" style={{ color: 'var(--color-forest)', fontSize: 13, borderLeft: '1px solid var(--color-sage-pale)', paddingLeft: 12, fontWeight: 500 }}>Priorities</span>
      </div>
      <div className="flex items-center gap-2 md:gap-3">
        <div className="flex items-center gap-1.5 md:gap-2 rounded-full px-2.5 md:px-3 py-1.5" style={{ background: 'var(--color-sage-pale)' }}>
          <Search size={14} style={{ color: 'var(--color-forest)' }} className="shrink-0" />
          <input 
             value={searchQuery}
             onChange={e => setSearchQuery(e.target.value)}
             placeholder="Search"
             className="bg-transparent outline-none placeholder-gray-400 w-16 sm:w-28 md:w-[140px]"
             style={{ color: 'var(--color-forest)', fontSize: 12 }}
          />
        </div>
        {currentUser.role === 'admin' && (
          <Link href="/settings" className="hidden sm:block transition-colors hover:opacity-70" style={{ color: 'var(--color-forest)' }} title="Settings">
            <Settings size={18} />
          </Link>
        )}
        <button 
          onClick={onAddItemClick}
          className="rounded-full font-semibold tracking-wider text-white px-3 py-1 md:px-4 md:py-1.5 shrink-0"
          style={{ background: 'var(--color-gold)', fontSize: 10.5, letterSpacing: '0.08em' }}>
          <span className="hidden sm:inline">ADD ITEM</span>
          <span className="sm:hidden text-sm leading-none">+</span>
        </button>
        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white uppercase ml-1 md:ml-0 hover:opacity-80 transition-opacity" 
               style={{ width: 28, height: 28, background: 'var(--color-brand)', fontSize: 11 }}>
            {currentUser.name.substring(0, 2)}
          </button>
          
          {isMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
              <div className="px-4 py-2 border-b border-gray-50 mb-1">
                <div className="text-sm font-medium text-[var(--color-forest)] truncate">{currentUser.name}</div>
                <div className="text-xs text-gray-500 capitalize">{currentUser.role}</div>
              </div>
              
              {currentUser.role === 'admin' && (
                <button
                  onClick={() => {
                    setIsMenuOpen(false)
                    setIsViewAsOpen(true)
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-[var(--color-forest)] hover:bg-gray-50 transition-colors"
                >
                  View as Teammate
                </button>
              )}
              
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
      
      {isViewAsOpen && (
        <ViewAsModal onClose={() => setIsViewAsOpen(false)} />
      )}
    </header>
  )
}

