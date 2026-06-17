'use client'

import { useState } from 'react'
import { X, UserPlus, Users } from 'lucide-react'
import { addUsers } from '@/app/settings/actions'

interface Props {
  onClose: () => void
  onSuccess: () => void
}

export default function AddUsersModal({ onClose, onSuccess }: Props) {
  const [mode, setMode] = useState<'single' | 'bulk'>('single')
  const [singleEmail, setSingleEmail] = useState('')
  const [singleName, setSingleName] = useState('')
  const [bulkText, setBulkText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleSingleSubmit = async () => {
    if (!singleEmail.trim()) return
    setIsSubmitting(true)
    setError(null)
    setSuccessMsg(null)

    const name = singleName.trim() || singleEmail.split('@')[0]
    const result = await addUsers([{ email: singleEmail.trim(), name }])
    
    if (result.success) {
      if (result.added === 0 && result.skipped) {
        setError('This user already exists in the system.')
      } else {
        setSuccessMsg(`Added successfully!`)
        setSingleEmail('')
        setSingleName('')
        onSuccess()
      }
    } else {
      setError(result.error || 'Failed to add user')
    }
    setIsSubmitting(false)
  }

  const handleBulkSubmit = async () => {
    if (!bulkText.trim()) return
    setIsSubmitting(true)
    setError(null)
    setSuccessMsg(null)

    const lines = bulkText.split('\n').filter(l => l.trim())
    const users = lines.map(line => {
      // Strip trailing commas, semicolons, and whitespace
      const trimmed = line.trim().replace(/[,;]+$/, '').trim()
      
      // Format: "Name <email>"
      const angleMatch = trimmed.match(/^(.+?)\s*<([^>]+)>$/)
      if (angleMatch) {
        return { email: angleMatch[2].trim(), name: angleMatch[1].trim() }
      }
      
      // Format: "email, name"
      const parts = trimmed.split(',').map(p => p.trim())
      const email = parts[0]
      const name = parts[1] || email.split('@')[0]
      return { email, name }
    })

    const invalidEmails = users.filter(u => !u.email.includes('@'))
    if (invalidEmails.length > 0) {
      setError(`Invalid email(s): ${invalidEmails.map(u => u.email).join(', ')}`)
      setIsSubmitting(false)
      return
    }

    const result = await addUsers(users)
    
    if (result.success) {
      if (result.added === 0 && result.skipped && !result.errors?.length) {
        setError(`All ${result.skipped} user(s) already exist in the system.`)
      } else if (result.added === 0 && result.errors?.length) {
        setError(`Failed to add users:\n${result.errors.join('\n')}`)
      } else {
        let msg = `Added ${result.added} user(s) successfully!`
        if (result.skipped) msg += ` ${result.skipped} already existed and were skipped.`
        if (result.errors?.length) msg += ` ${result.errors.length} had errors.`
        setSuccessMsg(msg)
        setBulkText('')
        onSuccess()
      }
    } else {
      setError(result.error || 'Failed to add users')
    }
    setIsSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-[var(--color-forest)]">Add Teammates</h2>
          <button onClick={onClose} className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => { setMode('single'); setError(null); setSuccessMsg(null) }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              mode === 'single'
                ? 'text-[var(--color-brand)] border-b-2 border-[var(--color-brand)]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <UserPlus size={16} />
            Single
          </button>
          <button
            onClick={() => { setMode('bulk'); setError(null); setSuccessMsg(null) }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors ${
              mode === 'bulk'
                ? 'text-[var(--color-brand)] border-b-2 border-[var(--color-brand)]'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users size={16} />
            Bulk
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">
              {error}
            </div>
          )}
          {successMsg && (
            <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-100 text-sm text-green-700">
              {successMsg}
            </div>
          )}

          {mode === 'single' ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Add a teammate directly. They'll be able to sign in with their Google account.
              </p>
              <div>
                <label className="block text-xs font-semibold text-[var(--color-forest)] mb-1.5">
                  Email *
                </label>
                <input
                  type="email"
                  value={singleEmail}
                  onChange={e => setSingleEmail(e.target.value)}
                  placeholder="jdoe@almstead.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--color-forest)] mb-1.5">
                  Display Name <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={singleName}
                  onChange={e => setSingleName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] transition-colors"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Add multiple teammates at once. One per line. Supports these formats:
              </p>
              <div className="text-xs text-gray-400 space-y-0.5 mb-2">
                <div><code className="bg-gray-100 px-1.5 py-0.5 rounded">Name &lt;email&gt;</code></div>
                <div><code className="bg-gray-100 px-1.5 py-0.5 rounded">email, name</code></div>
                <div><code className="bg-gray-100 px-1.5 py-0.5 rounded">email</code></div>
              </div>
              <textarea
                value={bulkText}
                onChange={e => setBulkText(e.target.value)}
                placeholder={`Melissa Cardany <mcardany@almstead.com>\nJennifer Smith <jsmith@almstead.com>\njdoe@almstead.com, Jane Doe\nbrown@almstead.com`}
                rows={8}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[var(--color-brand)] focus:ring-1 focus:ring-[var(--color-brand)] transition-colors font-mono"
              />
              <p className="text-xs text-gray-400">
                Name is optional — if omitted, it will be derived from the email.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={mode === 'single' ? handleSingleSubmit : handleBulkSubmit}
            disabled={isSubmitting || (mode === 'single' ? !singleEmail.trim() : !bulkText.trim())}
            className="px-5 py-2 rounded-full text-sm font-semibold text-white transition-colors disabled:opacity-50"
            style={{ background: 'var(--color-brand)' }}
          >
            {isSubmitting ? 'Adding...' : mode === 'single' ? 'Add Teammate' : 'Add All'}
          </button>
        </div>
      </div>
    </div>
  )
}
