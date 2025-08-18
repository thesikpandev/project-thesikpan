import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Supabase 연결 테스트
    const { data, error } = await supabase
      .from('_prisma_migrations')
      .select('*')
      .limit(1)
    
    if (error && error.code === '42P01') {
      // 테이블이 없는 경우 - 정상
      return NextResponse.json({ 
        status: 'connected',
        message: 'Supabase 연결 성공! 데이터베이스가 비어있습니다.',
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
      })
    }
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({ 
      status: 'connected',
      message: 'Supabase 연결 성공!',
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
    })
  } catch (error: any) {
    return NextResponse.json({ 
      status: 'error',
      message: error.message,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
    }, { status: 500 })
  }
}