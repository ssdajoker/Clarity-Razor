import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting database seed...')

  // Create test account
  const testEmail = 'john@doe.com'
  const testPassword = 'johndoe123'

  const existingUser = await prisma.user.findUnique({
    where: { email: testEmail }
  })

  if (!existingUser) {
    const hashedPassword = await bcrypt.hash(testPassword, 10)
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        password: hashedPassword,
        name: 'Test User'
      }
    })
    console.log('✓ Test account created:', testEmail)
  } else {
    console.log('✓ Test account already exists:', testEmail)
  }

  console.log('Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
