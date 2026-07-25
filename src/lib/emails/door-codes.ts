import type { DoorCodeSlug } from '@/domains/door-codes/rules'

const SAIL_LOCKER_DIRECTIONS =
  'This unlocks the sail locker next to the WAC, using the keypad on the wall to the right of the door.'

export function doorUnlockedSubject(): string {
  return `WYC - New Code Unlocked!`
}

export function doorUnlockedEmail({
  first,
  ratingName,
  doorName,
  slug,
}: {
  first: string
  ratingName: string
  doorName: string
  slug: DoorCodeSlug
}): string {
  const congrats = ratingName
    ? `Congratulations on your ${ratingName} rating!`
    : 'Congratulations on your new rating!'

  return [
    `Hello ${first},`,
    `${congrats} This rating gives you access to the ${doorName}.`,
    slug === 'sail-locker' ? SAIL_LOCKER_DIRECTIONS : '',
    'You can find the code at database.washingtonyachtclub.org/door-codes.',
  ]
    .filter(Boolean)
    .join('\n\n')
}
