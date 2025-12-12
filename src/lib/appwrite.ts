import { Client, Databases, ID, Query } from 'node-appwrite'

// Server-side Appwrite client (with API key for full access)
const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || '')
  .setKey(process.env.APPWRITE_API_KEY || '')

export const databases = new Databases(client)

// Database and Collection IDs
export const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || 'devlinks'
export const USERS_COLLECTION_ID = process.env.APPWRITE_USERS_COLLECTION_ID || 'users'
export const LINKS_COLLECTION_ID = process.env.APPWRITE_LINKS_COLLECTION_ID || 'links'

// Helper to generate unique IDs
export const generateId = () => ID.unique()

// Export Query for use in other files
export { Query, ID }

// Types
export interface AppwriteUser {
  $id: string
  $createdAt: string
  $updatedAt: string
  name: string
  email: string
  username: string
  password: string
  bio?: string
  avatar?: string
}

export interface AppwriteLink {
  $id: string
  $createdAt: string
  $updatedAt: string
  userId: string
  title: string
  url: string
  icon: string
  clicks: number
  order: number
}
