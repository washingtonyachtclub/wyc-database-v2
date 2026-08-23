import { and, eq, inArray } from 'drizzle-orm'
import db from '@/db/index'
import { boatTypes, checkouts, crew, guests, wycDatabase, wycRatings } from '@/db/schema'
import type { CheckoutQualification, GuestInput } from './schema'
import { toDbDateTime } from './schema'

export class CheckoutWriteError extends Error {}

type CheckoutWriteInput = {
  skipperWycNumber: number
  boatId: number
  qualification: CheckoutQualification
  destination: string
  departure: string
  expectedReturn: string
  timeReturn: string | null
  crew: number[]
  guests: GuestInput[]
  allowInactiveBoat: boolean
}

export async function writeCheckout(input: CheckoutWriteInput) {
  return db.transaction(async (tx) => {
    const memberIds = new Set([input.skipperWycNumber, ...input.crew])
    if (input.qualification.supervised && input.qualification.supervisorWycNumber > 0) {
      memberIds.add(input.qualification.supervisorWycNumber)
    }

    if (input.crew.includes(input.skipperWycNumber)) {
      throw new CheckoutWriteError('The skipper cannot also be a crew member')
    }
    if (
      input.qualification.supervised &&
      input.qualification.supervisorWycNumber > 0 &&
      input.qualification.supervisorWycNumber === input.skipperWycNumber
    ) {
      throw new CheckoutWriteError('The skipper cannot supervise their own checkout')
    }

    const existingMembers = await tx
      .select({ wycNumber: wycDatabase.wycNumber })
      .from(wycDatabase)
      .where(inArray(wycDatabase.wycNumber, [...memberIds]))
    if (existingMembers.length !== memberIds.size) {
      throw new CheckoutWriteError('One or more selected members no longer exist')
    }

    const [boat] = await tx
      .select({ index: boatTypes.index, active: boatTypes.active })
      .from(boatTypes)
      .where(eq(boatTypes.index, input.boatId))
      .limit(1)
    if (!boat) {
      throw new CheckoutWriteError('The selected boat no longer exists')
    }
    if (!input.allowInactiveBoat && boat.active === 0) {
      throw new CheckoutWriteError('The selected boat is no longer available for checkout')
    }

    if (!input.qualification.supervised) {
      const [memberRating] = await tx
        .select({ index: wycRatings.index })
        .from(wycRatings)
        .where(
          and(
            eq(wycRatings.member, input.skipperWycNumber),
            eq(wycRatings.rating, input.qualification.relevantRatingId),
          ),
        )
        .limit(1)
      if (!memberRating) {
        throw new CheckoutWriteError('The selected rating is not recorded for the skipper')
      }
    }

    const timeDeparture = toDbDateTime(input.departure)
    const [duplicate] = await tx
      .select({ index: checkouts.index })
      .from(checkouts)
      .where(
        and(
          eq(checkouts.wycNumber, input.skipperWycNumber),
          eq(checkouts.boat, String(input.boatId)),
          eq(checkouts.timeDeparture, timeDeparture),
        ),
      )
      .limit(1)
    if (duplicate) {
      throw new CheckoutWriteError('This checkout has already been entered')
    }

    const [result] = await tx.insert(checkouts).values({
      wycNumber: input.skipperWycNumber,
      timeDeparture,
      crew: '[]',
      boat: String(input.boatId),
      destination: input.destination,
      expectedReturn: toDbDateTime(input.expectedReturn),
      timeReturn: input.timeReturn ? toDbDateTime(input.timeReturn) : null,
      relevantRating: input.qualification.supervised ? null : input.qualification.relevantRatingId,
      chiefId:
        input.qualification.supervised && input.qualification.supervisorWycNumber > 0
          ? input.qualification.supervisorWycNumber
          : null,
    })
    const checkoutId = result.insertId

    if (input.crew.length > 0) {
      await tx.insert(crew).values(input.crew.map((crewId) => ({ checkoutId, crewId })))
    }
    if (input.guests.length > 0) {
      await tx.insert(guests).values(
        input.guests.map((guest) => ({
          checkoutId,
          name: guest.name,
          status: guest.status,
          email: guest.email || null,
          phone: null,
        })),
      )
    }

    return checkoutId
  })
}
