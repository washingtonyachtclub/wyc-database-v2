export const FLEET_ORDER = [
  'SH',
  'DH',
  'Cat',
  'SB',
  'Daysailer',
  'KB',
  'Performance',
  'Whaler',
] as const

const fleetRanks = new Map<string, number>(FLEET_ORDER.map((fleet, index) => [fleet, index]))

type BoatTypeChoice = {
  index: number
  type: string | null
  fleet: string
  active?: boolean | number
}

export function compareFleetNames(left: string, right: string) {
  const leftRank = fleetRanks.get(left)
  const rightRank = fleetRanks.get(right)

  if (leftRank !== undefined && rightRank !== undefined) return leftRank - rightRank
  if (leftRank !== undefined) return -1
  if (rightRank !== undefined) return 1
  return left.localeCompare(right)
}

export function compareBoatTypes(
  left: { fleet: string; type: string | null },
  right: { fleet: string; type: string | null },
) {
  return (
    compareFleetNames(left.fleet, right.fleet) || (left.type ?? '').localeCompare(right.type ?? '')
  )
}

export function boatTypeGroups(boatTypes: BoatTypeChoice[], markInactive = false) {
  const groups = new Map<string, { label: string; options: { value: number; label: string }[] }>()

  for (const boatType of [...boatTypes].sort(compareBoatTypes)) {
    const fleet = boatType.fleet || 'Other'
    const group = groups.get(fleet) ?? { label: fleet, options: [] }
    const inactive = boatType.active === false || boatType.active === 0
    group.options.push({
      value: boatType.index,
      label: `${boatType.type || `Boat ${boatType.index}`}${markInactive && inactive ? ' (inactive)' : ''}`,
    })
    groups.set(fleet, group)
  }

  return [...groups.values()]
}

export function fleetOptions(boatTypes: Pick<BoatTypeChoice, 'fleet'>[]) {
  return [...new Set(boatTypes.map((boatType) => boatType.fleet).filter(Boolean))]
    .sort(compareFleetNames)
    .map((fleet) => ({ value: fleet, label: fleet }))
}
