export function getTodayPacificDateString(): string {
  const now = new Date()

  // Get date parts in America/Los_Angeles and convert to YYYY-MM-DD
  const pacificString = now.toLocaleDateString('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  // en-CA returns YYYY-MM-DD
  return pacificString
}

export function isLessonUpcoming(calendarDate: string): boolean {
  if (!calendarDate) return false
  const todayPacific = getTodayPacificDateString()
  return calendarDate >= todayPacific
}

