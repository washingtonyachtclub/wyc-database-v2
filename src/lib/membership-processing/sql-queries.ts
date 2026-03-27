import type { Member } from '@/db/types'

// Escape single quotes for SQL string literals
const esc = (s: string) => s.replace(/'/g, "''")

export function newMemberSQLQuery(member: Omit<Member, 'joinDate'>, password: string, argon2Hash: string): string {
  return `INSERT INTO WYCDatabase
  (WYCNumber, Last, First, StreetAddress, City, State, ZipCode, Phone1, Phone2, Email, Category, ExpireQtr, out_to_sea, password, password_argon2)
VALUES
  (${member.wycNumber},
  '${esc(member.last)}',
  '${esc(member.first)}',
  '${esc(member.streetAddress)}',
  '${esc(member.city)}',
  '${esc(member.state)}',
  '${esc(member.zipCode)}',
  '${esc(member.phone1)}',
  '${esc(member.phone2)}',
  '${esc(member.email)}',
  ${member.categoryId},
  ${member.expireQtrIndex},
  ${member.outToSea ? 1 : 0},
  CONCAT('*', UPPER(SHA1(UNHEX(SHA1('${esc(password)}'))))),
  '${esc(argon2Hash)}');`
}

export function returningMemberSQLQuery(wycNumber: number, newExpireQtr: number): string {
  return `UPDATE WYCDatabase SET ExpireQtr = ${newExpireQtr} WHERE WYCNumber = ${wycNumber};`
}
