import { eq } from 'drizzle-orm'
import db from '@/db/index'
import { lessonQuarter } from '@/db/schema'

export async function readQuarterConfig(connection: Pick<typeof db, 'select'> = db) {
  try {
    const [config] = await connection
      .select({
        currentQuarter: lessonQuarter.quarter,
        renewalQuarter: lessonQuarter.renewalQuarter,
      })
      .from(lessonQuarter)
      .where(eq(lessonQuarter.index, 1))
    if (!config) throw new Error('Quarter settings are unavailable')
    return config
  } catch (error) {
    console.error('Failed to read quarter settings:', error)
    throw new Error('Quarter settings are unavailable')
  }
}
