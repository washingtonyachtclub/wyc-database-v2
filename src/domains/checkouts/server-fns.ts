import { createServerFn } from '@tanstack/react-start'
import { baseCheckoutsQuery } from '@/domains/checkouts/queries'
import { toCheckout } from '@/domains/checkouts/schema'
import { requireSelfOrPrivilege } from '@/lib/auth/auth-middleware'

export const getCheckouts = createServerFn({ method: 'GET' })
  .inputValidator((input: { wycNumber?: number; since?: string }) => ({
    wycNumber: input.wycNumber ? Number(input.wycNumber) : undefined,
    since: input.since,
  }))
  .handler(async ({ data }) => {
    // wycNumber is optional in the query, but on the profile page it's always provided
    await requireSelfOrPrivilege(data.wycNumber ?? 0, 'db')
    const raw = await baseCheckoutsQuery(data)
    return raw.map(toCheckout)
  })
