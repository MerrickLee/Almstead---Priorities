import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pin, Link2, Info } from 'lucide-react'
import { Item } from '@/lib/types'

interface Props {
  item: Item
  index: number
  isManager: boolean
  inAll: boolean
  onToggleStatus: (item: Item) => void
  onClick: () => void
}

interface ItemRowProps extends Props {
  dragHandleProps?: any
  setNodeRef?: (node: HTMLElement | null) => void
  style?: React.CSSProperties
  isDragging?: boolean
}

export function ItemRow({ item, index, isManager, inAll, onToggleStatus, onClick, dragHandleProps, setNodeRef, style, isDragging }: ItemRowProps) {
  // Very basic extraction of text from TipTap JSON notes
  const notesPreview = typeof item.notes === 'string' 
    ? item.notes 
    : (item.notes?.content?.[0]?.content?.[0]?.text || '')

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      onClick={onClick}
      className="rounded-xl bg-white px-4 py-3 cursor-pointer mb-2 flex items-start gap-3"
    >
      {isManager && !inAll && dragHandleProps ? (
        <div {...dragHandleProps} className="mt-1 cursor-grab shrink-0">
          <GripVertical size={16} style={{ color: '#B9C5B9' }} />
        </div>
      ) : (
        <span style={{ width: 16 }} className="shrink-0" />
      )}

      <span className="flex items-center justify-center rounded-md font-bold shrink-0"
        style={{ 
          minWidth: 26, height: 20, fontSize: 11, 
          background: index === 0 ? 'var(--color-brand)' : 'var(--color-sage-pale)', 
          color: index === 0 ? '#fff' : '#2C5A1E' 
        }}>
        #{index + 1}
      </span>

      <button onClick={(e) => { e.stopPropagation(); onToggleStatus(item); }}
        className="rounded-full shrink-0 mt-0.5" 
        style={{ width: 18, height: 18, border: '1.5px solid #B9C5B9', background: 'transparent' }} 
        aria-label="Mark complete" 
      />

      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[14.5px] text-forest">
          {item.pinned && <Pin size={12} className="inline mr-1 text-terracotta" />}
          {item.title}
        </div>
        
        {notesPreview && (
          <div className="text-[12.5px] mt-0.5 text-slate/80 line-clamp-2">
            {notesPreview}
          </div>
        )}
        
        {((item.links && item.links.length > 0) || (item.tags && item.tags.length > 0)) && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {item.links?.map(link => (
              <span key={link.id} className="rounded-full px-2.5 py-0.5 text-[11px]" 
                style={{ background: link.system === 'hubspot' ? '#FAF3E2' : '#F4ECE6', 
                         color: link.system === 'hubspot' ? '#7A5A08' : '#7A4A1E', 
                         border: '1px solid #E8DCC0' }}>
                <Link2 size={10} className="inline mr-1" />{link.system} · {link.cached_label}
              </span>
            ))}
            {item.tags?.map((t) => (
              <span key={t} className="rounded-full px-2.5 py-0.5 text-[11px] bg-[#EDF3E6] text-[#2C5A1E]">
                #{t}
              </span>
            ))}
          </div>
        )}

        {item.images && item.images.length > 0 && (
          <div className="flex gap-1.5 mt-2">
            {item.images.map((img) => (
              <span key={img.id} className="rounded-md w-[46px] h-[34px] bg-sage-light overflow-hidden">
                {img.thumb_path && <img src={img.thumb_path} className="w-full h-full object-cover" alt="thumb" />}
              </span>
            ))}
          </div>
        )}
      </div>

      <Info size={16} className="shrink-0 text-gold" />
    </div>
  )
}

export function SortableItem(props: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: props.item.id,
    disabled: !props.isManager || props.inAll
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    border: '1px solid #DDE5D6',
  }

  return <ItemRow {...props} dragHandleProps={{...attributes, ...listeners}} setNodeRef={setNodeRef} style={style} isDragging={isDragging} />
}

export function StaticItem(props: Props) {
  const style = { border: '1px solid #DDE5D6' }
  return <ItemRow {...props} style={style} />
}
