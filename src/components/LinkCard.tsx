'use client'

import { FiEdit2, FiTrash2, FiExternalLink, FiGripVertical } from 'react-icons/fi'

interface LinkCardProps {
  id: string
  title: string
  url: string
  icon?: string
  clicks?: number
  isEditing?: boolean
  onEdit?: () => void
  onDelete?: () => void
}

export default function LinkCard({ 
  id,
  title, 
  url, 
  icon,
  clicks = 0,
  isEditing = false,
  onEdit,
  onDelete 
}: LinkCardProps) {
  if (isEditing) {
    return (
      <div className="bg-white dark:bg-dark-100 rounded-xl p-4 shadow-md border border-gray-200 dark:border-gray-700 link-card">
        <div className="flex items-center gap-4">
          <div className="cursor-grab text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <FiGripVertical className="w-5 h-5" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white truncate">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{url}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-dark-200 px-2 py-1 rounded-full">
              {clicks} clicks
            </span>
            <button 
              onClick={onEdit}
              className="p-2 text-gray-400 hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-dark-200 rounded-lg transition-colors"
            >
              <FiEdit2 className="w-4 h-4" />
            </button>
            <button 
              onClick={onDelete}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-dark-200 rounded-lg transition-colors"
            >
              <FiTrash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <a 
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white dark:bg-dark-100 rounded-xl p-4 shadow-md border border-gray-200 dark:border-gray-700 link-card group"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon && <span className="text-2xl">{icon}</span>}
          <span className="font-semibold text-gray-900 dark:text-white">{title}</span>
        </div>
        <FiExternalLink className="w-4 h-4 text-gray-400 group-hover:text-primary-500 transition-colors" />
      </div>
    </a>
  )
}
