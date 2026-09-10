import { compareFleetNames } from '@/domains/boat-types/order'

type RatingTypeChoice = {
  index: number
  text: string | null
  type: string
}

export function ratingTypeGroups(ratingTypes: RatingTypeChoice[]) {
  const groups = new Map<string, { label: string; options: { value: number; label: string }[] }>()

  for (const ratingType of [...ratingTypes].sort((left, right) =>
    compareFleetNames(left.type, right.type),
  )) {
    const fleet = ratingType.type || '<No Type>'
    const group = groups.get(fleet) ?? { label: fleet, options: [] }
    group.options.push({
      value: ratingType.index,
      label: ratingType.text || `Rating ${ratingType.index}`,
    })
    groups.set(fleet, group)
  }

  return [...groups.values()]
}
