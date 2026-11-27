import { env } from 'cloudflare:workers'
import type { AuthUser } from './identity'
import type { Privilege } from '../permissions'

const identityFields = 'WYCNumber AS wycNumber, First AS first, Last AS last, Email AS email'

export function loadAuthUser(wycNumber: number) {
  return env.DB.prepare(`SELECT ${identityFields} FROM WYCDatabase WHERE WYCNumber = ?`)
    .bind(wycNumber)
    .first<AuthUser>()
}

export function loadPasswordUser(wycNumber: number) {
  return env.DB.prepare(
    `SELECT ${identityFields}, password_argon2 AS passwordArgon2 FROM WYCDatabase WHERE WYCNumber = ?`,
  )
    .bind(wycNumber)
    .first<AuthUser & { passwordArgon2: string | null }>()
}

export async function loadUserPrivileges(wycNumber: number): Promise<Privilege[]> {
  const { results } = await env.DB.prepare(
    `
    SELECT DISTINCT trim(p.name) AS name FROM officers o
    JOIN positions pos ON pos._index = o.position
    JOIN pos_priv_map m ON m.position = o.position
    JOIN privs p ON p._index = m.priv
    WHERE o.member = ?1 AND o.active = 1 AND pos.active = 1 AND trim(p.name) IN ('db', 'rtgs')
    UNION SELECT 'rtgs' WHERE EXISTS (
      SELECT 1 FROM lessons l JOIN lesson_quarter q ON q._index = 1
      WHERE (l.instructor1 = ?1 OR l.instructor2 = ?1) AND l.expire >= q.quarter
    )`,
  )
    .bind(wycNumber)
    .all<{ name: Privilege }>()
  return results.map((row) => row.name)
}
