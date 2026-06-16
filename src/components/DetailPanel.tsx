import { useState } from 'react'
import { X, Clock, UploadCloud, Calendar } from 'lucide-react'
import { Item, User } from '@/lib/types'
import { createClient } from '@/utils/supabase/client'
import { trackEvent } from '@/utils/amplitude'

interface Props {
  itemId: string
  items: Item[]
  onClose: () => void
  onToggleStatus: (item: Item) => void
  onUpdateItem?: (id: string, updates: Partial<Item>) => void
  currentUser: User
}

export default function DetailPanel({ itemId, items, onClose, onToggleStatus, onUpdateItem, currentUser }: Props) {
  const supabase = createClient()
  const detail = items.find(i => i.id === itemId)
  const isManager = currentUser.role === 'manager' || currentUser.role === 'admin'
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  if (!detail) return null

  const notesText = typeof detail.notes === 'string' 
    ? detail.notes 
    : (detail.notes?.content?.[0]?.content?.[0]?.text || 'Add notes…')

  const uploadFiles = async (files: File[]) => {
    setIsUploading(true)
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        const ext = file.name.split('.').pop() || 'png'
        const fileName = `${itemId}/${crypto.randomUUID()}.${ext}`
        
        const { data } = await supabase.storage.from('item_images').upload(fileName, file)
        if (data) {
          const { data: { publicUrl } } = supabase.storage.from('item_images').getPublicUrl(fileName)
          await supabase.from('item_images').insert({
            item_id: itemId,
            storage_path: fileName,
            thumb_path: publicUrl,
            uploaded_by: currentUser.id
          })
        }
      }
    }
    setIsUploading(false)
  }

  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items
    const files: File[] = []
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const f = items[i].getAsFile()
        if (f) files.push(f)
      }
    }
    if (files.length > 0) uploadFiles(files)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) uploadFiles(files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  return (
    <aside 
      className="shrink-0 bg-white px-5 py-5 overflow-y-auto" 
      style={{ width: 290, borderLeft: '1px solid var(--color-sage-pale)' }}
      onPaste={handlePaste}
    >
      <div className="flex items-start justify-between">
        <h2 className="font-bold pr-3 text-[17px]" style={{ color: 'var(--color-forest)' }}>{detail.title}</h2>
        <button onClick={onClose} aria-label="Close" className="text-slate/50 hover:text-slate">
          <X size={16} />
        </button>
      </div>

      <textarea 
        key={`notes-${detail.id}`}
        defaultValue={notesText}
        placeholder="Add notes..."
        className="mt-3 rounded-lg p-3 min-h-[64px] text-[12.5px] w-full resize-none focus:outline-none focus:ring-1" 
        style={{ background: 'var(--color-cream)', color: '#5F7A5F', outlineColor: 'var(--color-brand)' }}
        onBlur={(e) => {
          if (e.target.value !== notesText && onUpdateItem) {
            onUpdateItem(detail.id, { notes: e.target.value })
          }
        }}
      />

      {detail.links && detail.links.length > 0 && (
        <div className="mt-3">
          {detail.links.map(link => (
            <div key={link.id} className="rounded-lg p-3 mb-2" style={{ border: '1px solid var(--color-sage-pale)' }}>
              <div className="font-semibold text-[11px] tracking-[0.06em]" style={{ color: '#9AAA9A' }}>LINKED RECORD</div>
              <div className="mt-1 text-[12.5px]" style={{ color: 'var(--color-forest)' }}>{link.system} — {link.cached_label}</div>
              <button className="mt-2 rounded-full px-3 py-1 font-semibold text-white text-[10px] tracking-[0.06em]" style={{ background: 'var(--color-slate)' }}>
                REFRESH STATUS
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <div className="font-semibold text-[11px] tracking-[0.06em]" style={{ color: '#9AAA9A' }}>DUE DATE</div>
        <div className="mt-1.5 flex items-center relative">
          <Calendar size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: detail.due_date ? 'var(--color-forest)' : '#9AAA9A' }} />
          <input 
            type="date"
            className="text-[12.5px] py-1.5 pr-2 pl-8 rounded-md border border-sage-light focus:outline-none focus:border-brand w-full bg-cream text-forest cursor-pointer transition-colors"
            style={{ color: detail.due_date ? 'var(--color-forest)' : '#9AAA9A', background: 'var(--color-cream)', borderColor: 'var(--color-sage-pale)' }}
            value={detail.due_date ? detail.due_date.split('T')[0] : ''}
            onChange={(e) => {
              const val = e.target.value
              if (onUpdateItem) onUpdateItem(detail.id, { due_date: val ? new Date(val).toISOString() : null })
            }}
          />
        </div>
      </div>

      <div className="mt-4">
        <div className="font-semibold text-[11px] tracking-[0.06em]" style={{ color: '#9AAA9A' }}>IMAGES</div>
        <div 
          className="flex gap-1.5 mt-1.5 flex-wrap"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {detail.images?.map(img => (
            <img key={img.id} src={img.thumb_path || img.storage_path} className="rounded-md w-[62px] h-[46px] object-cover bg-sage-light cursor-pointer" alt="thumbnail" />
          ))}
          <label className={`rounded-md w-[62px] h-[46px] flex items-center justify-center border border-dashed transition-colors cursor-pointer ${isDragging ? 'border-brand bg-sage-pale' : 'border-sage-light'}`} style={{ color: isDragging ? 'var(--color-brand)' : 'var(--color-sage)' }}>
            <input type="file" multiple accept="image/*" className="hidden" onChange={(e) => {
              if (e.target.files) uploadFiles(Array.from(e.target.files))
            }} />
            {isUploading ? <span className="text-[10px]">...</span> : <UploadCloud size={16} />}
          </label>
        </div>
        <div className="text-[10px] mt-1" style={{ color: 'var(--color-sage)' }}>Paste, drop, or click to upload images</div>
      </div>

      <div className="mt-4">
        <div className="font-semibold text-[11px] tracking-[0.06em]" style={{ color: '#9AAA9A' }}>ACTIVITY</div>
        <div className="mt-2 flex flex-col gap-2">
          {detail.activity && detail.activity.length > 0 ? (
            detail.activity.map(a => (
              <div key={a.id} className="flex items-start gap-2 text-[12px]" style={{ color: '#5F7A5F' }}>
                <Clock size={12} className="mt-0.5 shrink-0" style={{ color: 'var(--color-sage)' }} />
                <span>
                  <span className="font-semibold" style={{ color: 'var(--color-forest)' }}>{a.actor?.name || 'Someone'}</span> 
                  {' '}{a.action.replace('_', ' ')}
                  {' '}{new Date(a.created_at).toLocaleDateString()}
                </span>
              </div>
            ))
          ) : (
            <div className="flex items-start gap-2 text-[12px]" style={{ color: '#5F7A5F' }}>
              <Clock size={12} className="mt-0.5 shrink-0" style={{ color: 'var(--color-sage)' }} />
              <span>— no activity yet</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <button 
          onClick={() => {
            onToggleStatus(detail)
            trackEvent('item_completed', { item_id: detail.id, status: detail.status === 'open' ? 'completed' : 'open' })
          }}
          className="rounded-full font-semibold tracking-wider text-white text-[10.5px] px-[14px] py-[6px]"
          style={{ background: 'var(--color-brand)' }}>
          {detail.status === 'open' ? 'COMPLETE' : 'REOPEN'}
        </button>
        {isManager && (
          <button 
            className="rounded-full font-semibold tracking-wider text-white text-[10.5px] px-[14px] py-[6px]"
            style={{ background: 'var(--color-terracotta)' }}>
            PIN TO TOP
          </button>
        )}
      </div>
    </aside>
  )
}
