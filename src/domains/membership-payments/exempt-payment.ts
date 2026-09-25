import db from '@/db'
import { membershipPayments } from '@/db/schema'

type MembershipPaymentTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

type ExemptPaymentLink =
  | { applicationId: string; renewalId?: never }
  | { applicationId?: never; renewalId: string }

export async function insertExemptMembershipPayment(
  tx: MembershipPaymentTransaction,
  input: ExemptPaymentLink & {
    newExpireQtr: number
    prevExpireQtr: number
    wycNumber: number | null
  },
) {
  const result = await tx.insert(membershipPayments).values({
    applicationId: input.applicationId ?? null,
    renewalId: input.renewalId ?? null,
    wycNumber: input.wycNumber,
    squarePaymentId: null,
    squareOrderId: null,
    amountCents: 0,
    currency: 'USD',
    tier: 'exempt',
    duration: 'quarterly',
    prevExpireQtr: input.prevExpireQtr,
    newExpireQtr: input.newExpireQtr,
    status: 'EXEMPT',
  })
  return result[0].insertId
}
