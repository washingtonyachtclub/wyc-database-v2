import { fuzzyScore } from '@/lib/fuzzy-search'
export const MIN_MEMBER_SEARCH_LENGTH = 2
export const MAX_MEMBER_SEARCH_RESULTS = 50
type SearchableMember = {
  wycNumber: number
  first: string | null
  last: string | null
  expireQtrIndex?: number | null
}
export function memberNumberQuery(query: string): string | null {
  return /^#?\d+$/.test(query.trim()) ? query.trim().replace(/^#/, '') : null
}
export function canSearchMembers(query: string): boolean {
  return query.trim().length >= MIN_MEMBER_SEARCH_LENGTH || memberNumberQuery(query) !== null
}
export function rankMembers<T extends SearchableMember>(
  members: readonly T[],
  query: string,
  exactWycNumberSearch = false,
): T[] {
  if (!canSearchMembers(query)) return []
  const number = memberNumberQuery(query)
  return members
    .flatMap((member) => {
      let score: number | null
      if (number !== null) {
        const candidate = String(member.wycNumber)
        score =
          Number(number) === member.wycNumber
            ? 2
            : !exactWycNumberSearch && candidate.startsWith(number)
              ? 1
              : null
      } else {
        const first = member.first ?? ''
        const last = member.last ?? ''
        const scores = [
          fuzzyScore(query, first + ' ' + last),
          fuzzyScore(query, last + ' ' + first),
        ]
        score = scores.every((value) => value === null)
          ? null
          : Math.max(...scores.map((value) => value ?? 0))
      }
      return score === null ? [] : [{ member, score }]
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        (b.member.expireQtrIndex ?? 0) - (a.member.expireQtrIndex ?? 0) ||
        (a.member.first ?? '').localeCompare(b.member.first ?? '') ||
        (a.member.last ?? '').localeCompare(b.member.last ?? '') ||
        a.member.wycNumber - b.member.wycNumber,
    )
    .map(({ member }) => member)
}
