import { NextRequest, NextResponse } from 'next/server'
import { databases, DATABASE_ID, LINKS_COLLECTION_ID, Query, generateId } from '@/lib/appwrite'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

// GET all links for authenticated user
export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromHeader(request.headers.get('authorization'))
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get links from Appwrite
    const result = await databases.listDocuments(
      DATABASE_ID,
      LINKS_COLLECTION_ID,
      [
        Query.equal('userId', decoded.userId),
        Query.orderAsc('order')
      ]
    )

    const links = result.documents.map(doc => ({
      _id: doc.$id,
      userId: doc.userId,
      title: doc.title,
      url: doc.url,
      icon: doc.icon,
      clicks: doc.clicks,
      order: doc.order,
    }))

    return NextResponse.json({ links })
  } catch (error: any) {
    console.error('Get links error:', error)
    return NextResponse.json({ error: 'Failed to fetch links' }, { status: 500 })
  }
}

// POST create new link
export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromHeader(request.headers.get('authorization'))
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { title, url, icon } = await request.json()

    if (!title || !url) {
      return NextResponse.json({ error: 'Title and URL are required' }, { status: 400 })
    }

    // Get current max order
    const existingLinks = await databases.listDocuments(
      DATABASE_ID,
      LINKS_COLLECTION_ID,
      [
        Query.equal('userId', decoded.userId),
        Query.orderDesc('order'),
        Query.limit(1)
      ]
    )
    
    const order = existingLinks.documents.length > 0 ? existingLinks.documents[0].order + 1 : 0

    // Create link in Appwrite
    const linkId = generateId()
    const doc = await databases.createDocument(
      DATABASE_ID,
      LINKS_COLLECTION_ID,
      linkId,
      {
        userId: decoded.userId,
        title,
        url,
        icon: icon || '🌐',
        clicks: 0,
        order,
      }
    )

    const link = {
      _id: doc.$id,
      userId: doc.userId,
      title: doc.title,
      url: doc.url,
      icon: doc.icon,
      clicks: doc.clicks,
      order: doc.order,
    }

    return NextResponse.json({ link })
  } catch (error: any) {
    console.error('Create link error:', error)
    return NextResponse.json({ error: 'Failed to create link' }, { status: 500 })
  }
}
