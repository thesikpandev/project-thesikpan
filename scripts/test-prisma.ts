import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Testing Prisma connection...')
  
  // 모든 사용자 조회
  const users = await prisma.user.findMany({
    take: 10,
  })
  console.log('Current users:', users)
  
  // 새 사용자 생성
  const newUser = await prisma.user.create({
    data: {
      email: `test${Date.now()}@example.com`,
      name: 'Test User from Prisma'
    }
  })
  console.log('Created user:', newUser)
  
  // 생성된 사용자 조회
  const foundUser = await prisma.user.findUnique({
    where: {
      id: newUser.id
    }
  })
  console.log('Found user:', foundUser)
}

main()
  .then(async () => {
    console.log('Test completed successfully!')
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('Error:', e)
    await prisma.$disconnect()
    process.exit(1)
  })