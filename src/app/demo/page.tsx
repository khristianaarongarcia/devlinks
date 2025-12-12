import Link from 'next/link'
import { FiExternalLink, FiArrowLeft } from 'react-icons/fi'

const DEMO_USER = {
  name: 'Khristian Aaron Garcia',
  username: 'khristiangarcia',
  bio: 'Full Stack Developer | Open Source Enthusiast | Building cool stuff with code',
}

const DEMO_LINKS = [
  { id: '1', title: 'Portfolio Website', url: '#', icon: '🌐' },
  { id: '2', title: 'GitHub Profile', url: '#', icon: '🐙' },
  { id: '3', title: 'LinkedIn', url: '#', icon: '💼' },
  { id: '4', title: 'Twitter / X', url: '#', icon: '🐦' },
  { id: '5', title: 'Email Me', url: '#', icon: '📧' },
  { id: '6', title: 'Latest Blog Post', url: '#', icon: '📝' },
]

export default function DemoPage() {
  const initials = DEMO_USER.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-500 via-purple-500 to-pink-500 py-12 px-4">
      {/* Back Button */}
      <div className="max-w-md mx-auto mb-6">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-white/80 hover:text-white text-sm transition-colors"
        >
          <FiArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>
      </div>

      <div className="max-w-md mx-auto">
        {/* Profile Card */}
        <div className="bg-white dark:bg-dark-100 rounded-3xl shadow-2xl p-8 animate-fade-in">
          {/* Avatar */}
          <div className="text-center mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-primary-400 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center text-white text-3xl font-bold ring-4 ring-white shadow-lg">
              {initials}
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{DEMO_USER.name}</h1>
            <p className="text-gray-500 dark:text-gray-400">@{DEMO_USER.username}</p>
            <p className="mt-3 text-gray-600 dark:text-gray-300 text-sm">{DEMO_USER.bio}</p>
          </div>

          {/* Links */}
          <div className="space-y-3">
            {DEMO_LINKS.map((link) => (
              <button
                key={link.id}
                className="w-full p-4 bg-gray-50 dark:bg-dark-200 rounded-xl text-center font-medium text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-dark-300 transition-all duration-300 transform hover:scale-[1.02] flex items-center justify-between group"
              >
                <span className="flex items-center gap-3">
                  <span className="text-xl">{link.icon}</span>
                  <span>{link.title}</span>
                </span>
                <FiExternalLink className="w-4 h-4 text-gray-400 group-hover:text-primary-500 transition-colors" />
              </button>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
              Want your own DevLinks page?
            </p>
            <Link 
              href="/register" 
              className="btn-primary inline-block"
            >
              Create Your Page Free
            </Link>
          </div>
        </div>

        {/* Branding */}
        <div className="text-center mt-8">
          <span className="inline-flex items-center gap-2 text-white/80 text-sm">
            <div className="w-5 h-5 bg-white/20 rounded flex items-center justify-center">
              <span className="text-xs font-bold">DL</span>
            </div>
            Demo Preview
          </span>
        </div>
      </div>
    </main>
  )
}
