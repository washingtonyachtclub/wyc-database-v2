import { inIdList } from '@/db/query-helpers'
import { atomicWrite } from '@/db/atomic'
import { and, eq } from 'drizzle-orm'
import db from '@/db/index'
import { boatTypes, checkouts, crew, guests, wycDatabase, wycRatings } from '@/db/schema'
import type { CheckoutEdit, CheckoutQualification, GuestInput } from './schema'
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
  return atomicWrite(async (tx) => {
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

    const existingMembers = await db
      .select({ wycNumber: wycDatabase.wycNumber })
      .from(wycDatabase)
      .where(inIdList(wycDatabase.wycNumber, [...memberIds]))
    if (existingMembers.length !== memberIds.size) {
      throw new CheckoutWriteError('One or more selected members no longer exist')
    }

    const [boat] = await db
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
      const [memberRating] = await db
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
    const [duplicate] = await db
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

    const checkoutId = await tx.nextId(checkouts)
    tx.add(
      db.insert(checkouts).values({
        index: checkoutId,
        wycNumber: input.skipperWycNumber,
        timeDeparture,
        crew: '[]',
        boat: String(input.boatId),
        destination: input.destination,
        expectedReturn: toDbDateTime(input.expectedReturn),
        timeReturn: input.timeReturn ? toDbDateTime(input.timeReturn) : null,
        relevantRating: input.qualification.supervised
          ? null
          : input.qualification.relevantRatingId,
        chiefId:
          input.qualification.supervised && input.qualification.supervisorWycNumber > 0
            ? input.qualification.supervisorWycNumber
            : null,
      }),
    )

    for (const crewId of input.crew) tx.add(db.insert(crew).values({ checkoutId, crewId }))
    for (const guest of input.guests) {
      tx.add(
        db.insert(guests).values({
          checkoutId,
          name: guest.name,
          status: guest.status,
          email: guest.email || null,
          phone: null,
        }),
      )
    }

    return checkoutId
  })
}

export async function updateOpenCheckout(
  index: number,
  skipperWycNumber: number,
  input: CheckoutEdit,
) {
  return atomicWrite(async (tx) => {
    const [checkout] = await db.select().from(checkouts).where(eq(checkouts.index, index)).limit(1)
    if (!checkout || checkout.wycNumber !== skipperWycNumber || checkout.timeReturn !== null) {
      return 'This checkout is no longer open for editing'
    }

    const enteredEstimate = toDbDateTime(input.expectedReturn)
    const expectedReturn =
      checkout.expectedReturn &&
      checkout.expectedReturn.slice(0, 16) === enteredEstimate.slice(0, 16)
        ? checkout.expectedReturn
        : enteredEstimate
    if (expectedReturn <= checkout.timeDeparture) return 'Estimated return must be after departure'
    if (input.crew.includes(skipperWycNumber)) return 'The skipper cannot also be a crew member'

    const existingCrew = await db
      .select({ id: crew.crewId })
      .from(crew)
      .where(eq(crew.checkoutId, index))
    const existingCrewIds = new Set(existingCrew.map(({ id }) => id))
    const selectedCrew = new Set(input.crew)
    const addedCrew = input.crew.filter((id) => !existingCrewIds.has(id))
    const removedCrew = existingCrew.filter(({ id }) => !selectedCrew.has(id)).map(({ id }) => id)
    if (addedCrew.length) {
      const members = await db
        .select({ id: wycDatabase.wycNumber })
        .from(wycDatabase)
        .where(inIdList(wycDatabase.wycNumber, addedCrew))
      if (members.length !== addedCrew.length) return 'One or more selected members no longer exist'
    }

    const existingGuests = await db.select().from(guests).where(eq(guests.checkoutId, index))
    const existingGuestIds = new Set(existingGuests.map((guest) => guest.index))
    const guestIds = input.guests.flatMap((guest) => (guest.id === undefined ? [] : [guest.id]))
    const selectedGuests = new Set(guestIds)
    if (
      selectedGuests.size !== guestIds.length ||
      guestIds.some((id) => !existingGuestIds.has(id))
    ) {
      return 'The guest list has changed. Reopen the checkout and try again.'
    }
    const removedGuests = existingGuests
      .filter((guest) => !selectedGuests.has(guest.index))
      .map((guest) => guest.index)

    tx.add(
      db
        .update(checkouts)
        .set({
          destination: input.destination === 'Other' ? input.otherDestination : input.destination,
          expectedReturn,
        })
        .where(eq(checkouts.index, index)),
    )

    if (removedCrew.length) {
      tx.add(
        db.delete(crew).where(and(eq(crew.checkoutId, index), inIdList(crew.crewId, removedCrew))),
      )
    }
    if (addedCrew.length) {
      for (const crewId of addedCrew) tx.add(db.insert(crew).values({ checkoutId: index, crewId }))
    }
    if (removedGuests.length) {
      tx.add(
        db
          .delete(guests)
          .where(and(eq(guests.checkoutId, index), inIdList(guests.index, removedGuests))),
      )
    }
    for (const guest of input.guests) {
      const values = { name: guest.name, status: guest.status, email: guest.email || null }
      if (guest.id === undefined) {
        tx.add(db.insert(guests).values({ checkoutId: index, ...values }))
      } else {
        tx.add(
          db
            .update(guests)
            .set(values)
            .where(and(eq(guests.checkoutId, index), eq(guests.index, guest.id))),
        )
      }
    }

    return null
  })
}
