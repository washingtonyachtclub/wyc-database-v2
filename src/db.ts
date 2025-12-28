import { PrismaClient } from './generated/prisma/client.js'

import { PrismaMariaDb } from '@prisma/adapter-mariadb'
const adapter = new PrismaMariaDb({
  host: 'localhost',
  port: 3306,
  connectionLimit: 5,
})

declare global {
  var __prisma: PrismaClient | undefined
}

export const prisma = globalThis.__prisma || new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalThis.__prisma = prisma
}
