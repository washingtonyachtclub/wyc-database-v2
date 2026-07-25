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
    label: 'DH Intermediate or above / KB Novice or above',
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

/** Expired ratings must already be filtered out — use `getActiveMemberRatings`. */
export type ActiveRating = { type: string; degree: number }

export function satisfiesRule(rule: DoorCodeRule, ratings: ActiveRating[]): boolean {
  return ratings.some((r) =>
    rule.requires.some((req) => r.type === req.type && r.degree >= req.minDegree),
  )
}

const ALL_SLUGS = Object.keys(DOOR_CODE_RULES) as DoorCodeSlug[]

/** Every door the ratings satisfy. Diffing this across a rating change yields what just unlocked. */
export function unlockedSlugs(ratings: ActiveRating[]): DoorCodeSlug[] {
  return ALL_SLUGS.filter((slug) => satisfiesRule(DOOR_CODE_RULES[slug], ratings))
}
