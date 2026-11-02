import type { Position } from '@/domains/positions/schema'

const ROLE_IDS = {
  commodore: 1000,
  viceCommodore: 1010,
  rearCommodore: 1020,
  secretary: 2161,
  treasurer: 2220,
  fundraising: 2180,
  headFleetCaptain: 2000,
  quartermaster: 2210,
  systemAdministrator: 2250,
  webmaster: 2260,
} as const

const REAR_COMMODORE_ROLE_IDS = [2181, 2170, 2141, 2190]
const VICE_COMMODORE_ROLE_IDS = [4033]

const DISPLAY_LABELS: Readonly<Record<number, string>> = {
  [ROLE_IDS.commodore]: 'Commodore',
  [ROLE_IDS.headFleetCaptain]: 'Head Fleet Captain',
  [ROLE_IDS.systemAdministrator]: 'System Admin',
  2190: 'SnC Chair',
  4033: 'Keelboat Instruction',
}

export function getOfficerPositionLabel(position: Position): string {
  return (
    DISPLAY_LABELS[position.index] ??
    (position.typeId === 5 ? position.name.replace(/\bFleet Captain\b/gi, 'FC') : position.name)
  )
}

export function getOfficerPositionCategory(position: Position) {
  if (position.typeId === 1) return 'officer'
  if (position.typeId === 5) return 'fleet'
  return 'position'
}

export function buildOfficerChart(positions: Position[]) {
  const byId = new Map(positions.map((position) => [position.index, position]))
  const assigned = new Set<number>()

  function take(id: number) {
    const position = byId.get(id)
    if (position) assigned.add(id)
    return position
  }

  const roles = Object.fromEntries(
    Object.entries(ROLE_IDS).map(([key, id]) => [key, take(id)]),
  ) as Record<keyof typeof ROLE_IDS, Position | undefined>

  const viceReports = VICE_COMMODORE_ROLE_IDS.flatMap((id) => {
    const position = take(id)
    return position ? [position] : []
  })
  const rearReports = REAR_COMMODORE_ROLE_IDS.flatMap((id) => {
    const position = take(id)
    return position ? [position] : []
  })
  const fleetCaptains = positions.filter((position) => position.typeId === 5)
  for (const position of [...viceReports, ...fleetCaptains]) assigned.add(position.index)

  return {
    ...roles,
    viceReports,
    rearReports,
    fleetCaptains,
    otherPositions: positions.filter((position) => !assigned.has(position.index)),
  }
}
