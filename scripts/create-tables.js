const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = 'https://pyirlwpmkocsmjyhgouq.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5aXJsd3Bta29jc21qeWhnb3VxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU1MDEwNTEsImV4cCI6MjA3MTA3NzA1MX0.M-THVpNBe7iNIIQj6N41Lxut_lUuOP3pxoassdS7148'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createTables() {
  console.log('Creating User table...')
  
  // SQL로 테이블 생성
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS "User" (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255),
      "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `
  
  // Supabase는 직접 SQL 실행을 지원하지 않으므로, 테이블 존재 확인
  const { data, error } = await supabase.from('User').select('*').limit(1)
  
  if (error && error.code === '42P01') {
    console.log('User 테이블이 없습니다.')
    console.log('Supabase 대시보드에서 다음 SQL을 실행해주세요:')
    console.log(createTableSQL)
  } else if (error) {
    console.error('Error:', error.message)
  } else {
    console.log('User 테이블이 이미 존재합니다.')
  }
}

createTables().catch(console.error)