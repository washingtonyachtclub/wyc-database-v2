import { isNull } from 'drizzle-orm'
import db from '../src/db'
import { memberPhoto } from '../src/db/schema'
import { changePhoto } from '../src/domains/member-photos/service'

const pending = await db.select().from(memberPhoto).where(isNull(memberPhoto.avatarKey))
for (const photo of pending) {
  try {
    await changePhoto(photo.wycNumber, photo.version, { crop: photo.crop ?? undefined })
  } catch (error) {
    console.error('Could not backfill member photo', photo.wycNumber, error)
    process.exitCode = 1
  }
}
