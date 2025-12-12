import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Link from '@/models/Link'
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

    await dbConnect()
    
    const { title, url, icon } = await request.json()

    const link = await Link.findOneAndUpdate(
      { _id: params.id, userId: decoded.userId },
      { title, url, icon },
      { new: true }
    )

    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    return NextResponse.json({ link })
  } catch (error: any) {
    console.error('Update link error:', error)
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

    await dbConnect()
    
    const link = await Link.findOneAndDelete({
      _id: params.id,
      userId: decoded.userId
    })

    if (!link) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Delete link error:', error)
    return NextResponse.json({ error: 'Failed to delete link' }, { status: 500 })
  }
}
