import { z } from 'zod'
import type { calendarboats, calendartable } from '@/db/schema'
import { fullName, num, str } from '@/db/mapper-utils'

export const monthSchema = z.string().regex(/^(20\d{2})-(0[1-9]|1[0-2])$/)
export const reservationIdSchema = z.object({ id: z.number().int().positive() })
const slotSchema = z.number().int().min(0).max(1)
const legacyText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .regex(
      /^[\u0000-\u00ff\u20ac\u2018-\u201f\u2013\u2014]*$/,
      'Please use plain text without emoji.',
    )

export const reservationSchema = z
  .object({
    kind: z.enum(['personal', 'admin']),
    title: legacyText(120),
    boatId: z.number().int().positive(),
    fromDate: z.iso.date(),
    fromSlot: slotSchema,
    throughDate: z.iso.date(),
    throughSlot: slotSchema,
    destination: legacyText(255),
    numberOfCrew: z.number().int().min(0).max(1000),
    phone: legacyText(45),
    comment: legacyText(16000),
  })
  .refine((value) => value.kind === 'admin' || value.phone.length > 0, {
    message: 'Enter a contact phone number.',
    path: ['phone'],
  })
export const commentSchema = reservationIdSchema.extend({ comment: legacyText(16000).min(1) })
export type ReservationInput = z.infer<typeof reservationSchema>
export type CalendarBoat = { id: number; name: string; active: boolean }
export type Availability = {
  id: number
  boatId: number
  from: string
  through: string
  kind: 'personal' | 'admin'
  title: string
}
export type Reservation = Availability & {
  boat: string
  memberId: number
  member: string
  creatorId: number
  creator: string
  destination: string
  numberOfCrew: number
  phone: string
  comment: string
}

export function toBoat(row: typeof calendarboats.$inferSelect): CalendarBoat {
  return { id: row.cBoatId, name: row.name, active: row.active !== 0 }
}

export function toReservation(row: {
  reservation: typeof calendartable.$inferSelect
  boat: string | null
  first: string | null
  last: string | null
  creatorFirst: string | null
  creatorLast: string | null
}): Reservation {
  const r = row.reservation
  return {
    id: r.id,
    boatId: r.cBoatId,
    from: r.reserveFrom,
    through: r.reserveTo,
    boat: row.boat ?? 'Unknown boat',
    kind: r.reservationType,
    title: str(r.title),
    memberId: num(r.memberWycNumber),
    creatorId: num(r.createdByWycNumber),
    creator: fullName(row.creatorFirst, row.creatorLast),
    member: fullName(row.first, row.last),
    destination: r.destination,
    numberOfCrew: r.numberOfCrew,
    phone: r.phone,
    comment: str(r.comments),
  }
}
