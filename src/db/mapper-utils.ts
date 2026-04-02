export const num = (value: number | null | undefined): number => value ?? 0
export const str = (value: string | null | undefined): string => value ?? ''

export function fullName(first: string | null | undefined, last: string | null | undefined): string {
  return [first?.trim(), last?.trim()].filter(Boolean).join(' ')
}
