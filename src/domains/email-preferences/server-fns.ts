import db from '@/db/index'
import { memberEmailPreferences } from '@/db/schema'
import { requireAuth } from '@/lib/auth/auth-middleware'
import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

export const getEmailPreferences = createServerFn({ method: 'GET' }).handler(async () => {
  const wycNumber = await requireAuth()
  const [row] = await db
    .select({ sailingOpportunities: memberEmailPreferences.sailingOpportunities })
    .from(memberEmailPreferences)
    .where(eq(memberEmailPreferences.wycNumber, wycNumber))
    .limit(1)

  // Members who have never saved preferences are subscribed by default.
  return { sailingOpportunities: row ? row.sailingOpportunities !== 0 : true }
})

export const setEmailPreferences = createServerFn({ method: 'POST' })
  .inputValidator((input) => z.object({ sailingOpportunities: z.boolean() }).parse(input))
  .handler(async ({ data }) => {
    const wycNumber = await requireAuth()
    const values = {
      sailingOpportunities: data.sailingOpportunities ? 1 : 0,
      updatedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
    }
    await db
      .insert(memberEmailPreferences)
      .values({ wycNumber, ...values })
      .onDuplicateKeyUpdate({ set: values })

    return { sailingOpportunities: data.sailingOpportunities }
  })
