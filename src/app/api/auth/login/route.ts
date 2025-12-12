import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { databases, DATABASE_ID, USERS_COLLECTION_ID, Query } from '@/lib/appwrite'
import { signToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user by email
    const users = await databases.listDocuments(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      [Query.equal('email', email)]
    )

    if (users.total === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const user = users.documents[0]

    // Check password
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Generate token
    const token = signToken(user.$id)

    return NextResponse.json({
      user: {
        id: user.$id,
        name: user.name,
        email: user.email,
        username: user.username,
        bio: user.bio,
        avatar: user.avatar,
      },
      token,
    })
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: error.message || 'Login failed' },
      { status: 500 }
    )
  }
}
