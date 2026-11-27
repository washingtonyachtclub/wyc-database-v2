import { atomicWrite } from '@/db/atomic'
import { and, eq, inArray } from 'drizzle-orm'
import db from '@/db'
import { memberPhoto, officers, positions, wycDatabase } from '@/db/schema'
import { OFFICER_PAGE_TYPES } from '@/db/constants'
import { cropPhoto, normalizePhoto } from './images'
import { discardPhoto, readPhoto, writePhoto } from './storage'
import type { PhotoCrop } from './photo'

export class StalePhoto extends Error {}

export async function getPhoto(id: number) {
  const [row] = await db.select().from(memberPhoto).where(eq(memberPhoto.wycNumber, id))
  return row
}

export async function listedInDirectory(id: number) {
  const [holder] = await db
    .select({ id: officers.index })
    .from(officers)
    .innerJoin(positions, eq(officers.position, positions.index))
    .where(
      and(
        eq(officers.member, id),
        eq(officers.active, 1),
        eq(positions.active, 1),
        inArray(positions.type, [3, ...OFFICER_PAGE_TYPES]),
      ),
    )
    .limit(1)
  return !!holder
}

export async function changePhoto(
  id: number,
  expected: string,
  change?: { file?: Buffer; crop?: PhotoCrop },
) {
  const old = await getPhoto(id)
  if ((old?.version ?? '') !== expected) throw new StalePhoto()
  const staged: string[] = []
  let next: typeof memberPhoto.$inferInsert | undefined
  try {
    if (change) {
      if (!change.file && !old) throw new StalePhoto()
      const source = change.file ? await normalizePhoto(change.file) : await loadSource(old)
      const { avatar, crop } = await cropPhoto(source, change.crop)
      const sourceKey = change.file ? await writePhoto('source', source) : old.sourceKey
      if (change.file) staged.push(sourceKey)
      const avatarKey = await writePhoto('avatar', avatar)
      staged.push(avatarKey)
      next = { version: crypto.randomUUID(), wycNumber: id, sourceKey, avatarKey, crop }
    }
    await atomicWrite(async (tx) => {
      const [member] = await db
        .select({ id: wycDatabase.wycNumber })
        .from(wycDatabase)
        .where(eq(wycDatabase.wycNumber, id))
      const [current] = await db.select().from(memberPhoto).where(eq(memberPhoto.wycNumber, id))
      if (!member || (current?.version ?? '') !== expected) throw new StalePhoto()
      if (!next) tx.add(db.delete(memberPhoto).where(eq(memberPhoto.wycNumber, id)))
      else if (current)
        tx.add(db.update(memberPhoto).set(next).where(eq(memberPhoto.wycNumber, id)))
      else tx.add(db.insert(memberPhoto).values(next))
    })
  } catch (error) {
    // An interrupted COMMIT may already have published the new keys.
    const current = await getPhoto(id)
    await clean(staged.filter((key) => key !== current?.sourceKey && key !== current?.avatarKey))
    throw error
  }
  if (old?.avatarKey) await clean([old.avatarKey])
  if (old && old.sourceKey !== next?.sourceKey) {
    const [shared] = await db
      .select({ id: memberPhoto.wycNumber })
      .from(memberPhoto)
      .where(eq(memberPhoto.sourceKey, old.sourceKey))
      .limit(1)
    if (!shared) await clean([old.sourceKey])
  }
  return next
}
async function clean(keys: string[]) {
  for (const key of keys) {
    try {
      await discardPhoto(key)
    } catch (error) {
      console.error('Failed to remove member photo object', key, error)
    }
  }
}

export async function loadSource(row: typeof memberPhoto.$inferSelect) {
  const source = await readPhoto(row.sourceKey)
  return row.sourceKey.startsWith('profiles/source/') ? source : normalizePhoto(source)
}

export async function loadAvatar(row: typeof memberPhoto.$inferSelect) {
  if (row.avatarKey) return readPhoto(row.avatarKey)
  return (await cropPhoto(await loadSource(row), row.crop ?? undefined)).avatar
}
