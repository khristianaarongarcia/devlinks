import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Link from '@/models/Link'

interface RouteParams {
  params: { id: string }
}

// POST increment click count
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect()
    
    await Link.findByIdAndUpdate(params.id, { $inc: { clicks: 1 } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Click tracking error:', error)
    return NextResponse.json({ error: 'Failed to track click' }, { status: 500 })
  }
}
