import { createServerFn } from '@tanstack/react-start'
import { baseCheckoutsQuery } from 'src/db/checkout-queries'
import { toCheckout } from 'src/db/mappers'
import { requireSelfOrPrivilege } from '../lib/auth-middleware'

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
