import { z } from 'zod'
import { fullName, num, str } from '@/db/mapper-utils'
import type { CheckoutCardQueryRow, CheckoutQueryRow, CheckoutTableQueryRow } from './queries'

// --- Core types ---

export type Checkout = {
  index: number
  wycNumber: number
  skipperName: string
  isSkipper: boolean
  boatId: number
  boatName: string
  fleet: string
  destination: string
  departureDate: string
  departureTime: string
}

// --- Mappers ---

export function toCheckout(row: CheckoutQueryRow, profileWycNumber?: number): Checkout {
  const timeDeparture = str(row.timeDeparture)
  return {
    index: row.index,
    wycNumber: row.wycNumber,
    skipperName: fullName(row.skipperFirst, row.skipperLast),
    isSkipper: profileWycNumber === undefined || row.wycNumber === profileWycNumber,
    boatId: num(row.boatId),
    boatName: str(row.boatName),
    fleet: str(row.fleet),
    destination: str(row.destination),
    departureDate: timeDeparture.slice(0, 10),
    departureTime: timeDeparture.slice(11, 16),
  }
}

// --- Table page types ---

export type CheckoutTableRow = {
  index: number
  memberName: string
  wycNumber: number
  boatName: string
  fleet: string
  timeDeparture: string
  expectedReturn: string
  timeReturn: string
  ratingName: string
  isOut: boolean
}

export function toCheckoutTableRow(row: CheckoutTableQueryRow): CheckoutTableRow {
  return {
    index: row.index,
    memberName: fullName(row.skipperFirst, row.skipperLast),
    wycNumber: row.wycNumber,
    boatName: str(row.boatName),
    fleet: str(row.fleet),
    timeDeparture: str(row.timeDeparture),
    expectedReturn: str(row.expectedReturn),
    timeReturn: str(row.timeReturn),
    ratingName: str(row.ratingName),
    isOut: row.timeReturn === null,
  }
}

// --- Member-facing card types (active + recently returned lists) ---

export const GUEST_STATUSES = [
  { value: 1, label: 'Student' },
  { value: 2, label: 'Staff' },
  { value: 3, label: 'Neither' },
] as const

export function guestStatusLabel(status: number): string {
  return GUEST_STATUSES.find((s) => s.value === status)?.label ?? 'Unknown'
}

export type CheckoutCrewMember = {
  name: string
  status: string
  expiration: string
}

export type CheckoutGuest = {
  name: string
  status: string
}

export type CheckoutCard = {
  index: number
  wycNumber: number
  skipperName: string
  boatName: string
  fleet: string
  destination: string
  timeDeparture: string
  expectedReturn: string
  timeReturn: string
  ratingName: string
  supervisorName: string
  crew: CheckoutCrewMember[]
  guests: CheckoutGuest[]
  isOut: boolean
  canCheckIn: boolean
}

export function toCheckoutCard(
  row: CheckoutCardQueryRow,
  crew: CheckoutCrewMember[],
  guests: CheckoutGuest[],
  canManage: boolean,
): CheckoutCard {
  const isOut = row.timeReturn === null
  return {
    index: row.index,
    wycNumber: row.wycNumber,
    skipperName: fullName(row.skipperFirst, row.skipperLast),
    boatName: str(row.boatName),
    fleet: str(row.fleet),
    destination: str(row.destination),
    timeDeparture: str(row.timeDeparture),
    expectedReturn: str(row.expectedReturn),
    timeReturn: str(row.timeReturn),
    ratingName: str(row.ratingName),
    supervisorName: fullName(row.supervisorFirst, row.supervisorLast),
    crew,
    guests,
    isOut,
    canCheckIn: isOut && canManage,
  }
}

// --- Checkout creation ---

export const DESTINATIONS = [
  'Union Bay',
  'Sail Sand Point',
  'Lake Union',
  'Lake Washington - North of 520',
  'Lake Washington - South of 520',
  'Blake Island',
  'Other',
] as const

export const guestInputSchema = z.object({
  name: z.string().trim().min(1, 'Guest name is required').max(100, 'Guest name is too long'),
  status: z.number().int().min(1).max(3),
  email: z
    .string()
    .trim()
    .max(255, 'Guest email is too long')
    .refine((email) => email === '' || z.email().safeParse(email).success, 'Enter a valid email'),
})

export type GuestInput = z.infer<typeof guestInputSchema>

export const emptyGuestInput: GuestInput = { name: '', status: 1, email: '' }

export const checkoutQualificationSchema = z.discriminatedUnion('supervised', [
  z
    .object({
      supervised: z.literal(false),
      relevantRatingId: z.number().int(),
    })
    .refine((value) => value.relevantRatingId > 0, 'Relevant rating is required'),
  z.object({
    supervised: z.literal(true),
    supervisorWycNumber: z.number().int().min(0),
  }),
])

export type CheckoutQualification = z.infer<typeof checkoutQualificationSchema>

export const emptyCheckoutQualification: CheckoutQualification = {
  supervised: false,
  relevantRatingId: 0,
}

const datetimeLocalPattern = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/

function isValidLocalDateTime(value: string) {
  const match = datetimeLocalPattern.exec(value)
  if (!match) return true
  const [, yearText, monthText, dayText, hourText, minuteText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const hour = Number(hourText)
  const minute = Number(minuteText)
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  const daysInMonth = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return (
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= daysInMonth[month - 1] &&
    hour >= 0 &&
    hour <= 23 &&
    minute >= 0 &&
    minute <= 59
  )
}

const datetimeLocalSchema = (message: string) =>
  z
    .string()
    .regex(datetimeLocalPattern, message)
    .refine(isValidLocalDateTime, 'Enter a valid date and time')

const destinationSchema = z
  .union([z.enum(DESTINATIONS), z.literal('')])
  .refine((destination) => destination !== '', 'Destination is required')

const checkoutFields = {
  boatId: z.number({ error: 'Boat is required' }).int().min(1, 'Boat is required'),
  qualification: checkoutQualificationSchema,
  destination: destinationSchema,
  otherDestination: z.string().trim().max(100, 'Destination is too long'),
  crew: z.array(z.number().int().min(1)).refine((ids) => new Set(ids).size === ids.length, {
    message: 'Crew members must be unique',
  }),
  guests: z.array(guestInputSchema),
}

function validateDestination(
  value: { destination: (typeof DESTINATIONS)[number] | ''; otherDestination: string },
  ctx: z.RefinementCtx,
) {
  if (value.destination === 'Other' && value.otherDestination === '') {
    ctx.addIssue({ code: 'custom', path: ['otherDestination'], message: 'Enter a destination' })
  }
}

export const checkoutInsertSchema = z
  .object({
    ...checkoutFields,
    departure: datetimeLocalSchema('Departure time is required'),
    expectedReturn: datetimeLocalSchema('Estimated return time is required'),
  })
  .superRefine((value, ctx) => {
    validateDestination(value, ctx)
    if (value.expectedReturn <= value.departure) {
      ctx.addIssue({
        code: 'custom',
        path: ['expectedReturn'],
        message: 'Estimated return must be after departure',
      })
    }
  })

export type CheckoutInsert = z.input<typeof checkoutInsertSchema>

export const emptyCheckoutInsert: CheckoutInsert = {
  boatId: 0,
  qualification: emptyCheckoutQualification,
  destination: '',
  otherDestination: '',
  departure: '',
  expectedReturn: '',
  crew: [],
  guests: [],
}

export const manualCheckoutInsertSchema = z
  .object({
    ...checkoutFields,
    skipperWycNumber: z.number().int().min(1, 'Skipper is required'),
    departure: datetimeLocalSchema('Departure time is required'),
    timeReturn: datetimeLocalSchema('Actual return time is required'),
  })
  .superRefine((value, ctx) => {
    validateDestination(value, ctx)
    if (value.timeReturn <= value.departure) {
      ctx.addIssue({
        code: 'custom',
        path: ['timeReturn'],
        message: 'Actual return must be after departure',
      })
    }
  })

export type ManualCheckoutInsert = z.input<typeof manualCheckoutInsertSchema>

export const emptyManualCheckoutInsert: ManualCheckoutInsert = {
  boatId: 0,
  qualification: emptyCheckoutQualification,
  destination: '',
  otherDestination: '',
  skipperWycNumber: 0,
  departure: '',
  timeReturn: '',
  crew: [],
  guests: [],
}

export function toDbDateTime(local: string): string {
  const [date, time = '00:00'] = local.split('T')
  const [hh = '00', mm = '00', ss = '00'] = time.split(':')
  return `${date} ${hh}:${mm}:${ss}`
}
