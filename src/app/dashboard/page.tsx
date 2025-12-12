'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { FiPlus, FiExternalLink, FiCopy, FiCheck } from 'react-icons/fi'
import { useAuth } from '@/context/AuthContext'
import Navbar from '@/components/Navbar'
import LinkCard from '@/components/LinkCard'
import LinkForm from '@/components/LinkForm'
import Cookies from 'js-cookie'

interface Link {
  _id: string
  title: string
  url: string
  icon: string
  clicks: number
  order: number
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading } = useAuth()
  const [links, setLinks] = useState<Link[]>([])
  const [isLoadingLinks, setIsLoadingLinks] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingLink, setEditingLink] = useState<Link | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      fetchLinks()
    }
  }, [user])

  const fetchLinks = async () => {
    try {
      const token = Cookies.get('token')
      const response = await fetch('/api/links', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setLinks(data.links)
      }
    } catch (error) {
      console.error('Failed to fetch links:', error)
    } finally {
      setIsLoadingLinks(false)
    }
  }

  const handleAddLink = async (linkData: { title: string; url: string; icon: string }) => {
    setIsSaving(true)
    try {
      const token = Cookies.get('token')
      const response = await fetch('/api/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(linkData)
      })

      if (response.ok) {
        const data = await response.json()
        setLinks([...links, data.link])
        setShowAddForm(false)
      }
    } catch (error) {
      console.error('Failed to add link:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleEditLink = async (linkData: { title: string; url: string; icon: string }) => {
    if (!editingLink) return
    setIsSaving(true)
    try {
      const token = Cookies.get('token')
      const response = await fetch(`/api/links/${editingLink._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(linkData)
      })

      if (response.ok) {
        const data = await response.json()
        setLinks(links.map(link => link._id === editingLink._id ? data.link : link))
        setEditingLink(null)
      }
    } catch (error) {
      console.error('Failed to edit link:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteLink = async (linkId: string) => {
    if (!confirm('Are you sure you want to delete this link?')) return
    
    try {
      const token = Cookies.get('token')
      const response = await fetch(`/api/links/${linkId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.ok) {
        setLinks(links.filter(link => link._id !== linkId))
      }
    } catch (error) {
      console.error('Failed to delete link:', error)
    }
  }

  const copyProfileLink = () => {
    if (user) {
      navigator.clipboard.writeText(`${window.location.origin}/${user.username}`)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-300">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  const totalClicks = links.reduce((sum, link) => sum + link.clicks, 0)

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-dark-300">
      <Navbar />
      
      <div className="pt-24 pb-12 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">Manage your links and profile</p>
          </div>

          {/* Stats & Profile Link */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white dark:bg-dark-100 rounded-xl p-6 shadow-md">
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Total Links</p>
              <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">{links.length}</p>
            </div>
            <div className="bg-white dark:bg-dark-100 rounded-xl p-6 shadow-md">
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Total Clicks</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">{totalClicks}</p>
            </div>
            <div className="bg-white dark:bg-dark-100 rounded-xl p-6 shadow-md">
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Your Page</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={copyProfileLink}
                  className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
                >
                  {copied ? <FiCheck className="w-4 h-4" /> : <FiCopy className="w-4 h-4" />}
                  {copied ? 'Copied!' : `/${user.username}`}
                </button>
                <a
                  href={`/${user.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <FiExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Add Link Button */}
          {!showAddForm && !editingLink && (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full mb-6 p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-500 dark:text-gray-400 hover:border-primary-500 hover:text-primary-500 transition-colors flex items-center justify-center gap-2"
            >
              <FiPlus className="w-5 h-5" />
              Add New Link
            </button>
          )}

          {/* Add Link Form */}
          {showAddForm && (
            <div className="mb-6 animate-fade-in">
              <LinkForm
                onSave={handleAddLink}
                onCancel={() => setShowAddForm(false)}
                isLoading={isSaving}
              />
            </div>
          )}

          {/* Edit Link Form */}
          {editingLink && (
            <div className="mb-6 animate-fade-in">
              <LinkForm
                initialData={editingLink}
                onSave={handleEditLink}
                onCancel={() => setEditingLink(null)}
                isLoading={isSaving}
              />
            </div>
          )}

          {/* Links List */}
          <div className="space-y-3">
            {isLoadingLinks ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : links.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-dark-100 rounded-xl">
                <p className="text-gray-500 dark:text-gray-400 mb-4">No links yet. Add your first link!</p>
              </div>
            ) : (
              links.map((link) => (
                <LinkCard
                  key={link._id}
                  id={link._id}
                  title={link.title}
                  url={link.url}
                  icon={link.icon}
                  clicks={link.clicks}
                  isEditing={true}
                  onEdit={() => setEditingLink(link)}
                  onDelete={() => handleDeleteLink(link._id)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
