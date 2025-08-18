import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function POST() {
  try {
    // Prisma migration 상태 확인
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    ` as any[]
    
    const hasMigrations = tables.some(t => t.table_name === '_prisma_migrations')
    
    if (!hasMigrations) {
      // 마이그레이션이 없으면 실행
      try {
        const { stdout, stderr } = await execAsync('npx prisma migrate deploy')
        
        return NextResponse.json({ 
          status: 'success',
          message: 'Database migrations applied successfully!',
          output: stdout
        })
      } catch (error: any) {
        return NextResponse.json({ 
          status: 'error',
          message: 'Failed to apply migrations. Run "npx prisma migrate dev" locally.',
          error: error.message
        }, { status: 500 })
      }
    }
    
    // 테이블 정보 반환
    const userCount = await prisma.user.count()
    
    return NextResponse.json({ 
      status: 'success',
      message: `Database is ready! Current users: ${userCount}`,
      tables: tables.map(t => t.table_name)
    })
  } catch (error: any) {
    return NextResponse.json({ 
      status: 'error',
      message: error.message
    }, { status: 500 })
  }
}

// GET: 데이터베이스 상태 확인
export async function GET() {
  try {
    const userCount = await prisma.user.count()
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    ` as any[]
    
    return NextResponse.json({
      status: 'connected',
      userCount,
      tables: tables.map(t => t.table_name),
      database: process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'unknown'
    })
  } catch (error: any) {
    return NextResponse.json({ 
      status: 'error',
      message: error.message
    }, { status: 500 })
  }
}