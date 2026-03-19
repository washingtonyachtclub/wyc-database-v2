export const EXPIRE_QTR_MODES = ['exactly', 'atLeast'] as const
export type ExpireQtrMode = (typeof EXPIRE_QTR_MODES)[number]

export type ExpireQtrFilter = { quarter: number; mode: ExpireQtrMode }

export function parseExpireQtrMode(value: string): ExpireQtrMode | undefined {
  return (EXPIRE_QTR_MODES as readonly string[]).includes(value)
    ? (value as ExpireQtrMode)
    : undefined
}

export type MemberFilters = {
  wycId?: string
  name?: string
  category?: number
  expireQtrFilter?: ExpireQtrFilter
}
