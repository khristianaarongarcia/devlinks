import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { databases, DATABASE_ID, USERS_COLLECTION_ID, Query, generateId } from '@/lib/appwrite'
import { signToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { name, email, username, password } = await request.json()

    // Validate input
    if (!name || !email || !username || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingEmail = await databases.listDocuments(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      [Query.equal('email', email)]
    )

    if (existingEmail.total > 0) {
      return NextResponse.json(
        { error: 'Email already in use' },
        { status: 400 }
      )
    }

    // Check if username already exists
    const existingUsername = await databases.listDocuments(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      [Query.equal('username', username.toLowerCase())]
    )

    if (existingUsername.total > 0) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 400 }
      )
    }

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Create user
    const userId = generateId()
    const user = await databases.createDocument(
      DATABASE_ID,
      USERS_COLLECTION_ID,
      userId,
      {
        name,
        email,
        username: username.toLowerCase(),
        password: hashedPassword,
        bio: '',
        avatar: '',
      }
    )

    // Generate token
    const token = signToken(user.$id)

    return NextResponse.json({
      user: {
        id: user.$id,
        name: user.name,
        email: user.email,
        username: user.username,
      },
      token,
    })
  } catch (error: any) {
    console.error('Registration error:', error)
    return NextResponse.json(
      { error: error.message || 'Registration failed' },
      { status: 500 }
    )
  }
}
