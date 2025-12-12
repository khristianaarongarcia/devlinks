import { NextRequest, NextResponse } from 'next/server'
import { databases, DATABASE_ID, LINKS_COLLECTION_ID } from '@/lib/appwrite'

interface RouteParams {
  params: { id: string }
}

// POST increment click count
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    // Get current link to get click count
    const link = await databases.getDocument(
      DATABASE_ID,
      LINKS_COLLECTION_ID,
      params.id
    )

    // Increment clicks
    await databases.updateDocument(
      DATABASE_ID,
      LINKS_COLLECTION_ID,
      params.id,
      { clicks: (link.clicks || 0) + 1 }
    )

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Click tracking error:', error)
    return NextResponse.json({ error: 'Failed to track click' }, { status: 500 })
  }
}
