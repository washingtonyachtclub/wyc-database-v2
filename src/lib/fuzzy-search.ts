export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/[_#\-/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function fuzzyScore(queryValue: string, candidateValue: string): number | null {
  const query = normalizeSearchText(queryValue)
  const candidate = normalizeSearchText(candidateValue)
  if (!query) return 1
  if (!candidate) return null
  if (candidate === query) return 1

  const substringIndex = candidate.indexOf(query)
  if (substringIndex >= 0) {
    const boundaryBonus = substringIndex === 0 || candidate[substringIndex - 1] === ' ' ? 0.04 : 0
    return Math.min(0.99, 0.8 + boundaryBonus + 0.15 * (query.length / candidate.length))
  }

  const queryTokens = query.split(' ')
  const tokenPositions = queryTokens.map((token) => candidate.indexOf(token))
  if (queryTokens.length > 1 && tokenPositions.every((position) => position >= 0)) {
    const coverage =
      queryTokens.reduce((total, token) => total + token.length, 0) / candidate.length
    const ordered = tokenPositions.every(
      (position, index) => index === 0 || position >= tokenPositions[index - 1],
    )
    return Math.min(0.93, 0.69 + coverage * 0.18 + (ordered ? 0.05 : 0))
  }

  let queryIndex = 0
  let firstMatch = -1
  let lastMatch = -1
  let consecutive = 0
  let consecutiveBonus = 0
  let boundaryMatches = 0

  for (
    let candidateIndex = 0;
    candidateIndex < candidate.length && queryIndex < query.length;
    candidateIndex += 1
  ) {
    if (candidate[candidateIndex] !== query[queryIndex]) continue
    if (firstMatch < 0) firstMatch = candidateIndex
    consecutive = lastMatch === candidateIndex - 1 ? consecutive + 1 : 1
    consecutiveBonus += Math.max(0, consecutive - 1)
    if (candidateIndex === 0 || candidate[candidateIndex - 1] === ' ') boundaryMatches += 1
    lastMatch = candidateIndex
    queryIndex += 1
  }

  if (queryIndex !== query.length || firstMatch < 0) return null
  const span = lastMatch - firstMatch + 1
  const compactness = query.length / span
  const coverage = query.length / candidate.length
  const startBonus = 1 / (firstMatch + 1)
  return Math.min(
    0.84,
    0.28 +
      compactness * 0.28 +
      coverage * 0.12 +
      startBonus * 0.08 +
      (Math.min(consecutiveBonus, query.length) / query.length) * 0.05 +
      Math.min(boundaryMatches, 3) * 0.025,
  )
}
