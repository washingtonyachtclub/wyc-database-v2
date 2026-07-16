import { getExpiryDate } from '@/lib/rating-expiry'

/** `ratings.type` values. */
export type RatingType = 'Cat' | 'DH' | 'KB' | 'SB' | 'SH' | 'lake' | 'rig' | 'whaler' | 'written'

/** `minDegree` reads against `ratings.degree`: 0 crew, 1 novice, 2 intermediate, 3 skipper, 4 captain. */
export type RatingRequirement = { type: RatingType; minDegree: number }

export type DoorCodeRule = {
  /** OR'd together — any one satisfies the door. */
  requires: RatingRequirement[]
  /** Shown in place of the code when locked. */
  label: string
}

export const DOOR_CODE_RULES = {
  'sail-locker': {
    requires: [
      { type: 'Cat', minDegree: 1 },
      { type: 'DH', minDegree: 1 },
      { type: 'SH', minDegree: 1 },
      { type: 'KB', minDegree: 1 },
      // The whaler rating only exists at degree 0, so this means "has a whaler rating".
      { type: 'whaler', minDegree: 0 },
    ],
    label: 'Dinghy Novice or above',
  },
  'ssp-gate': {
    requires: [{ type: 'SB', minDegree: 1 }],
    label: 'Sailboard Novice or above',
  },
  daysailer: {
    requires: [
      { type: 'DH', minDegree: 2 },
      { type: 'KB', minDegree: 1 },
    ],
    label: 'Dinghy Intermediate or above / KB Novice or above',
  },
  keelboat: {
    requires: [{ type: 'KB', minDegree: 1 }],
    label: 'KB Novice or above',
  },
} satisfies Record<string, DoorCodeRule>

export type DoorCodeSlug = keyof typeof DOOR_CODE_RULES

export function ruleForSlug(slug: string): DoorCodeRule | null {
  return DOOR_CODE_RULES[slug as DoorCodeSlug] ?? null
}

export type HeldRating = {
  type: string
  degree: number
  expires: boolean
  date: string
}

function isUnexpired(rating: HeldRating, today: string): boolean {
  if (!rating.expires) return true
  if (!rating.date) return false
  return getExpiryDate(rating.date) >= today
}

/** Whether any unexpired held rating satisfies the rule. */
export function satisfiesRule(
  rule: DoorCodeRule,
  ratings: HeldRating[],
  today = new Date().toISOString().slice(0, 10),
): boolean {
  return ratings.some(
    (r) =>
      isUnexpired(r, today) &&
      rule.requires.some((req) => r.type === req.type && r.degree >= req.minDegree),
  )
}
