'use client'

import { FiExternalLink } from 'react-icons/fi'

interface ProfileViewProps {
  user: {
    name: string
    username: string
    bio: string
    avatar: string
  }
  links: Array<{
    _id: string
    title: string
    url: string
    icon: string
  }>
}

export default function ProfileView({ user, links }: ProfileViewProps) {
  const handleLinkClick = async (linkId: string, url: string) => {
    // Track click (fire and forget)
    fetch(`/api/links/${linkId}/click`, { method: 'POST' }).catch(() => {})
    window.open(url, '_blank')
  }

  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-500 via-purple-500 to-pink-500 py-12 px-4">
      <div className="max-w-md mx-auto">
        {/* Profile Card */}
        <div className="bg-white dark:bg-dark-100 rounded-3xl shadow-2xl p-8 animate-fade-in">
          {/* Avatar */}
          <div className="text-center mb-6">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-24 h-24 rounded-full mx-auto mb-4 object-cover ring-4 ring-white shadow-lg"
              />
            ) : (
              <div className="w-24 h-24 bg-gradient-to-br from-primary-400 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold ring-4 ring-white shadow-lg">
                {initials}
              </div>
            )}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{user.name}</h1>
            <p className="text-gray-500 dark:text-gray-400">@{user.username}</p>
            {user.bio && (
              <p className="mt-3 text-gray-600 dark:text-gray-300 text-sm">{user.bio}</p>
            )}
          </div>

          {/* Links */}
          <div className="space-y-3">
            {links.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                No links yet
              </p>
            ) : (
              links.map((link) => (
                <button
                  key={link._id}
                  onClick={() => handleLinkClick(link._id, link.url)}
                  className="w-full p-4 bg-gray-50 dark:bg-dark-200 rounded-xl text-center font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-dark-300 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-between group"
                >
                  <span className="flex items-center gap-3">
                    <span className="text-xl">{link.icon}</span>
                    <span>{link.title}</span>
                  </span>
                  <FiExternalLink className="w-4 h-4 text-gray-400 group-hover:text-primary-500 transition-colors" />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Branding */}
        <div className="text-center mt-8">
          <a
            href="/"
            className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm transition-colors"
          >
            <div className="w-5 h-5 bg-white/20 rounded flex items-center justify-center">
              <span className="text-xs font-bold">DL</span>
            </div>
            Made with DevLinks
          </a>
        </div>
      </div>
    </main>
  )
}
