import type { RenewalTier } from './compute-renewal'

export const UW_STATUSES = ['student', 'employee_retiree', 'neither'] as const
export type UwStatus = (typeof UW_STATUSES)[number]

/**
 * Plus One responses, split by direction: sponsor_* for UW members who can sponsor a Plus One
 * (student / employee-retiree), sponsee_* for non-UW members who need to be sponsored (neither).
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
  return uwStatus === 'neither' ? SPONSEE_RESPONSES : SPONSOR_RESPONSES
}

/**
 * Validate + normalize raw questionnaire input. Throws on anything missing or inconsistent so the
 * server functions can use it as the real gate (the form validates too, for UX).
 */
export function parseQuestionnaire(input: unknown): QuestionnaireAnswers {
  const obj = (input ?? {}) as Record<string, unknown>

  const uwStatus = obj.uwStatus
  if (!UW_STATUSES.includes(uwStatus as UwStatus)) {
    throw new Error('Please select your UW status.')
  }
  const status = uwStatus as UwStatus

  const allowed = plusOneResponsesFor(status)
  if (!allowed.includes(obj.plusOneResponse as PlusOneResponse)) {
    throw new Error('Please answer the Plus One question.')
  }

  return {
    uwStatus: status,
    plusOneResponse: obj.plusOneResponse as PlusOneResponse,
  }
}
