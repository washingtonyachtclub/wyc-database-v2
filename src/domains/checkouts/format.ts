const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function formatCheckoutDateTime(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(value)
  if (!match) return value

  const month = Number(match[2])
  const hour = Number(match[4])
  if (month < 1 || month > 12 || hour < 0 || hour > 23) return value

  const period = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${match[5]} ${period} (${Number(match[3])} ${MONTHS[month - 1]})`
}
