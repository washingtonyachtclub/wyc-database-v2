import { eq } from 'drizzle-orm'
import { createServerFn } from '@tanstack/react-start'
import db from '@/db'
import {
  baseExaminerQuery,
  type ExaminerFilters,
  getSkipperRatingsForMembers,
  withExaminerFilters,
} from '@/domains/examiners/queries'
import { toExaminerRow } from '@/domains/examiners/schema'
import { officers } from '@/db/schema'
import { requirePrivilege } from '@/lib/auth/auth-middleware'
import { str } from '@/db/mapper-utils'

export const getExaminerTable = createServerFn({ method: 'GET' })
  .inputValidator((input: { filters?: ExaminerFilters }) => ({
    filters: input.filters,
  }))
  .handler(async ({ data }) => {
    await requirePrivilege('db')
    try {
      const { filters } = data
      const query = baseExaminerQuery().$dynamic()
      withExaminerFilters(query, filters)
      const rawRows = await query
      const rows = rawRows.map(toExaminerRow)

      const wycNumbers = rows.map((r) => r.wycNumber)
      const skipperRatings = await getSkipperRatingsForMembers(wycNumbers)

      const ratingsMap = new Map<number, string[]>()
      for (const sr of skipperRatings) {
        const member = sr.member ?? 0
        const text = str(sr.ratingText)
        if (!text) continue
        const list = ratingsMap.get(member) ?? []
        list.push(text)
        ratingsMap.set(member, list)
      }

      return rows.map((row) => ({
        ...row,
        skipperRatings: ratingsMap.get(row.wycNumber)?.join(', ') ?? '',
      }))
    } catch (error) {
      console.error('Failed to fetch ratings examiners:', error)
      throw new Error('Failed to fetch ratings examiners')
    }
  })

export const deactivateExaminer = createServerFn({ method: 'POST' })
  .inputValidator((input: { officerIndex: number }) => input)
  .handler(async ({ data: { officerIndex } }) => {
    await requirePrivilege('db')
    try {
      await db.update(officers).set({ active: 0 }).where(eq(officers.index, officerIndex))
      return { success: true }
    } catch (error) {
      console.error('Failed to deactivate ratings examiner:', error)
      throw new Error('Failed to deactivate ratings examiner')
    }
  })
