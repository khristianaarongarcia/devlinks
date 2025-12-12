import { NextRequest, NextResponse } from 'next/server'
import { databases, DATABASE_ID, USERS_COLLECTION_ID } from '@/lib/appwrite'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromHeader(request.headers.get('authorization'))
    
    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const decoded = verifyToken(token)
    if (!decoded) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Get user from Appwrite
    const user = await databases.getDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      decoded.userId
    )

    return NextResponse.json({
      user: {
        id: user.$id,
        name: user.name,
        email: user.email,
        username: user.username,
        bio: user.bio,
        avatar: user.avatar,
      },
    })
  } catch (error: any) {
    console.error('Auth check error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}
