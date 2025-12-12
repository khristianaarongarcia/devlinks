'use client'

import { useState } from 'react'
import { FiX, FiSave } from 'react-icons/fi'

interface LinkFormProps {
  initialData?: {
    title: string
    url: string
    icon: string
  }
  onSave: (data: { title: string; url: string; icon: string }) => void
  onCancel: () => void
  isLoading?: boolean
}

const EMOJI_OPTIONS = ['🌐', '💼', '🐙', '🐦', '📧', '💻', '📱', '🎮', '📝', '🎨', '🎵', '📹', '📷', '🛒', '☕', '🚀']

export default function LinkForm({ initialData, onSave, onCancel, isLoading }: LinkFormProps) {
  const [title, setTitle] = useState(initialData?.title || '')
  const [url, setUrl] = useState(initialData?.url || '')
  const [icon, setIcon] = useState(initialData?.icon || '🌐')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !url.trim()) return
    onSave({ title: title.trim(), url: url.trim(), icon })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-dark-100 rounded-xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {initialData ? 'Edit Link' : 'Add New Link'}
        </h3>
        <button 
          type="button" 
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-200"
        >
          <FiX className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Icon Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Icon
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="w-14 h-14 text-2xl bg-gray-100 dark:bg-dark-200 rounded-xl hover:bg-gray-200 dark:hover:bg-dark-300 transition-colors flex items-center justify-center"
            >
              {icon}
            </button>
            {showEmojiPicker && (
              <div className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-dark-100 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-10">
                <div className="grid grid-cols-8 gap-2">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => {
                        setIcon(emoji)
                        setShowEmojiPicker(false)
                      }}
                      className="w-10 h-10 text-xl hover:bg-gray-100 dark:hover:bg-dark-200 rounded-lg transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Title Input */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Title
          </label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="My Portfolio"
            className="input-field"
            required
          />
        </div>

        {/* URL Input */}
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            URL
          </label>
          <input
            type="url"
            id="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="input-field"
            required
          />
        </div>

        {/* Submit Button */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 btn-secondary"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 btn-primary inline-flex items-center justify-center gap-2"
            disabled={isLoading || !title.trim() || !url.trim()}
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <FiSave className="w-4 h-4" />
                {initialData ? 'Save Changes' : 'Add Link'}
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  )
}
