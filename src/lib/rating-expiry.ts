import { RATING_EXPIRY_MONTHS } from '@/db/constants'
import type { MemberRating } from '@/db/member-schema'

export function getExpiryDate(ratingDate: string): string {
  const date = new Date(ratingDate + 'T00:00:00')
  date.setMonth(date.getMonth() + RATING_EXPIRY_MONTHS)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getExpiryInfo(rating: MemberRating): string | null {
  if (!rating.ratingExpires) return null
  if (!rating.date) return null

  const expiryDate = getExpiryDate(rating.date)
  const today = new Date().toISOString().slice(0, 10)

  if (expiryDate < today) {
    return `Expired on ${expiryDate}`
  }
  return `Expiring on ${expiryDate}`
}
