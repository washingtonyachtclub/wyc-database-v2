export type QuarterDates = {
  index: number
  school: string
  endDate: string
}

// Indices 1 and 2 are the legacy Unknown and Honorary placeholders.
export const FIRST_LESSON_QUARTER = 3

export function resolveLessonQuarter(day: string, quarters: QuarterDates[]) {
  const ordered = [...quarters].sort((a, b) => a.index - b.index)
  const current = ordered.find((q) => q.index >= FIRST_LESSON_QUARTER && q.endDate >= day)
  const previous = current && ordered.find((q) => q.index === current.index - 1)
  if (
    current &&
    day &&
    (current.endDate === day || (previous?.endDate && previous.endDate < day))
  ) {
    return { quarter: current, error: null }
  }

  if (current && previous && !previous.endDate) {
    return { quarter: null, error: `Add the end date for ${previous.school} in Quarters.` }
  }
  return { quarter: null, error: `Add quarter dates covering ${day} in Quarters.` }
}
