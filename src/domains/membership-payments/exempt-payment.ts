import { type AtomicWrite } from '@/db/atomic'
import db from '@/db'
import { membershipPayments } from '@/db/schema'

type MembershipPaymentTransaction = AtomicWrite

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
  const paymentId = await tx.nextId(membershipPayments)
  tx.add(
    db
      .insert(membershipPayments)
      .values({
        index: paymentId,
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
      }),
  )
  return paymentId
}
