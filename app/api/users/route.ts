import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET: 모든 사용자 조회
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return NextResponse.json(users)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: 새 사용자 생성
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, name } = body
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }
    
    const user = await prisma.user.create({
      data: {
        email,
        name
      }
    })
    
    return NextResponse.json(user, { status: 201 })
  } catch (error: any) {
    // Unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}