'use client'

import { useState } from 'react'
import { X, Check, Loader2, Calendar } from 'lucide-react'
import { Branch, List, User, Item, ItemImage } from '@/lib/types'
import { createClient } from '@/utils/supabase/client'
import { trackEvent } from '@/utils/amplitude'

interface Props {
  branches: Branch[]
  lists: List[]
  currentUser: User
  emlData: {
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
  }
  onClose: () => void
  onAddComplete: (newItem: Item) => void
}

export default function EmlImportModal({ branches, lists, currentUser, emlData, onClose, onAddComplete }: Props) {
  const supabase = createClient()
  const [title, setTitle] = useState(emlData.title)
  const [notes, setNotes] = useState(emlData.notes)
  const [listId, setListId] = useState(emlData.listId)
  const [images, setImages] = useState(emlData.images)
  const [isSaving, setIsSaving] = useState(false)
  const [savingProgress, setSavingProgress] = useState('')

  const handleToggleImage = (index: number) => {
    setImages(prev => prev.map((img, i) => i === index ? { ...img, selected: !img.selected } : img))
  }

  const handleCreate = async () => {
    if (!title.trim() || !listId || isSaving) return

    try {
      setIsSaving(true)
      setSavingProgress('Creating priority task...')

      // 1. Get list sort order max to append at the bottom
      const { data: maxItems } = await supabase
        .from('items')
        .select('sort_order')
        .eq('list_id', listId)
        .order('sort_order', { ascending: false })
        .limit(1)

      const maxSortOrder = maxItems && maxItems.length > 0 ? maxItems[0].sort_order : 0
      const newSortOrder = maxSortOrder + 1024

      // 2. Insert priority task
      const { data: itemData, error: itemError } = await supabase
        .from('items')
        .insert({
          title: title.trim(),
          notes: notes.trim(),
          list_id: listId,
          status: 'open',
          sort_order: newSortOrder,
          created_by: currentUser.id,
          source: 'manual'
        })
        .select()
        .single()

      if (itemError) throw itemError

      const createdItem = itemData as Item
      const uploadedImages: ItemImage[] = []

      // 3. Upload selected images
      const selectedImages = images.filter(img => img.selected)
      for (let i = 0; i < selectedImages.length; i++) {
        const img = selectedImages[i]
        setSavingProgress(`Uploading attachment ${i + 1} of ${selectedImages.length} (${img.filename})...`)

        const ext = img.filename.split('.').pop() || 'png'
        const fileName = `${createdItem.id}/${crypto.randomUUID()}.${ext}`

        // Convert ArrayBuffer back to File/Blob for upload
        const blob = new Blob([img.content], { type: img.mimeType })
        const file = new File([blob], img.filename, { type: img.mimeType })

        const { error: uploadError } = await supabase.storage
          .from('item_images')
          .upload(fileName, file)

        if (uploadError) {
          console.error(`Failed to upload ${img.filename}:`, uploadError)
          continue
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage.from('item_images').getPublicUrl(fileName)

        // Insert image DB record
        const imageId = crypto.randomUUID()
        const newImage: ItemImage = {
          id: imageId,
          item_id: createdItem.id,
          storage_path: fileName,
          thumb_path: publicUrl,
          uploaded_by: currentUser.id,
          created_at: new Date().toISOString()
        }

        const { error: dbError } = await supabase
          .from('item_images')
          .insert({
            id: newImage.id,
            item_id: newImage.item_id,
            storage_path: newImage.storage_path,
            thumb_path: newImage.thumb_path,
            uploaded_by: newImage.uploaded_by
          })

        if (dbError) {
          console.error(`Failed to record ${img.filename} in database:`, dbError)
          continue
        }

        uploadedImages.push(newImage)
      }

      // 4. Track event and call completion callback
      trackEvent('item_added', { list_id: listId, source: 'email_drag' })
      
      const finalItem: Item = {
        ...createdItem,
        images: uploadedImages,
        links: [],
        tags: [],
        activity: []
      }

      onAddComplete(finalItem)
      onClose()
    } catch (err: any) {
      console.error(err)
      alert('Failed to import email: ' + err.message)
      setIsSaving(false)
    }
  }

  // Format bytes to human readable format
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-black/5 bg-gray-50/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-gold/10 text-gold text-xs font-bold tracking-wider">EMAIL IMPORT</span>
            <h2 className="text-sm font-bold tracking-widest text-[#2C4A3A]/60 uppercase">CREATE PRIORITY FROM EMAIL</h2>
          </div>
          <button onClick={onClose} disabled={isSaving} aria-label="Close" className="text-slate/50 hover:text-slate disabled:opacity-50">
            <X size={18} />
          </button>
        </div>

        {/* Content (Scrollable) */}
        <div className="p-6 flex-1 overflow-y-auto flex flex-col gap-5">
          {/* Title input */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold tracking-wider text-[#2C4A3A]/70 uppercase">Priority Title</label>
            <input 
              value={title}
              disabled={isSaving}
              onChange={e => setTitle(e.target.value)}
              placeholder="Priority Title"
              className="px-3 py-2.5 bg-gray-50 border border-black/10 rounded-lg outline-none focus:border-[var(--color-brand)] text-[14px] text-[#1a2f24] disabled:opacity-75"
            />
          </div>

          {/* List selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold tracking-wider text-[#2C4A3A]/70 uppercase">Assign to List</label>
            <select 
              value={listId}
              disabled={isSaving}
              onChange={e => setListId(e.target.value)}
              className="px-3 py-2.5 bg-gray-50 border border-black/10 rounded-lg outline-none focus:border-[var(--color-brand)] text-[14px] text-[#1a2f24] appearance-none disabled:opacity-75"
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

          {/* Notes synopsis textarea */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold tracking-wider text-[#2C4A3A]/70 uppercase">Email Body / Notes</label>
            <textarea 
              value={notes}
              disabled={isSaving}
              onChange={e => setNotes(e.target.value)}
              placeholder="Email synopsis/details..."
              rows={6}
              className="px-3 py-2.5 bg-gray-50 border border-black/10 rounded-lg outline-none focus:border-[var(--color-brand)] text-[13px] text-[#2C4A3A] font-sans resize-none disabled:opacity-75"
            />
          </div>

          {/* Email Attachments Grid */}
          {images.length > 0 && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold tracking-wider text-[#2C4A3A]/70 uppercase">Image Attachments ({images.filter(img => img.selected).length} selected)</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {images.map((img, idx) => (
                  <div 
                    key={idx}
                    onClick={() => !isSaving && handleToggleImage(idx)}
                    className={`relative rounded-xl border p-2 cursor-pointer transition-all flex flex-col items-center gap-1.5 select-none ${img.selected ? 'border-brand bg-brand/5' : 'border-black/10 bg-gray-50 hover:border-black/25'}`}
                  >
                    <div className="w-full aspect-video rounded-lg overflow-hidden bg-sage-light/30 relative">
                      <img src={img.previewUrl} className="w-full h-full object-cover" alt={img.filename} />
                      {img.selected && (
                        <div className="absolute top-1 right-1 rounded-full bg-brand text-white p-0.5 flex items-center justify-center shadow-md">
                          <Check size={10} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <div className="w-full px-0.5 text-left">
                      <div className="text-[11px] font-semibold text-forest truncate" title={img.filename}>{img.filename}</div>
                      <div className="text-[10px] text-slate/75">{formatBytes(img.size)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-black/5 bg-gray-50/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate/75">
            {isSaving && (
              <>
                <Loader2 size={14} className="animate-spin text-brand" />
                <span className="font-semibold text-brand">{savingProgress}</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose} 
              disabled={isSaving}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-[#2C4A3A]/60 hover:bg-black/5 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button 
              onClick={handleCreate} 
              disabled={!title.trim() || !listId || isSaving}
              className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ background: 'var(--color-brand)' }}
            >
              {isSaving ? 'Importing...' : 'Create Priority'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
