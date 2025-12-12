import { NextRequest, NextResponse } from 'next/server'
import { databases, DATABASE_ID, LINKS_COLLECTION_ID } from '@/lib/appwrite'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

interface RouteParams {
  params: { id: string }
}

// PUT update link
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    // Get the link first to verify ownership
    const existingLink = await databases.getDocument(
      DATABASE_ID,
      LINKS_COLLECTION_ID,
      params.id
    )

    if (existingLink.userId !== decoded.userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Update the link
    const doc = await databases.updateDocument(
      DATABASE_ID,
      LINKS_COLLECTION_ID,
      params.id,
      { title, url, icon }
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
    console.error('Update link error:', error)
    if (error.code === 404) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to update link' }, { status: 500 })
  }
}

// DELETE link
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const token = getTokenFromHeader(request.headers.get('authorization'))
    
    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get the link first to verify ownership
    const existingLink = await databases.getDocument(
      DATABASE_ID,
      LINKS_COLLECTION_ID,
      params.id
    )

    if (existingLink.userId !== decoded.userId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Delete the link
    await databases.deleteDocument(
      DATABASE_ID,
      LINKS_COLLECTION_ID,
      params.id
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete link error:', error)
    if (error.code === 404) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Failed to delete link' }, { status: 500 })
  }
}
