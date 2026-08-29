import type { RenewalTier } from './compute-renewal'

export const UW_STATUSES = ['student', 'alumni', 'employee_retiree', 'public'] as const
export type UwStatus = (typeof UW_STATUSES)[number]

const CATEGORY_IDS = {
  student: 1,
  facultyStaff: 2,
  alumni: 3,
  public: 6,
} as const

/**
 * Plus One responses, split by direction: sponsor_* for UW members who can sponsor a Plus One
 * (student / employee-retiree), sponsee_* for non-UW members who need to be sponsored.
 * The *_yes codes are the ones an officer pairs up; the rest need no action.
 */
export const SPONSOR_RESPONSES = ['sponsor_already', 'sponsor_yes', 'sponsor_no'] as const
export const SPONSEE_RESPONSES = [
  'sponsee_already',
  'sponsee_no_facilities',
  'sponsee_yes',
] as const
export type PlusOneResponse =
  | (typeof SPONSOR_RESPONSES)[number]
  | (typeof SPONSEE_RESPONSES)[number]

export type QuestionnaireAnswers = {
  uwStatus: UwStatus
  plusOneResponse: PlusOneResponse
}

export function tierForUwStatus(uwStatus: UwStatus): RenewalTier {
  return uwStatus === 'student' ? 'student' : 'nonstudent'
}

export function plusOneResponsesFor(uwStatus: UwStatus): readonly PlusOneResponse[] {
  return uwStatus === 'student' || uwStatus === 'employee_retiree'
    ? SPONSOR_RESPONSES
    : SPONSEE_RESPONSES
}

export function categoryIdForUwStatus(uwStatus: UwStatus): number {
  switch (uwStatus) {
    case 'student':
      return CATEGORY_IDS.student
    case 'alumni':
      return CATEGORY_IDS.alumni
    case 'employee_retiree':
      return CATEGORY_IDS.facultyStaff
    case 'public':
      return CATEGORY_IDS.public
  }
}

export function isUwStatus(value: unknown): value is UwStatus {
  return UW_STATUSES.includes(value as UwStatus)
}

/**
 * Validate + normalize raw questionnaire input. Throws on anything missing or inconsistent so the
 * server functions can use it as the real gate (the form validates too, for UX).
 */
export function parseQuestionnaire(input: unknown): QuestionnaireAnswers {
  const obj = (input ?? {}) as Record<string, unknown>

  const uwStatus = obj.uwStatus
  if (!isUwStatus(uwStatus)) {
    throw new Error('Please select your UW status.')
  }

  const allowed = plusOneResponsesFor(uwStatus)
  if (!allowed.includes(obj.plusOneResponse as PlusOneResponse)) {
    throw new Error('Please answer the Plus One question.')
  }

  return {
    uwStatus,
    plusOneResponse: obj.plusOneResponse as PlusOneResponse,
  }
}
