import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Link from '@/models/Link'
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

    await dbConnect()
    
    const links = await Link.find({ userId: decoded.userId }).sort({ order: 1 })

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

    await dbConnect()
    
    const { title, url, icon } = await request.json()

    if (!title || !url) {
      return NextResponse.json({ error: 'Title and URL are required' }, { status: 400 })
    }

    // Get current max order
    const lastLink = await Link.findOne({ userId: decoded.userId }).sort({ order: -1 })
    const order = lastLink ? lastLink.order + 1 : 0

    const link = await Link.create({
      userId: decoded.userId,
      title,
      url,
      icon: icon || '🌐',
      order,
    })

    return NextResponse.json({ link })
  } catch (error: any) {
    console.error('Create link error:', error)
    return NextResponse.json({ error: 'Failed to create link' }, { status: 500 })
  }
}
