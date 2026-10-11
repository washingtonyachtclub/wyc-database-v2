import { fuzzyScore, normalizeSearchText } from '@/lib/fuzzy-search'
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
  const normalizedQuery = normalizeSearchText(query)
  if (!normalizedQuery) return []
  const queryTokens = normalizedQuery.split(' ')
  return members
    .flatMap((member) => {
      let score: number | null
      let matchQuality: number
      if (number !== null) {
        const candidate = String(member.wycNumber)
        score =
          Number(number) === member.wycNumber
            ? 2
            : !exactWycNumberSearch && candidate.startsWith(number)
              ? 1
              : null
        matchQuality = score ?? 0
      } else {
        const first = normalizeSearchText(member.first ?? '')
        const last = normalizeSearchText(member.last ?? '')
        const names = [(first + ' ' + last).trim(), (last + ' ' + first).trim()]
        const scores = names.map((name) => fuzzyScore(normalizedQuery, name))
        score = scores.every((value) => value === null)
          ? null
          : Math.max(...scores.map((value) => value ?? 0))
        matchQuality = names.includes(normalizedQuery)
          ? 4
          : [first, last, ...names[0].split(' ')].includes(normalizedQuery)
            ? 3
            : queryTokens.every((token) => names[0].includes(token))
              ? 2
              : 1
      }
      return score === null ? [] : [{ member, score, matchQuality }]
    })
    .sort(
      (a, b) =>
        b.matchQuality - a.matchQuality ||
        (b.member.expireQtrIndex ?? 0) - (a.member.expireQtrIndex ?? 0) ||
        b.score - a.score ||
        (a.member.first ?? '').localeCompare(b.member.first ?? '') ||
        (a.member.last ?? '').localeCompare(b.member.last ?? '') ||
        a.member.wycNumber - b.member.wycNumber,
    )
    .map(({ member }) => member)
}
