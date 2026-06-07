// `school` is the displayed academic name (e.g. "Spring 2026"); `text` is its start
// month (e.g. "Jun 2026"). The year rolls over when wrapping from Fall back to Winter.

const SEASON_ORDER = ['Winter', 'Spring', 'Summer', 'Fall'] as const
type Season = (typeof SEASON_ORDER)[number]

const SEASON_MONTH: Record<Season, string> = {
  Winter: 'March',
  Spring: 'Jun',
  Summer: 'Sept',
  Fall: 'Dec',
}

export function nextQuarterFields(prevSchool: string): { text: string; school: string } | null {
  const match = prevSchool.trim().match(/^(Winter|Spring|Summer|Fall)\s+(\d{4})$/)
  if (!match) return null

  const season = match[1] as Season
  const year = Number(match[2])
  const nextSeason = SEASON_ORDER[(SEASON_ORDER.indexOf(season) + 1) % SEASON_ORDER.length]
  const nextYear = nextSeason === 'Winter' ? year + 1 : year

  return {
    school: `${nextSeason} ${nextYear}`,
    text: `${SEASON_MONTH[nextSeason]} ${nextYear}`,
  }
}
